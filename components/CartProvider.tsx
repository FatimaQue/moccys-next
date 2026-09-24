"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  name: string;
  price: number;
  img: string;
  qty: number;
  addon?: boolean; // add-ons are their own rows so the total is item + every add-on
};

type CartCtx = {
  cart: CartLine[];
  count: number;
  total: number;
  add: (line: CartLine) => void;
  remove: (index: number) => void;
  setQty: (index: number, qty: number) => void;
  clear: () => void;
};

const KEY = "mccoysCart"; // same key as the static site, so a cart survives moving between the two
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  // read localStorage after mount only — reading during render would mismatch the server HTML
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]") as CartLine[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage can only be read after mount
      setCart(saved.map((l) => ({ ...l, qty: l.qty || 1 })));
    } catch {
      setCart([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch {
      /* storage blocked: the cart still works for this visit */
    }
  }, [cart, loaded]);

  const add = useCallback((line: CartLine) => {
    setCart((prev) => {
      const i = prev.findIndex((c) => c.name === line.name && !!c.addon === !!line.addon);
      if (i === -1) return [...prev, line];
      return prev.map((c, j) => (j === i ? { ...c, qty: c.qty + line.qty } : c));
    });
  }, []);

  const remove = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setQty = useCallback((index: number, qty: number) => {
    setCart((prev) => prev.map((c, i) => (i === index ? { ...c, qty: Math.max(1, qty) } : c)));
  }, []);

  const clear = useCallback(() => setCart([]), []);

  const value = useMemo<CartCtx>(
    () => ({
      cart,
      add,
      remove,
      setQty,
      clear,
      count: cart.reduce((s, i) => s + i.qty, 0),
      total: cart.reduce((s, i) => s + i.price * i.qty, 0),
    }),
    [cart, add, remove, setQty, clear]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
}

export const money = (n: number) => "Rs. " + n.toLocaleString("en-US");
