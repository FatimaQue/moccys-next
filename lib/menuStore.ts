import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import type { CustomRow } from "./menuShared";
import { supabaseAdmin } from "./supabase/admin";

export const MENU_TAG = "menu-state";
export type MenuState = { custom: CustomRow[]; unavailable: string[] };

const load = unstable_cache(
  async (): Promise<MenuState> => {
    const db = supabaseAdmin();
    const [custom, off] = await Promise.all([
      db.from("menu_custom_items").select("id, category_id, name, price, description, img, options").order("id"),
      db.from("menu_unavailable").select("name"),
    ]);
    if (custom.error || off.error) throw new Error((custom.error ?? off.error)!.message); // errors are never cached
    return { custom: custom.data as CustomRow[], unavailable: off.data.map((r) => r.name) };
  },
  ["menu-state"],
  { tags: [MENU_TAG], revalidate: 60 },
);

// the menu keeps working on its built-in data if the inventory tables are missing or Supabase is down
export async function getMenuState(): Promise<MenuState> {
  try {
    return await load();
  } catch (e) {
    console.error("menu state unavailable", e);
    return { custom: [], unavailable: [] };
  }
}

// call after any inventory change so the site shows it straight away instead of after the 60s cache
export const refreshMenu = () => revalidateTag(MENU_TAG, { expire: 0 });
