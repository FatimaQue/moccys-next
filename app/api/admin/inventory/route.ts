import { NextResponse } from "next/server";
import { ADDONS } from "@/data/addons";
import { categories } from "@/data/menu";
import { getAdmin } from "@/lib/adminAuth";
import { customToMenuItem, mergeAddons, mergeMenu, type CustomRow, type OverrideRow } from "@/lib/menuShared";
import { OVERRIDE_COLS, refreshMenu } from "@/lib/menuStore";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Menu photos are shown with next/image, which only loads from this site or our Supabase storage (see next.config.ts);
// any other address would crash the menu page for every visitor.
const STORAGE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
function okImage(src: string) {
  if (src.startsWith("/") && !src.startsWith("//") && !src.includes("\\")) return true; // a photo that ships with the site
  try {
    const u = new URL(src);
    return u.protocol === "https:" && !!STORAGE_HOST && u.hostname === STORAGE_HOST;
  } catch {
    return false;
  }
}

const NO_TABLES = "The inventory tables don't exist yet. Run the inventory SQL in the Supabase SQL editor first.";
const deny = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const fail = (error: { code?: string; message?: string }) =>
  NextResponse.json({ error: error.code === "42P01" || error.code === "PGRST205" ? NO_TABLES : "Something went wrong. Please try again." }, { status: 500 });

const builtInItems = () => categories.flatMap((c) => c.items);
const builtInAddons = () => ADDONS.flatMap((g) => g.items);

// the whole inventory: every built-in and custom menu item, plus add-ons, each with its availability
export async function GET() {
  if (!(await getAdmin())) return deny();
  const db = supabaseAdmin();
  const [custom, off, over] = await Promise.all([
    db.from("menu_custom_items").select("id, category_id, name, price, description, img, options").order("id").returns<CustomRow[]>(),
    db.from("menu_unavailable").select("name"),
    db.from("menu_overrides").select(OVERRIDE_COLS).returns<OverrideRow[]>(),
  ]);
  if (custom.error || off.error) { console.error("inventory load failed", custom.error ?? off.error); return fail((custom.error ?? off.error)!); }
  // without the overrides table the list still works, it just can't edit built-in items yet
  const overrides = over.error ? [] : over.data;
  const canEditBuiltIn = !over.error;

  const out = new Set(off.data.map((r) => r.name));
  const edits = new Map(overrides.map((o) => [o.name, o]));
  const money = (n: number) => "Rs. " + n.toLocaleString("en-US");
  const row = (name: string, priceLabel: string, img: string, extra: object) =>
    ({ name, priceLabel, img, available: !out.has(name), hidden: false, edited: false, canEdit: true, ...extra });
  const builtIn = (name: string) => {
    const o = edits.get(name);
    return { hidden: !!o?.hidden, edited: !!o && !!(o.price || o.option_prices || o.img || o.description), canEdit: canEditBuiltIn };
  };

  const mergedMenu = mergeMenu([], overrides, true);
  const mergedAddons = mergeAddons(overrides, true);

  return NextResponse.json({
    needsSetup: !canEditBuiltIn,
    categories: mergedMenu.map((c) => ({
      id: c.id, label: c.label,
      items: [
        ...c.items.map((i) => row(i.name, i.priceLabel, i.img, {
          kind: "builtin", price: i.price, description: i.desc,
          options: i.options?.map((o) => ({ label: o.label, price: o.price })), ...builtIn(i.name),
        })),
        ...custom.data.filter((r) => r.category_id === c.id).map((r) => {
          const m = customToMenuItem(r);
          return row(m.name, m.priceLabel, m.img, { kind: "custom", customId: r.id, price: r.price, description: r.description ?? "", options: r.options ?? undefined });
        }),
      ],
    })),
    addons: mergedAddons.map((g) => ({
      id: "addons-" + g.group, label: "Add-ons · " + g.group,
      items: g.items.map((a) => row(a.name, money(a.price), a.img, { kind: "addon", price: a.price, description: "", ...builtIn(a.name) })),
    })),
  });
}

