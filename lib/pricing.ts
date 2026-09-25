import { ADDONS } from "@/data/addons";
import { categories } from "@/data/menu";

export const DELIVERY_FEE = 59;

// parent is the menu item a cart line belongs to, which is what the inventory page switches on and off
export type Priced = { price: number; img: string; parent: string };

// name -> price/photo for everything a cart line can be. The server prices orders from this,
// never from the numbers the browser sends.
export const menuCatalog = new Map<string, Priced>();
export const addonCatalog = new Map<string, Priced>();

for (const item of categories.flatMap((c) => c.items)) {
  menuCatalog.set(item.name, { price: item.price, img: item.img, parent: item.name });
  for (const o of item.options ?? []) menuCatalog.set(o.name, { price: o.price, img: item.img, parent: item.name });
}
for (const a of ADDONS.flatMap((g) => g.items)) addonCatalog.set(a.name, { price: a.price, img: a.img, parent: a.name });
