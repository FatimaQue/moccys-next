"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { money, useCart } from "./CartProvider";

const DELIVERY_FEE = 59;

export default function CheckoutClient() {
  const { cart, setQty, remove, clear } = useCart();
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [pay, setPay] = useState<"cod" | "easypaisa">("cod");
  const [mobile, setMobile] = useState("");
  const [easypaisa, setEasypaisa] = useState("");
  const [same, setSame] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const delivery = orderType === "delivery";
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const fee = delivery ? DELIVERY_FEE : 0;
  const total = subtotal + fee;
  const empty = cart.length === 0;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity() || empty) return;
    setOrderId("#" + (124000 + Math.floor(Math.random() * 900)));
    clear();
  };

  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link href="/menu" className="backlink">
            <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
            Back to Menu
          </Link>
          <Link href="/" style={{ marginLeft: 8 }}>
            <Image className="brand-logo" src="/images/Logo-01.png" alt="McCoy's" width={160} height={32} />
          </Link>
        </div>
      </header>

      {!orderId && !empty && (
        <div className="wrap checkout-head">
          <span className="eyebrow">Checkout</span>
          <h1 className="display">Almost there, <span className="rust">one step to go</span></h1>
        </div>
      )}

      <div className="wrap">
        <div className={"checkout-layout" + (empty ? " is-empty" : "")}>
          {orderId ? (
            <div className="panel confirm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12.5l2.5 2.5L16 9.5" /></svg>
              <h1 className="display">Order <span className="rust">placed!</span></h1>
              <p>Thanks for ordering with mccoy&apos;s. Your order {orderId} is on its way to the kitchen.</p>
              <Link href="/menu" className="btn btn-rust">Back to Menu</Link>
            </div>
          ) : (
            <>
              {!empty && (
                <div>
                  <form className="panel" id="orderForm" onSubmit={submit}>
                    <h2>Shipping Address</h2>
                    <div className="form-grid">
                      <div className="field full">
                        <label htmlFor="fEmail">Email<i>*</i></label>
                        <input type="email" id="fEmail" placeholder="Enter Email" required />
                      </div>
                      <div className="field">
                        <label htmlFor="fName">Full Name<i>*</i></label>
                        <input type="text" id="fName" placeholder="Enter Full Name" required />
                      </div>
                      <div className="field">
                        <label htmlFor="fMobile">Mobile Number<i>*</i></label>
                        <input
                          type="tel" id="fMobile" placeholder="03XXXXXXXXX" pattern="03[0-9]{9}" required
                          value={mobile}
                          onChange={(e) => { setMobile(e.target.value); if (same) setEasypaisa(e.target.value); }}
                        />
                      </div>
                      <div className="field full">
                        <label htmlFor="fOrderType">Order Type</label>
                        <select id="fOrderType" value={orderType} onChange={(e) => setOrderType(e.target.value as "delivery" | "pickup")}>
                          <option value="delivery">Delivery</option>
                          <option value="pickup">Pick-up</option>
                        </select>
                      </div>
                    </div>

                    <div className={"delivery-only" + (delivery ? "" : " hidden")}>
                      <div className="field full">
                        <label htmlFor="fCity">City<i>*</i></label>
                        <select id="fCity" required={delivery} defaultValue="">
                          <option value="" disabled>Choose a City</option>
                          <option value="islamabad">Islamabad</option>
                          <option value="rawalpindi">Rawalpindi</option>
                        </select>
                      </div>
                      <div className="field full">
                        <label htmlFor="fAddress">Address Information<i>*</i></label>
                        <input type="text" id="fAddress" placeholder="House #, street, landmark" required={delivery} />
                      </div>
                    </div>

                    <div className="form-grid" style={{ marginTop: 18 }}>
                      <div className="field full">
                        <label htmlFor="fNotes">Notes</label>
                        <textarea id="fNotes" placeholder="Any instructions for your rider or the kitchen"></textarea>
                      </div>
                    </div>

                    <div className="divider"></div>

                    <h2>Payment Methods</h2>
                    <div className="pay-options">
                      <label className={"pay-opt" + (pay === "cod" ? " on" : "")}>
                        <input type="radio" name="payMethod" value="cod" checked={pay === "cod"} onChange={() => setPay("cod")} />
                        <span>Cash on Delivery</span>
                      </label>
                      <label className={"pay-opt" + (pay === "easypaisa" ? " on" : "")}>
                        <input type="radio" name="payMethod" value="easypaisa" checked={pay === "easypaisa"} onChange={() => setPay("easypaisa")} />
                        <span>Pay with Easypaisa</span>
                      </label>
                    </div>

                    <div className={"pay-easypaisa" + (pay === "easypaisa" ? "" : " hidden")}>
                      <div className="field">
                        <label htmlFor="fEasypaisa">EasyPaisa Number</label>
                        <input
                          type="tel" id="fEasypaisa" placeholder="03XXXXXXXXX"
                          required={pay === "easypaisa"} disabled={same}
                          value={easypaisa} onChange={(e) => setEasypaisa(e.target.value)}
                        />
                      </div>
                      <label className="checkbox-row">
                        <input
                          type="checkbox" id="fSameNumber" checked={same}
                          onChange={(e) => { setSame(e.target.checked); if (e.target.checked) setEasypaisa(mobile); }}
                        />
                        Same as Contact Number
                      </label>
                    </div>
                  </form>
                </div>
              )}

              <aside className="panel summary">
                <h2>Order Summary</h2>
                {empty ? (
                  <div className="sum-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 10s.8-1 3-1 3 1 3 1" strokeLinecap="round" /><circle cx="9" cy="14.2" r=".9" fill="currentColor" stroke="none" /><circle cx="15" cy="14.2" r=".9" fill="currentColor" stroke="none" /></svg>
                    <b>Your cart is empty</b>
                    <p>Add something tasty before checking out.</p>
                    <Link href="/menu" className="btn btn-rust">Browse Menu</Link>
                  </div>
                ) : (
                  <>
                    <div className="sum-items">
                      {cart.map((it, idx) => (
                        <div className="sum-item" key={`${it.name}-${it.addon ? "a" : "i"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={it.img} alt="" />
                          <div className="sum-item-info">
                            <b>{it.name}</b>
                            <span className="sum-item-price">{money(it.price)}</span>
                            <span className="sum-item-qty">Qty: {it.qty}</span>
                          </div>
                          <div className="sum-item-side">
                            <div className="qty-stepper">
                              <button type="button" aria-label="Decrease quantity" onClick={() => setQty(idx, it.qty - 1)}>&minus;</button>
                              <span>{it.qty}</span>
                              <button type="button" aria-label="Increase quantity" onClick={() => setQty(idx, it.qty + 1)}>+</button>
                            </div>
                            <button type="button" className="sum-item-x" aria-label="Remove item" onClick={() => remove(idx)}>
                              <svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="sum-totals">
                      <div><span>Subtotal</span><span>{money(subtotal)}</span></div>
                      <div><span>Tax</span><span>{money(0)}</span></div>
                      <div><span>Discount</span><span>{money(0)}</span></div>
                      <div><span>Delivery Charges</span><span>{money(fee)}</span></div>
                      <div className="grand"><span>Total</span><b>{money(total)}</b></div>
                    </div>
                    <button type="submit" form="orderForm" className="btn btn-rust">Place Order</button>
                  </>
                )}
              </aside>
            </>
          )}
        </div>
      </div>

      <footer className="foot">
        <div className="wrap"><p className="foot-copy">McCoy&apos;s Copyright &copy; 2026. All Rights Reserved.</p></div>
      </footer>
    </>
  );
}
