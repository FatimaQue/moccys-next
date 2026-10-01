"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { money, useCart } from "./CartProvider";

export default function CartPanel() {
  const router = useRouter();
  const { cart, total, remove } = useCart();

  return (
    <aside className="cart-panel">
      <h3>Your Cart</h3>
      <div id="cartBody">
        {cart.length === 0 ? (
          <div className="cart-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 10s.8-1 3-1 3 1 3 1" strokeLinecap="round" /><circle cx="9" cy="14.2" r=".9" fill="currentColor" stroke="none" /><circle cx="15" cy="14.2" r=".9" fill="currentColor" stroke="none" /></svg>
            <b>Your cart is empty</b>
            <p>Go ahead and explore top categories.</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((it, idx) => (
                <div className={"cart-item" + (it.addon ? " is-addon" : "")} key={`${it.name}-${it.addon ? "a" : "i"}`}>
                  <Image src={it.img} alt="" width={84} height={84} />
                  <div className="cart-item-info">
                    <b>{it.name}</b>
                    <span>{money(it.price)}{it.qty > 1 ? ` × ${it.qty}` : ""}</span>
                  </div>
                  <button className="cart-item-x" aria-label="Remove" onClick={() => remove(idx)}>&times;</button>
                </div>
              ))}
            </div>
            <div className="cart-total"><span>Total</span><b>{money(total)}</b></div>
            <button className="btn btn-rust cart-checkout" onClick={() => router.push("/checkout")}>Checkout</button>
          </>
        )}
      </div>
    </aside>
  );
}
