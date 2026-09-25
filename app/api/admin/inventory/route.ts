import { NextResponse } from "next/server";
import { ADDONS } from "@/data/addons";
import { categories } from "@/data/menu";
import { getAdmin } from "@/lib/adminAuth";
import { customToMenuItem, type CustomRow } from "@/lib/menuShared";
import { refreshMenu } from "@/lib/menuStore";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_TABLES = "The inventory tables don't exist yet. Run the inventory SQL in the Supabase SQL editor first.";
const deny = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const fail = (error: { code?: string; message?: string }) =>
  NextResponse.json({ error: error.code === "42P01" || error.code === "PGRST205" ? NO_TABLES : "Something went wrong. Please try again." }, { status: 500 });

// the whole inventory: every built-in and custom menu item, plus add-ons, each with its availability
export async function GET() {
  if (!(await getAdmin())) return deny();
  const db = supabaseAdmin();
  const [custom, off] = await Promise.all([
    db.from("menu_custom_items").select("id, category_id, name, price, description, img, options").order("id").returns<CustomRow[]>(),
    db.from("menu_unavailable").select("name"),
  ]);
  if (custom.error || off.error) { console.error("inventory load failed", custom.error ?? off.error); return fail((custom.error ?? off.error)!); }

  const out = new Set(off.data.map((r) => r.name));
  const row = (name: string, priceLabel: string, img: string, extra: object = {}) => ({ name, priceLabel, img, available: !out.has(name), ...extra });

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id, label: c.label,
      items: [
        ...c.items.map((i) => row(i.name, i.priceLabel, i.img)),
        ...custom.data.filter((r) => r.category_id === c.id).map((r) => {
          const m = customToMenuItem(r);
          return row(m.name, m.priceLabel, m.img, { customId: r.id });
        }),
      ],
    })),
    addons: ADDONS.map((g) => ({
      id: "addons-" + g.group, label: "Add-ons · " + g.group,
      items: g.items.map((a) => row(a.name, "Rs. " + a.price.toLocaleString("en-US"), a.img)),
    })),
  });
}

// switch one or many items on or off: { names: string[], available: boolean }
export async function PATCH(req: Request) {
  if (!(await getAdmin())) return deny();
  const { names, available } = (await req.json().catch(() => ({}))) as { names?: unknown; available?: unknown };
  if (!Array.isArray(names) || !names.length || names.length > 500 || names.some((n) => typeof n !== "string") || typeof available !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = available
    ? await db.from("menu_unavailable").delete().in("name", names)
    : await db.from("menu_unavailable").upsert((names as string[]).map((name) => ({ name })));
  if (error) { console.error("availability update failed", error); return fail(error); }
  refreshMenu();
  return NextResponse.json({ ok: true });
}

// add a new menu item: { category, name, price, description, img, options?: {label, price}[] }
export async function POST(req: Request) {
  if (!(await getAdmin())) return deny();
  const b = (await req.json().catch(() => ({}))) as {
    category?: string; name?: string; price?: number; description?: string; img?: string; options?: { label?: string; price?: number }[];
  };
  const name = String(b.name ?? "").trim().slice(0, 80);
  const category = categories.find((c) => c.id === b.category);
  const options = (Array.isArray(b.options) ? b.options : [])
    .map((o) => ({ label: String(o.label ?? "").trim().slice(0, 30), price: Number(o.price) }))
    .filter((o) => o.label || o.price);
  const price = options.length ? options[0].price : Number(b.price);

  if (!name || !category) return NextResponse.json({ error: "Please enter a name and choose a category." }, { status: 400 });
  if (options.some((o) => !o.label || !Number.isInteger(o.price) || o.price < 1) || !Number.isInteger(price) || price < 1) {
    return NextResponse.json({ error: "Prices must be whole numbers above 0, and every size needs a name." }, { status: 400 });
  }
  if (!String(b.img ?? "").trim()) return NextResponse.json({ error: "Please add a photo." }, { status: 400 });

  // names identify items everywhere (cart, orders, availability), so they must be unique across the whole menu
  const taken = new Set([...categories.flatMap((c) => c.items.flatMap((i) => [i.name, ...(i.options ?? []).map((o) => o.name)])), ...ADDONS.flatMap((g) => g.items.map((a) => a.name))]);
  if (taken.has(name)) return NextResponse.json({ error: "An item with that name already exists." }, { status: 409 });

  const { error } = await supabaseAdmin().from("menu_custom_items").insert({
    category_id: category.id, name, price, description: String(b.description ?? "").trim().slice(0, 500) || null,
    img: String(b.img).trim(), options: options.length ? options : null,
  });
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "An item with that name already exists." }, { status: 409 });
    console.error("menu item insert failed", error);
    return fail(error);
  }
  refreshMenu();
  return NextResponse.json({ ok: true });
}

// remove an item that was added here (built-in items can only be switched off): { id }
export async function DELETE(req: Request) {
  if (!(await getAdmin())) return deny();
  const { id } = (await req.json().catch(() => ({}))) as { id?: number };
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db.from("menu_custom_items").delete().eq("id", id).select("name").maybeSingle();
  if (error) { console.error("menu item delete failed", error); return fail(error); }
  if (data) await db.from("menu_unavailable").delete().eq("name", data.name);
  refreshMenu();
  return NextResponse.json({ ok: true });
}
