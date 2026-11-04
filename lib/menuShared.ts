import { ADDONS, type AddonGroup } from "@/data/addons";
import { categories as baseMenu, type Category, type MenuItem } from "@/data/menu";
import type { Priced } from "./pricing";

// a menu item added from the admin inventory page (a row of menu_custom_items)
export type CustomRow = {
  id: number;
  category_id: string;
  name: string;
  price: number;
  description: string | null;
  img: string | null;
  options: { label: string; price: number }[] | null;
};

// a change made on the inventory page to a built-in item or add-on (a row of menu_overrides)
export type OverrideRow = {
  name: string;
  price: number | null;
  option_prices: Record<string, number> | null;
  img: string | null;
  description: string | null;
  hidden: boolean;
};

export const money = (n: number) => "Rs. " + n.toLocaleString("en-US");

export const customToMenuItem = (r: CustomRow): MenuItem => {
  const opts = r.options?.length ? r.options.map((o) => ({ label: o.label, name: `${r.name} (${o.label})`, price: o.price })) : undefined;
  const prices = opts ? opts.map((o) => o.price) : [r.price];
  return {
    name: r.name,
    price: prices[0],
    priceLabel: "Rs. " + [...new Set(prices)].map((p) => p.toLocaleString("en-US")).join(" / "),
    img: r.img || "/images/Logo-01.png",
    imgAlt: r.name,
    desc: r.description ?? "",
    options: opts,
  };
};

const byName = (rows: OverrideRow[]) => new Map(rows.map((o) => [o.name, o]));

function overrideItem(item: MenuItem, o?: OverrideRow): MenuItem {
  if (!o) return item;
  const next: MenuItem = { ...item };
  if (o.img) next.img = o.img;
  if (o.description) next.desc = o.description;
  if (item.options?.length) {
    if (o.option_prices) {
      next.options = item.options.map((opt) => ({ ...opt, price: o.option_prices?.[opt.label] ?? opt.price }));
      next.price = next.options[0].price;
      next.priceLabel = "Rs. " + [...new Set(next.options.map((x) => x.price))].map((p) => p.toLocaleString("en-US")).join(" / ");
    }
  } else if (o.price) {
    next.price = o.price;
    next.priceLabel = money(o.price);
  }
  return next;
}

// the built-in menu with the inventory changes applied, plus the items added on the inventory page.
// Removed items are dropped unless keepHidden is set (the home page still needs to find them to show "Unavailable").
export function mergeMenu(custom: CustomRow[], overrides: OverrideRow[], keepHidden = false): Category[] {
  const o = byName(overrides);
  return baseMenu.map((c) => {
    const items = c.items.filter((i) => keepHidden || !o.get(i.name)?.hidden).map((i) => overrideItem(i, o.get(i.name)));
    return { ...c, items: [...items, ...custom.filter((r) => r.category_id === c.id).map(customToMenuItem)] };
  });
}

export function mergeAddons(overrides: OverrideRow[], keepHidden = false): AddonGroup[] {
  const o = byName(overrides);
  return ADDONS.map((g) => ({
    ...g,
    items: g.items
      .filter((a) => keepHidden || !o.get(a.name)?.hidden)
      .map((a) => { const x = o.get(a.name); return { ...a, price: x?.price || a.price, img: x?.img || a.img }; }),
  }));
}

// name -> price/photo/parent for every line a cart can hold, so orders are priced the same way the menu shows them
// (built-in with the inventory changes applied, plus custom items). Removed items are left out: they can't be ordered.
export function buildCatalog(custom: CustomRow[], overrides: OverrideRow[]) {
  const menu = new Map<string, Priced>();
  const addons = new Map<string, Priced>();
  for (const item of mergeMenu(custom, overrides).flatMap((c) => c.items)) {
    menu.set(item.name, { price: item.price, img: item.img, parent: item.name });
    for (const o of item.options ?? []) menu.set(o.name, { price: o.price, img: item.img, parent: item.name });
  }
  for (const a of mergeAddons(overrides).flatMap((g) => g.items)) addons.set(a.name, { price: a.price, img: a.img, parent: a.name });
  return { menu, addons };
}
