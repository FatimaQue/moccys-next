"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DELIVERY_FEE } from "@/lib/pricing";
import { money, useCart } from "./CartProvider";
import { LAST_ORDER_KEY } from "./TrackClient";


// the restaurant's own account, shown to customers who choose bank transfer (set in .env.local; the option hides if it's empty)
const BANK = {
  name: process.env.NEXT_PUBLIC_BANK_NAME || "",
  title: process.env.NEXT_PUBLIC_BANK_ACCOUNT_TITLE || "",
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "",
  iban: process.env.NEXT_PUBLIC_BANK_IBAN || "",
};

export default function CheckoutClient() {
  const { cart, setQty, remove, clear } = useCart();
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [pay, setPay] = useState<"cod" | "easypaisa" | "jazzcash" | "bank">("cod");
  const [mobile, setMobile] = useState("");
  const [wallet, setWallet] = useState(""); // the EasyPaisa / JazzCash number
  const bank = pay === "bank";
  const walletName = pay === "jazzcash" ? "JazzCash" : "EasyPaisa";
  // the wallet number is the customer's own account; a checkbox that copies their contact number makes no sense for a bank transfer
  const choose = (m: typeof pay) => { setPay(m); if (m === "bank") { setSame(false); setWallet(""); } };
  const [same, setSame] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const delivery = orderType === "delivery";
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const fee = delivery ? DELIVERY_FEE : 0;
  const total = subtotal + fee;
  const empty = cart.length === 0;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity() || empty || submitting) return;
    const val = (id: string) => (form.elements.namedItem(id) as HTMLInputElement | null)?.value ?? "";

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: val("fEmail"), name: val("fName"), mobile, orderType,
          city: val("fCity"), address: val("fAddress"), notes: val("fNotes"),
          payMethod: pay, wallet,
          items: cart.map((i) => ({ name: i.name, qty: i.qty, addon: !!i.addon })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not place your order. Please try again.");
        return;
      }
      // hand the order to the tracking page so it opens straight to it
      try { localStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ orderNo: data.orderNo, mobile })); } catch { /* storage blocked: they can type it in */ }
      setOrderId(data.orderNo);
      clear();
    } catch {
      setError("Network problem. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
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
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/track" className="btn btn-rust">Track Order</Link>
                <Link href="/menu" className="btn btn-out">Back to Menu</Link>
              </div>
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
                          onChange={(e) => { setMobile(e.target.value); if (same) setWallet(e.target.value); }}
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
                        <input type="radio" name="payMethod" value="cod" checked={pay === "cod"} onChange={() => choose("cod")} />
                        <span>Cash on Delivery</span>
                      </label>
                      <label className={"pay-opt" + (pay === "easypaisa" ? " on" : "")}>
                        <input type="radio" name="payMethod" value="easypaisa" checked={pay === "easypaisa"} onChange={() => choose("easypaisa")} />
                        <span>Pay with Easypaisa</span>
                      </label>
                      <label className={"pay-opt" + (pay === "jazzcash" ? " on" : "")}>
                        <input type="radio" name="payMethod" value="jazzcash" checked={pay === "jazzcash"} onChange={() => choose("jazzcash")} />
                        <span>Pay with JazzCash</span>
                      </label>
                      {BANK.account && (
                        <label className={"pay-opt" + (bank ? " on" : "")}>
                          <input type="radio" name="payMethod" value="bank" checked={bank} onChange={() => choose("bank")} />
                          <span>Bank Transfer</span>
                        </label>
                      )}
                    </div>

                    <div className={"pay-easypaisa" + (pay === "cod" ? " hidden" : "")}>
                      {bank && (
                        <div className="bank-box">
                          <b>Transfer the total to:</b>
                          {BANK.name && <div><span>Bank</span>{BANK.name}</div>}
                          {BANK.title && <div><span>Account title</span>{BANK.title}</div>}
                          <div><span>Account number</span>{BANK.account}</div>
                          {BANK.iban && <div><span>IBAN</span>{BANK.iban}</div>}
                          <small>Then enter your account number or the transfer reference below so we can match your payment.</small>
                        </div>
                      )}
                      <div className="field">
                        <label htmlFor="fEasypaisa">{bank ? "Your Account Number / Transfer Reference" : `${walletName} Number`}</label>
                        <input
                          type={bank ? "text" : "tel"} id="fEasypaisa" placeholder={bank ? "Account number or reference" : "03XXXXXXXXX"}
                          required={pay !== "cod"} disabled={same && !bank} minLength={bank ? 4 : undefined} maxLength={bank ? 30 : undefined}
                          value={wallet} onChange={(e) => setWallet(e.target.value)}
                        />
                      </div>
                      {!bank && <label className="checkbox-row">
                        <input
                          type="checkbox" id="fSameNumber" checked={same}
                          onChange={(e) => { setSame(e.target.checked); if (e.target.checked) setWallet(mobile); }}
                        />
                        Same as Contact Number
                      </label>}
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
                    {error && <p role="alert" style={{ color: "var(--rust)", fontWeight: 700, margin: "0 0 12px" }}>{error}</p>}
                    <button type="submit" form="orderForm" className="btn btn-rust" disabled={submitting}>{submitting ? "Placing order…" : "Place Order"}</button>
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
