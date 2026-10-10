"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CLOSED_MESSAGE } from "@/lib/hours";
import { DELIVERY_FEE, MIN_DELIVERY_ORDER } from "@/lib/pricing";
import { money, useCart } from "./CartProvider";
import { trackEvent } from "@/lib/trackEvent";
import { DELIVERY_ADDRESS_KEY } from "./Nav";
import { LAST_ORDER_KEY } from "./TrackClient";


// the restaurant's own account, shown to customers who choose bank transfer (set in .env.local; the option hides if it's empty)
const BANK = {
  name: process.env.NEXT_PUBLIC_BANK_NAME || "",
  title: process.env.NEXT_PUBLIC_BANK_ACCOUNT_TITLE || "",
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "",
  iban: process.env.NEXT_PUBLIC_BANK_IBAN || "",
};

// Reads how the trip to Safepay's hosted page ended from the return URL, once, before first
// render — a plain value used to seed initial state, not an effect, so there's no setState-after-mount involved.
function readSafepayReturn(): { result: "success" | "failed" | "cancelled"; orderNo: string | null } | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const result = params.get("safepay");
  if (result === "success" || result === "failed" || result === "cancelled") return { result, orderNo: params.get("order") };
  return null;
}

const SAFEPAY_ERRORS = {
  failed: "Your online payment didn't go through. You can try again or choose another payment method.",
  cancelled: "You cancelled the online payment. Your cart is still here — try again or choose another payment method.",
};

// the delivery address set from the nav's map popup (Nav / SiteNav / HomeClient), so it doesn't
// have to be typed in twice
function readSavedAddress() {
  if (typeof window === "undefined") return "";
  try { return localStorage.getItem(DELIVERY_ADDRESS_KEY) ?? ""; } catch { return ""; }
}

type CheckoutCustomer = { name: string; email: string | null; phone: string | null };

