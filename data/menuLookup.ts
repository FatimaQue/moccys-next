import { categories, type MenuItem } from "./menu";

const byName = new Map<string, MenuItem>(categories.flatMap((c) => c.items).map((i) => [i.name, i]));

// home-page cards open the same item modal as the full menu, so they look their item up by its menu name
export const findMenuItem = (name: string) => byName.get(name);
