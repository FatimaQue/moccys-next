"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { trackEvent } from "@/lib/trackEvent";

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
  reprice: (prices: Record<string, number>) => void;
  clear: () => void;
};

export const MAX_QTY = 50; // the most of one item an order can hold (the server enforces the same limit)
const clampQty = (n: unknown) => Math.min(MAX_QTY, Math.max(1, Math.floor(Number(n)) || 1));
export const priceKey = (l: { name: string; addon?: boolean }) => `${l.addon ? "a" : "i"}:${l.name}`;

const KEY = "mccoysCart"; // same key as the static site, so a cart survives moving between the two
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  // read localStorage after mount only — reading during render would mismatch the server HTML
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]") as CartLine[];
      // the saved cart is just text in the browser, so only take well-formed lines with a sane quantity
      const lines = (Array.isArray(saved) ? saved : []).filter((l) => l && typeof l.name === "string" && typeof l.img === "string" && Number.isFinite(l.price));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage can only be read after mount
      setCart(lines.map((l) => ({ ...l, qty: clampQty(l.qty) })));
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
    if (!line.addon) trackEvent("add_to_cart", line.name);
    setCart((prev) => {
      const i = prev.findIndex((c) => c.name === line.name && !!c.addon === !!line.addon);
      if (i === -1) return [...prev, line];
      return prev.map((c, j) => (j === i ? { ...c, qty: clampQty(c.qty + line.qty) } : c));
    });
  }, []);

  const remove = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setQty = useCallback((index: number, qty: number) => {
    setCart((prev) => prev.map((c, i) => (i === index ? { ...c, qty: clampQty(qty) } : c)));
  }, []);

  // the server's current prices, keyed by priceKey(); used when the menu changed since the item was added
  const reprice = useCallback((prices: Record<string, number>) => {
    setCart((prev) => prev.map((c) => {
      const p = prices[priceKey(c)];
      return typeof p === "number" ? { ...c, price: p } : c;
    }));
  }, []);

  const clear = useCallback(() => setCart([]), []);

  const value = useMemo<CartCtx>(
    () => ({
      cart,
      add,
      remove,
      setQty,
      reprice,
      clear,
      count: cart.reduce((s, i) => s + i.qty, 0),
      total: cart.reduce((s, i) => s + i.price * i.qty, 0),
    }),
    [cart, add, remove, setQty, reprice, clear]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
}

export const money = (n: number) => "Rs. " + n.toLocaleString("en-US");
