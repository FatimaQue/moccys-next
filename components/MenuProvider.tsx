"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { ADDONS, type AddonGroup } from "@/data/addons";
import { categories as base, type Category, type MenuItem } from "@/data/menu";
import { mergeMenu, mergeAddons, type CustomRow, type OverrideRow } from "@/lib/menuShared";

type Ctx = {
  categories: Category[];                    // built-in menu with inventory changes, plus items added from the inventory page
  addons: AddonGroup[];                      // add-ons with inventory changes applied
  isAvailable: (name: string) => boolean;    // works for menu items and add-ons alike; removed items count as unavailable
  findItem: (name: string) => MenuItem | undefined; // up-to-date item by name, even a removed one (the home page shows it as Unavailable)
  query: string;                             // "Find in mccoy's" — shared so the nav (in the layout)
  setQuery: (q: string) => void;             // and the menu page (a sibling) can both reach it
};

const MenuCtx = createContext<Ctx>({
  categories: base, addons: ADDONS, isAvailable: () => true,
  findItem: (name) => base.flatMap((c) => c.items).find((i) => i.name === name),
  query: "", setQuery: () => {},
});

export function MenuProvider({ custom, unavailable, overrides, children }: { custom: CustomRow[]; unavailable: string[]; overrides: OverrideRow[]; children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const value = useMemo<Ctx>(() => {
    const off = new Set(unavailable);
    const gone = new Set(overrides.filter((o) => o.hidden).map((o) => o.name));
    const all = new Map(mergeMenu(custom, overrides, true).flatMap((c) => c.items).map((i) => [i.name, i]));
    return {
      isAvailable: (name) => !off.has(name) && !gone.has(name),
      findItem: (name) => all.get(name),
      categories: mergeMenu(custom, overrides),
      addons: mergeAddons(overrides),
      query, setQuery,
    };
  }, [custom, unavailable, overrides, query]);
  return <MenuCtx.Provider value={value}>{children}</MenuCtx.Provider>;
}

export const useMenu = () => useContext(MenuCtx);
