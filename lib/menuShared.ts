import type { MenuItem } from "@/data/menu";
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

// name -> price/photo/parent for custom items, so orders are priced the same way as the built-in menu
export function customCatalog(rows: CustomRow[]) {
  const m = new Map<string, Priced>();
  for (const r of rows) {
    const item = customToMenuItem(r);
    m.set(item.name, { price: item.price, img: item.img, parent: item.name });
    for (const o of item.options ?? []) m.set(o.name, { price: o.price, img: item.img, parent: item.name });
  }
  return m;
}
