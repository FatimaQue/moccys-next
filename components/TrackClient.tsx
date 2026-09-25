"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { money } from "./CartProvider";

// checkout saves this so the tracking page can open the customer's order without asking again
export const LAST_ORDER_KEY = "mccoysLastOrder";

type Status = "pending" | "preparing" | "ready" | "out" | "delivered" | "rejected";
type Tracked = {
  order_no: string; status: Status; order_type: "delivery" | "pickup"; total: number; created_at: string;
  order_items: { name: string; price: number; qty: number; is_addon: boolean }[];
};

const STEPS = {
  delivery: ["Order received", "Preparing", "Out for delivery", "Delivered"],
  pickup: ["Order received", "Preparing", "Ready for pick-up", "Collected"],
};
const HINT: Record<Status, string> = {
  pending: "We've got your order and the kitchen will confirm it shortly.",
  preparing: "Your food is being prepared.",
  ready: "Your order is ready and will be on its way soon.",
  out: "Your order is on its way.",
  delivered: "Enjoy your meal!",
  rejected: "Sorry, we couldn't take this order. Please call us or place a new one.",
};
// ready sits between preparing and the last two steps: for pick-up it IS the third step
const stepOf = (s: Status, type: "delivery" | "pickup") =>
  ({ pending: 0, preparing: 1, ready: type === "pickup" ? 2 : 1, out: 2, delivered: 3, rejected: -1 })[s];

export default function TrackClient() {
  const [orderNo, setOrderNo] = useState("");
  const [mobile, setMobile] = useState("");
  const [order, setOrder] = useState<Tracked | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const creds = useRef<{ orderNo: string; mobile: string } | null>(null);

  const fetchOrder = useCallback(async (c: { orderNo: string; mobile: string }, quiet = false) => {
    if (!quiet) setBusy(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!quiet) { setOrder(null); setError(data.error || "Something went wrong. Please try again."); }
        return;
      }
      creds.current = c;
      setOrder(data.order);
      setError(null);
      try { localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(c)); } catch { /* storage blocked: tracking still works */ }
    } catch {
      if (!quiet) setError("Network problem. Please check your connection and try again.");
    } finally {
      if (!quiet) setBusy(false);
    }
  }, []);

  // arriving from checkout (or coming back later): open the last order straight away
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_ORDER_KEY) || "null");
      if (saved?.orderNo && saved?.mobile) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage can only be read after mount
        setOrderNo(saved.orderNo); setMobile(saved.mobile);
        fetchOrder(saved);
      }
    } catch { /* nothing saved */ }
  }, [fetchOrder]);

  // keep the progress live until the order is finished
  useEffect(() => {
    if (!order || order.status === "delivered" || order.status === "rejected") return;
    const t = setInterval(() => creds.current && fetchOrder(creds.current, true), 8000);
    return () => clearInterval(t);
  }, [order, fetchOrder]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder({ orderNo: orderNo.trim(), mobile: mobile.trim() });
  };

  const step = order ? stepOf(order.status, order.order_type) : 0;
  const steps = order ? STEPS[order.order_type] : STEPS.delivery;

  return (
    <>
      <header className="tnav">
        <Link href="/"><Image className="tlogo" src="/images/Logo-01.png" alt="McCoy's" width={160} height={32} /></Link>
        <Link href="/menu" className="tback">Back to Menu</Link>
      </header>

      <main className="twrap">
        <h1 className="tdisplay">Track your <span>order</span></h1>

        {order ? (
          <section className="tcard">
            <div className="thead">
              <div>
                <span className="tlabel">Order</span>
                <b className="tno">{order.order_no}</b>
              </div>
              <div className="tright">
                <span className="tlabel">Total</span>
                <b>{money(order.total)}</b>
              </div>
            </div>

            {order.status === "rejected" ? (
              <p className="tcancel" role="status">{HINT.rejected}</p>
            ) : (
              <>
                <ol className="tsteps">
                  {steps.map((label, i) => (
                    <li key={label} className={i < step || order.status === "delivered" ? "done" : i === step ? "now" : ""}>
                      <span className="tdot">{i < step || order.status === "delivered" ? "✓" : i + 1}</span>
                      <span className="tstep">{label}</span>
                    </li>
                  ))}
                </ol>
                <p className="thint" role="status">{HINT[order.status]}</p>
              </>
            )}

            <div className="titems">
              <h2>Order summary</h2>
              {order.order_items.map((i, idx) => (
                <div className="titem" key={idx}>
                  <span>{i.qty}x {i.name}{i.is_addon ? " (add-on)" : ""}</span>
                  <span>{money(i.price * i.qty)}</span>
                </div>
              ))}
            </div>

            <button type="button" className="tlink" onClick={() => { setOrder(null); creds.current = null; try { localStorage.removeItem(LAST_ORDER_KEY); } catch { /* ignore */ } }}>
              Track a different order
            </button>
          </section>
        ) : (
          <form className="tcard" onSubmit={submit}>
            <p className="tsub">Enter your order number and the mobile number you ordered with.</p>
            <label htmlFor="tNo">Order number</label>
            <input id="tNo" inputMode="numeric" placeholder="e.g. 482913" required value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
            <label htmlFor="tMob">Mobile number</label>
            <input id="tMob" type="tel" placeholder="03XXXXXXXXX" pattern="03[0-9]{9}" required value={mobile} onChange={(e) => setMobile(e.target.value)} />
            {error && <p className="terr" role="alert">{error}</p>}
            <button type="submit" className="tbtn" disabled={busy}>{busy ? "Looking…" : "Track order"}</button>
          </form>
        )}
      </main>
    </>
  );
}
