"use client";

import { useCallback, useEffect, useState } from "react";

type Report = {
  date: string; today: string;
  summary: { orders: number; revenue: number; average: number; deliveredRevenue: number; deliveryFees: number; itemsSold: number; rejected: number };
  byStatus: Record<"pending" | "preparing" | "ready" | "out" | "delivered" | "rejected", number>;
  byType: Record<"delivery" | "pickup", number>;
  byPay: Record<"cod" | "easypaisa" | "safepay" | "bank", number>;
  payTotals: { cod: number; easypaisa: number; safepay: number; bank: number };
  payments: { orderNo: string; time: string; customer: string; mobile: string; method: keyof typeof METHOD; account: string | null; amount: number; status: string }[];
  items: { name: string; qty: number; revenue: number; addon: boolean }[];
  days: { date: string; revenue: number; orders: number }[];
};

const money = (n: number) => "Rs. " + n.toLocaleString("en-US");
const shift = (d: string, by: number) => new Date(new Date(d + "T00:00:00Z").getTime() + by * 86_400_000).toISOString().slice(0, 10);
const nice = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" });
const METHOD = { cod: "Cash on delivery", easypaisa: "EasyPaisa", safepay: "Online (Safepay)", jazzcash: "JazzCash", bank: "Bank transfer" };
const PAY_PILL: Record<string, string> = { delivered: "green", rejected: "rust" };

const STATUS_LABEL = { pending: "Pending", preparing: "Preparing", ready: "Ready", out: "Out for delivery", delivered: "Delivered", rejected: "Rejected" };