// switch one or many items on or off: { names: string[], available: boolean }
export async function PATCH(req: Request) {
  if (!(await getAdmin())) return deny();
  const { names, available } = (await req.json().catch(() => ({}))) as { names?: unknown; available?: unknown };
  if (!Array.isArray(names) || !names.length || names.length > 500 || names.some((n) => typeof n !== "string") || typeof available !== "boolean") {
    return bad("Invalid request");
  }
  const db = supabaseAdmin();
  const { error } = available
    ? await db.from("menu_unavailable").delete().in("name", names)
    : await db.from("menu_unavailable").upsert((names as string[]).map((name) => ({ name })));
  if (error) { console.error("availability update failed", error); return fail(error); }
  refreshMenu();
  return NextResponse.json({ ok: true });
}

type ItemBody = {
  category?: string; name?: string; price?: number; description?: string; img?: string; options?: { label?: string; price?: number }[];
};

// price / sizes from the form: a list of sizes (the first one is the base price) or a single price
function readPrices(b: ItemBody): { price: number; options: { label: string; price: number }[] } | string {
  const options = (Array.isArray(b.options) ? b.options : [])
    .map((o) => ({ label: String(o.label ?? "").trim().slice(0, 30), price: Number(o.price) }))
    .filter((o) => o.label || o.price);
  const price = options.length ? options[0].price : Number(b.price);
  if (options.some((o) => !o.label || !Number.isInteger(o.price) || o.price < 1) || !Number.isInteger(price) || price < 1) {
    return "Prices must be whole numbers above 0, and every size needs a name.";
  }
  return { price, options };
}

// names identify items everywhere (cart, orders, availability), so they must be unique across the whole menu
const takenNames = () => new Set([...builtInItems().flatMap((i) => [i.name, ...(i.options ?? []).map((o) => o.name)]), ...builtInAddons().map((a) => a.name)]);

// add a new menu item: { category, name, price, description, img, options?: {label, price}[] }
export async function POST(req: Request) {
  if (!(await getAdmin())) return deny();
  const b = (await req.json().catch(() => ({}))) as ItemBody;
  const name = String(b.name ?? "").trim().slice(0, 80);
  const category = categories.find((c) => c.id === b.category);
  if (!name || !category) return bad("Please enter a name and choose a category.");
  const prices = readPrices(b);
  if (typeof prices === "string") return bad(prices);
  const img = String(b.img ?? "").trim();
  if (!img) return bad("Please add a photo.");
  if (!okImage(img)) return bad("That photo address isn't allowed. Please upload the photo instead.");
  if (takenNames().has(name)) return bad("An item with that name already exists.", 409);

  const { error } = await supabaseAdmin().from("menu_custom_items").insert({
    category_id: category.id, name, price: prices.price, description: String(b.description ?? "").trim().slice(0, 500) || null,
    img, options: prices.options.length ? prices.options : null,
  });
  if (error) {
    if (error.code === "23505") return bad("An item with that name already exists.", 409);
    console.error("menu item insert failed", error);
    return fail(error);
  }
  refreshMenu();
  return NextResponse.json({ ok: true });
}

