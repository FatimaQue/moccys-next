"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { money, useCart } from "../CartProvider";

export default function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { cart, total, setQty, remove } = useCart();

  useEffect(() => {
    document.body.classList.toggle("cart-lock", open);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("cart-lock");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <>
      <div className={"cart-overlay" + (open ? " open" : "")} onClick={onClose}></div>
      <aside className={"cart-drawer" + (open ? " open" : "")} aria-label="Shopping cart">
        <div className="cart-drawer-head">
          <h3>Your Cart</h3>
          <button className="cart-close" aria-label="Close cart" onClick={onClose}>&times;</button>
        </div>
        <div className="cart-drawer-body">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 10s.8-1 3-1 3 1 3 1" strokeLinecap="round" /><circle cx="9" cy="14.2" r=".9" fill="currentColor" stroke="none" /><circle cx="15" cy="14.2" r=".9" fill="currentColor" stroke="none" /></svg>
              <b>Your cart is empty</b><p>Add a deal to get started.</p>
            </div>
          ) : (
            cart.map((it, idx) => (
              <div className="cart-line" key={`${it.name}-${it.addon ? "a" : "i"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.img} alt="" />
                <div className="cart-line-info">
                  <b>{it.name}</b>
                  <span className="cart-line-price">{money(it.price)}</span>
                  <div className="cart-line-foot">
                    <div className="qty">
                      <button aria-label="Decrease quantity" onClick={() => (it.qty <= 1 ? remove(idx) : setQty(idx, it.qty - 1))}>−</button>
                      <span>{it.qty}</span>
                      <button aria-label="Increase quantity" onClick={() => setQty(idx, it.qty + 1)}>+</button>
                    </div>
                    <button className="cart-line-remove" aria-label={`Remove ${it.name}`} onClick={() => remove(idx)}>
                      <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="cart-drawer-foot" hidden={cart.length === 0}>
          <div className="cart-subtotal"><span>Subtotal</span><b>{money(total)}</b></div>
          <button className="btn btn-rust cart-checkout-btn" onClick={() => router.push("/checkout")}>Checkout</button>
        </div>
      </aside>
    </>
  );
}
