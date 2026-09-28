"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { categories as base, type Category } from "@/data/menu";
import { customToMenuItem, type CustomRow } from "@/lib/menuShared";

type Ctx = {
  categories: Category[];                    // built-in menu plus items added from the inventory page
  isAvailable: (name: string) => boolean;    // works for menu items and add-ons alike
  query: string;                             // "Find in mccoy's" — shared so the nav (in the layout)
  setQuery: (q: string) => void;             // and the menu page (a sibling) can both reach it
};

const MenuCtx = createContext<Ctx>({ categories: base, isAvailable: () => true, query: "", setQuery: () => {} });

export function MenuProvider({ custom, unavailable, children }: { custom: CustomRow[]; unavailable: string[]; children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const value = useMemo<Ctx>(() => {
    const off = new Set(unavailable);
    return {
      isAvailable: (name) => !off.has(name),
      categories: base.map((c) => {
        const extra = custom.filter((r) => r.category_id === c.id).map(customToMenuItem);
        return extra.length ? { ...c, items: [...c.items, ...extra] } : c;
      }),
      query, setQuery,
    };
  }, [custom, unavailable, query]);
  return <MenuCtx.Provider value={value}>{children}</MenuCtx.Provider>;
}

export const useMenu = () => useContext(MenuCtx);