// onlinePay: whether Safepay keys are set on the server (the option hides otherwise)
// customer: the signed-in account (null = not logged in, so ordering is locked behind a login)
// open: whether the kitchen is taking orders right now (the server checks again when the order is sent)
export default function CheckoutClient({ onlinePay, customer, open, savedAddresses = [] }: { onlinePay: boolean; customer: CheckoutCustomer | null; open: boolean; savedAddresses?: { label: string; address: string }[] }) {
  const { cart, setQty, remove, clear } = useCart();
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [pay, setPay] = useState<"cod" | "safepay" | "bank">("cod");
  const [mobile, setMobile] = useState(customer?.phone ?? "");
  const [wallet, setWallet] = useState(""); // the bank account/reference, for a bank transfer
  const bank = pay === "bank";
  const choose = (m: typeof pay) => setPay(m);
  const [safepayReturn] = useState(readSafepayReturn);
  const [navAddress] = useState(readSavedAddress); // the address set with the Delivery button in the navbar
  const [address, setAddress] = useState(navAddress); // the delivery address field; the dropdown above it fills it in
  // the account's saved addresses, plus the navbar one if it isn't already among them
  const addressOptions = [
    ...savedAddresses,
    ...(navAddress && !savedAddresses.some((a) => a.address === navAddress) ? [{ label: "Delivery address", address: navAddress }] : []),
  ];
  const [addrOpen, setAddrOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!addrOpen) return;
    const close = (e: MouseEvent) => { if (!comboRef.current?.contains(e.target as Node)) setAddrOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [addrOpen]);
  const [orderId, setOrderId] = useState<string | null>(() => (safepayReturn?.result === "success" ? safepayReturn.orderNo : null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    safepayReturn && safepayReturn.result !== "success" ? SAFEPAY_ERRORS[safepayReturn.result] : null
  );

  // Clean the return-trip query params out of the URL bar; the cart is only emptied once the
  // payment actually went through, so a cancelled or failed payment keeps it for another try.
  useEffect(() => {
    if (safepayReturn) window.history.replaceState({}, "", "/checkout");
    if (safepayReturn?.result === "success") { trackEvent("order_placed", safepayReturn.orderNo ?? undefined); clear(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reaching checkout with something in the cart (the cart loads just after mount, hence waiting for it)
  const startedRef = useRef(false);
  useEffect(() => {
    if (cart.length && !startedRef.current && !orderId) { startedRef.current = true; trackEvent("checkout_start"); }
  }, [cart.length, orderId]);

  const delivery = orderType === "delivery";
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const fee = delivery ? DELIVERY_FEE : 0;
  const total = subtotal + fee;
  const empty = cart.length === 0;
  const belowMinimum = delivery && subtotal < MIN_DELIVERY_ORDER;
  // an email account orders under its verified email, a phone-only account under its verified number (the server enforces both)
  const lockEmail = !!customer?.email;
  const lockMobile = !!customer && !customer.email && !!customer.phone;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!customer || !open || belowMinimum || !form.reportValidity() || empty || submitting) return;
    const val = (id: string) => (form.elements.namedItem(id) as HTMLInputElement | null)?.value ?? "";

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lockEmail ? customer!.email! : val("fEmail"), name: val("fName"), mobile, orderType,
          city: val("fCity"), address: address.trim(), notes: val("fNotes"),
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

      if (pay === "safepay") {
        const payRes = await fetch("/api/payments/safepay/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNo: data.orderNo }),
        });
        const payData = await payRes.json().catch(() => ({}));
        if (!payRes.ok || !payData.url) {
          setError(payData.error || "Could not start online payment. Please try again or choose another payment method.");
          return;
        }
        window.location.href = payData.url; // navigates away to Safepay; the cart clears when it sends them back paid
        return;
      }

      setOrderId(data.orderNo);
      trackEvent("order_placed", data.orderNo);
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
                  {!customer && (
                    <div className="panel" style={{ marginBottom: 18 }}>
                      <h2>Log in to place your order</h2>
                      <p style={{ margin: "0 0 16px" }}>Your cart is saved. Sign in (or create an account — we&apos;ll verify your email with a code) and you&apos;ll come straight back here.</p>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <Link href="/login?next=/checkout" className="btn btn-rust">Log In</Link>
                        <Link href="/signup?next=/checkout" className="btn btn-out">Sign Up</Link>
                      </div>
                    </div>
                  )}
                  {customer && <form className="panel" id="orderForm" onSubmit={submit}>
                    <h2>Delivery Details</h2>
                    <div className="form-grid">
                      <div className="field full">
                        <label htmlFor="fEmail">Email<i>*</i></label>
                        {lockEmail ? (
                          // a signed-in email account always orders under its own verified email, so show exactly that (not editable, not autofillable)
                          <input type="email" id="fEmail" required value={customer!.email!} readOnly autoComplete="off" />
                        ) : (
                          <input type="email" id="fEmail" placeholder="Enter Email" required defaultValue="" />
                        )}
                      </div>
                      <div className="field">
                        <label htmlFor="fName">Full Name<i>*</i></label>
                        <input type="text" id="fName" placeholder="Enter Full Name" required defaultValue={customer?.name ?? ""} />
                      </div>
                      <div className="field">
                        <label htmlFor="fMobile">Mobile Number<i>*</i></label>
                        <input
                          type="tel" id="fMobile" placeholder="03XXXXXXXXX" pattern="03[0-9]{9}" required
                          value={mobile} readOnly={lockMobile}
                          onChange={(e) => setMobile(e.target.value)}
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
                        {/* typeable field; with saved addresses it opens a list on click/arrow to pick from */}
                        <div className="addr-combo" ref={comboRef}>
                          <input
                            type="text" id="fAddress" placeholder="House #, street, landmark" required={delivery}
                            autoComplete="street-address" value={address}
                            style={addressOptions.length > 0 ? { paddingRight: 38 } : undefined}
                            onChange={(e) => setAddress(e.target.value)}
                            onClick={() => addressOptions.length > 0 && setAddrOpen(true)}
                            onKeyDown={(e) => { if (e.key === "Escape") setAddrOpen(false); }}
                          />
                          {addressOptions.length > 0 && (
                            <>
                              <button type="button" className="addr-arrow" aria-label="Show saved addresses" aria-expanded={addrOpen} onClick={() => setAddrOpen((o) => !o)}>
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                              </button>
                              {addrOpen && (
                                <ul className="addr-list" role="listbox">
                                  {addressOptions.map((o, i) => (
                                    <li key={i} role="option" aria-selected={o.address === address} onMouseDown={(e) => { e.preventDefault(); setAddress(o.address); setAddrOpen(false); }}>
                                      <b>{o.label}</b> — {o.address}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </>
                          )}
                        </div>
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
                      {onlinePay && (
                        <label className={"pay-opt" + (pay === "safepay" ? " on" : "")}>
                          <input type="radio" name="payMethod" value="safepay" checked={pay === "safepay"} onChange={() => choose("safepay")} />
                          <span>Pay Online <small>JazzCash, Easypaisa, Bank Transfer, Card</small></span>
                        </label>
                      )}
                      {BANK.account && (
                        <label className={"pay-opt" + (bank ? " on" : "")}>
                          <input type="radio" name="payMethod" value="bank" checked={bank} onChange={() => choose("bank")} />
                          <span>Bank Transfer</span>
                        </label>
                      )}
                    </div>

                    <div className={"pay-easypaisa" + (bank ? "" : " hidden")}>
                      <div className="bank-box">
                        <b>Transfer the total to:</b>
                        {BANK.name && <div><span>Bank</span>{BANK.name}</div>}
                        {BANK.title && <div><span>Account title</span>{BANK.title}</div>}
                        <div><span>Account number</span>{BANK.account}</div>
                        {BANK.iban && <div><span>IBAN</span>{BANK.iban}</div>}
                        <small>Then enter your account number or the transfer reference below so we can match your payment.</small>
                      </div>
                      <div className="field">
                        <label htmlFor="fBankRef">Your Account Number / Transfer Reference</label>
                        <input
                          type="text" id="fBankRef" placeholder="Account number or reference"
                          required={bank} minLength={4} maxLength={30}
                          value={wallet} onChange={(e) => setWallet(e.target.value)}
                        />
                      </div>
                    </div>
                    {pay === "safepay" && (
                      <p className="online-note">You&apos;ll be taken to Safepay&apos;s secure page to pay with JazzCash, Easypaisa, your bank account or a card.</p>
                    )}
                  </form>}
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
                          <Image src={it.img} alt="" width={120} height={120} />
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
                    {!open && <p role="alert" style={{ color: "var(--rust)", fontWeight: 700, margin: "0 0 12px" }}>{CLOSED_MESSAGE}</p>}
                    {open && belowMinimum && (
                      <p role="alert" style={{ color: "var(--rust)", fontWeight: 700, margin: "0 0 12px" }}>
                        Delivery orders start at {money(MIN_DELIVERY_ORDER)} — add {money(MIN_DELIVERY_ORDER - subtotal)} more, or choose pick-up.
                      </p>
                    )}
                    {error && <p role="alert" style={{ color: "var(--rust)", fontWeight: 700, margin: "0 0 12px" }}>{error}</p>}
                    {customer ? (
                      <button type="submit" form="orderForm" className="btn btn-rust" disabled={submitting || !open || belowMinimum}>{submitting ? "Placing order…" : "Place Order"}</button>
                    ) : (
                      <Link href="/login?next=/checkout" className="btn btn-rust">Log in to order</Link>
                    )}
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