export default function AdminReports() {
  const [date, setDate] = useState(""); // empty = today, as the server sees it
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reports" + (date ? `?date=${date}` : ""), { cache: "no-store" });
      if (!res.ok) throw new Error();
      setReport(await res.json());
      setError(null);
    } catch {
      setError("Couldn't load the report. Retrying…");
    }
  }, [date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the fetch has to start after mount and whenever the day changes
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const r = report;
  const isToday = !!r && r.date === r.today;
  const maxDay = r ? Math.max(1, ...r.days.map((d) => d.revenue)) : 1;
  const mains = r?.items.filter((i) => !i.addon) ?? [];
  const addons = r?.items.filter((i) => i.addon) ?? [];
  const topQty = Math.max(1, ...(r?.items.map((i) => i.qty) ?? [1]));

  const itemTable = (title: string, rows: typeof mains) => (
    <div className="table-card rep-block">
      <div className="table-head"><h3>{title}</h3></div>
      <table>
        <thead><tr><th>Item</th><th>Sold</th><th>Revenue</th><th className="rep-share-h"></th></tr></thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="col-empty">Nothing sold</td></tr>
          ) : rows.map((i) => (
            <tr key={i.name}>
              <td><b>{i.name}</b></td>
              <td>{i.qty}</td>
              <td className="amount">{money(i.revenue)}</td>
              <td className="rep-share"><span style={{ width: `${(i.qty / topQty) * 100}%` }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="page">
      <div className="content-head">
        <div className="head-left"><h2>Daily Report</h2></div>
        <div className="rep-nav">
          <button aria-label="Previous day" disabled={!r} onClick={() => r && setDate(shift(r.date, -1))}>‹</button>
          <input type="date" aria-label="Report date" value={r?.date ?? ""} max={r?.today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button aria-label="Next day" disabled={!r || isToday} onClick={() => r && setDate(shift(r.date, 1))}>›</button>
          <button className="rep-today" disabled={!r || isToday} onClick={() => setDate("")}>Today</button>
        </div>
      </div>

      {!r ? (
        <div className="table-card"><p className="col-empty" style={{ padding: 30 }}>{error ?? "Loading report…"}</p></div>
      ) : (
        <>
          {error && <p className="col-empty">{error}</p>}
          <div className="rep-cards">
            <div className="rep-card accent"><span>Revenue</span><b>{money(r.summary.revenue)}</b><small>{isToday ? "so far today" : nice(r.date)}</small></div>
            <div className="rep-card"><span>Orders</span><b>{r.summary.orders}</b><small>{r.summary.rejected ? `${r.summary.rejected} rejected` : "none rejected"}</small></div>
            <div className="rep-card"><span>Average order</span><b>{money(r.summary.average)}</b><small>per order</small></div>
            <div className="rep-card"><span>Items sold</span><b>{r.summary.itemsSold}</b><small>excluding add-ons</small></div>
            <div className="rep-card"><span>Delivered</span><b>{money(r.summary.deliveredRevenue)}</b><small>completed orders</small></div>
            <div className="rep-card"><span>Delivery fees</span><b>{money(r.summary.deliveryFees)}</b><small>included in revenue</small></div>
          </div>

          <div className="rep-grid">
            <div className="table-card rep-block">
              <div className="table-head"><h3>Last 7 days · revenue</h3></div>
              <div className="rep-bars" role="img" aria-label="Revenue for the last seven days">
                {r.days.map((d) => (
                  <button key={d.date} className={"rep-bar" + (d.date === r.date ? " on" : "")} onClick={() => setDate(d.date === r.today ? "" : d.date)} title={`${nice(d.date)}: ${money(d.revenue)}, ${d.orders} orders`}>
                    <em>{d.revenue ? money(d.revenue).replace("Rs. ", "") : ""}</em>
                    <span style={{ height: `${Math.max(d.revenue ? 4 : 0, (d.revenue / maxDay) * 100)}%` }} />
                    <i>{nice(d.date).split(" ")[0]}</i>
                  </button>
                ))}
              </div>
            </div>

            <div className="table-card rep-block">
              <div className="table-head"><h3>Breakdown</h3></div>
              <div className="rep-break">
                <h4>Status</h4>
                {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((k) => (
                  <div key={k}><span>{STATUS_LABEL[k]}</span><b>{r.byStatus[k]}</b></div>
                ))}
                <h4>Type</h4>
                <div><span>Delivery</span><b>{r.byType.delivery}</b></div>
                <div><span>Pick-up</span><b>{r.byType.pickup}</b></div>
                <h4>Payment</h4>
                <div><span>Cash on delivery</span><b>{r.byPay.cod}</b></div>
                <div><span>EasyPaisa</span><b>{r.byPay.easypaisa}</b></div>
                <div><span>Online (Safepay)</span><b>{r.byPay.safepay}</b></div>
                <div><span>Bank transfer</span><b>{r.byPay.bank}</b></div>
              </div>
            </div>
          </div>

          <div className="table-card rep-block">
            <div className="table-head"><h3>Payments · {nice(r.date)}</h3></div>
            <div className="rep-paytotals">
              <div><span>Cash on delivery</span><b>{money(r.payTotals.cod)}</b></div>
              <div><span>EasyPaisa</span><b>{money(r.payTotals.easypaisa)}</b></div>
              <div><span>Online (Safepay)</span><b>{money(r.payTotals.safepay)}</b></div>
              <div><span>Bank transfer</span><b>{money(r.payTotals.bank)}</b></div>
              <div><span>Total</span><b>{money(r.payTotals.cod + r.payTotals.easypaisa + r.payTotals.safepay + r.payTotals.bank)}</b></div>
            </div>
            <div className="rep-scroll">
              <table>
                <thead><tr><th>Time</th><th>Order</th><th>Customer</th><th>Method</th><th>Account</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {r.payments.length === 0 ? (
                    <tr><td colSpan={7} className="col-empty">No payments</td></tr>
                  ) : r.payments.map((p) => (
                    <tr key={p.orderNo} className={p.status === "rejected" ? "rep-void" : undefined}>
                      <td>{timeOf(p.time)}</td>
                      <td>{p.orderNo}</td>
                      <td>{p.customer}<br /><small className="rep-sub">{p.mobile}</small></td>
                      <td>{METHOD[p.method]}</td>
                      <td>{p.account ?? <small className="rep-sub">Paid to rider</small>}</td>
                      <td className="amount">{money(p.amount)}</td>
                      <td><span className={"pill pill-" + (PAY_PILL[p.status] ?? "amber")}>{STATUS_LABEL[p.status as keyof typeof STATUS_LABEL]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {itemTable(`Items sold · ${nice(r.date)}`, mains)}
          {addons.length > 0 && itemTable("Add-ons sold", addons)}
        </>
      )}
    </section>
  );
}