// change an item.
//   an item added here:      { id, category, name, price, description, img, options? }
//   a built-in item/add-on:  { builtIn: name, price | options, description, img }  (name and category stay as they are)
//   undo changes to one:     { builtIn: name, reset: true }
//   bring a removed one back: { builtIn: name, restore: true }
export async function PUT(req: Request) {
  if (!(await getAdmin())) return deny();
  const b = (await req.json().catch(() => ({}))) as ItemBody & { id?: number; builtIn?: string; reset?: boolean; restore?: boolean };
  const db = supabaseAdmin();

  if (typeof b.builtIn === "string") {
    const item = builtInItems().find((i) => i.name === b.builtIn);
    const addon = builtInAddons().find((a) => a.name === b.builtIn);
    if (!item && !addon) return bad("Item not found.", 404);
    const name = b.builtIn;

    if (b.restore || b.reset) {
      const { error } = b.restore
        ? await db.from("menu_overrides").update({ hidden: false }).eq("name", name)
        : await db.from("menu_overrides").upsert({ name, price: null, option_prices: null, img: null, description: null }, { ignoreDuplicates: false });
      if (error) { console.error("menu override update failed", error); return fail(error); }
      refreshMenu();
      return NextResponse.json({ ok: true });
    }

    const prices = readPrices(b);
    if (typeof prices === "string") return bad(prices);
    const img = String(b.img ?? "").trim();
    if (img && !okImage(img)) return bad("That photo address isn't allowed. Please upload the photo instead.");

    // only what differs from the built-in data is stored, so "reset" and "edited" mean what they say
    const baseImg = (item ?? addon)!.img;
    const baseDesc = item?.desc ?? "";
    const desc = String(b.description ?? "").trim().slice(0, 500);
    const row: Partial<OverrideRow> & { name: string } = { name, img: img && img !== baseImg ? img : null, description: item && desc && desc !== baseDesc ? desc : null, price: null, option_prices: null };
    if (item?.options?.length) {
      const changed: Record<string, number> = {};
      for (const o of item.options) {
        const sent = prices.options.find((x) => x.label === o.label);
        if (sent && sent.price !== o.price) changed[o.label] = sent.price;
      }
      row.option_prices = Object.keys(changed).length ? changed : null;
    } else {
      const base = (item ?? addon)!.price;
      row.price = prices.price !== base ? prices.price : null;
    }
    // keep a removed item removed: this only changes its details
    const { data: existing } = await db.from("menu_overrides").select("hidden").eq("name", name).maybeSingle();
    const { error } = await db.from("menu_overrides").upsert({ ...row, hidden: existing?.hidden ?? false });
    if (error) { console.error("menu override save failed", error); return fail(error); }
    refreshMenu();
    return NextResponse.json({ ok: true });
  }

  if (!Number.isInteger(b.id)) return bad("Invalid request");
  const { data: current, error: findErr } = await db.from("menu_custom_items").select("name").eq("id", b.id).maybeSingle();
  if (findErr) { console.error("menu item lookup failed", findErr); return fail(findErr); }
  if (!current) return bad("That item no longer exists.", 404);

  const name = String(b.name ?? "").trim().slice(0, 80);
  const category = categories.find((c) => c.id === b.category);
  if (!name || !category) return bad("Please enter a name and choose a category.");
  const prices = readPrices(b);
  if (typeof prices === "string") return bad(prices);
  const img = String(b.img ?? "").trim();
  if (!img) return bad("Please add a photo.");
  if (!okImage(img)) return bad("That photo address isn't allowed. Please upload the photo instead.");
  if (name !== current.name && takenNames().has(name)) return bad("An item with that name already exists.", 409);

  const { error } = await db.from("menu_custom_items").update({
    category_id: category.id, name, price: prices.price, description: String(b.description ?? "").trim().slice(0, 500) || null,
    img, options: prices.options.length ? prices.options : null,
  }).eq("id", b.id);
  if (error) {
    if (error.code === "23505") return bad("An item with that name already exists.", 409);
    console.error("menu item update failed", error);
    return fail(error);
  }
  // a renamed item keeps its on/off switch
  if (name !== current.name) {
    const { data: wasOff } = await db.from("menu_unavailable").select("name").eq("name", current.name).maybeSingle();
    if (wasOff) {
      await db.from("menu_unavailable").delete().eq("name", current.name);
      await db.from("menu_unavailable").upsert({ name });
    }
  }
  refreshMenu();
  return NextResponse.json({ ok: true });
}

// remove an item: { id } deletes one added here; { builtIn: name } takes a built-in item or add-on off the menu
// (it can be brought back with PUT restore)
export async function DELETE(req: Request) {
  if (!(await getAdmin())) return deny();
  const { id, builtIn } = (await req.json().catch(() => ({}))) as { id?: number; builtIn?: string };
  const db = supabaseAdmin();

  if (typeof builtIn === "string") {
    if (!builtInItems().some((i) => i.name === builtIn) && !builtInAddons().some((a) => a.name === builtIn)) return bad("Item not found.", 404);
    const { data: existing } = await db.from("menu_overrides").select(OVERRIDE_COLS).eq("name", builtIn).maybeSingle<OverrideRow>();
    const { error } = await db.from("menu_overrides").upsert({ ...(existing ?? { price: null, option_prices: null, img: null, description: null }), name: builtIn, hidden: true });
    if (error) { console.error("menu item hide failed", error); return fail(error); }
    refreshMenu();
    return NextResponse.json({ ok: true });
  }

  if (!Number.isInteger(id)) return bad("Invalid request");
  const { data, error } = await db.from("menu_custom_items").delete().eq("id", id).select("name").maybeSingle();
  if (error) { console.error("menu item delete failed", error); return fail(error); }
  if (data) await db.from("menu_unavailable").delete().eq("name", data.name);
  refreshMenu();
  return NextResponse.json({ ok: true });
}
