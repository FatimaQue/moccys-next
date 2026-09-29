"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Report = {
  date: string; today: string;
  summary: {
    orders: number; revenue: number; netRevenue: number; safepayFees: number; average: number;
    deliveredRevenue: number; deliveryFees: number; itemsSold: number; rejected: number;
    avgPrepMins: number | null; avgDeliveryMins: number | null; timedOrders: number;
  };
  previous: { revenue: number; orders: number; average: number };
  byStatus: Record<"pending" | "preparing" | "ready" | "out" | "delivered" | "rejected", number>;
  byType: Record<"delivery" | "pickup", number>;
  byPay: Record<"cod" | "easypaisa" | "safepay" | "bank", number>;
  payTotals: { cod: number; easypaisa: number; safepay: number; bank: number };
  payments: { orderNo: string; time: string; customer: string; mobile: string; method: keyof typeof METHOD; orderType: string; amount: number; status: string }[];
  items: { name: string; qty: number; revenue: number; addon: boolean }[];
  days: { date: string; revenue: number; orders: number }[];
  hours: { hour: number; orders: number; revenue: number }[];
};

const money = (n: number) => "Rs. " + n.toLocaleString("en-US");
const shift = (d: string, by: number) => new Date(new Date(d + "T00:00:00Z").getTime() + by * 86_400_000).toISOString().slice(0, 10);
const nice = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" });
const METHOD = { cod: "Cash on delivery", easypaisa: "EasyPaisa", safepay: "Online (Safepay)", jazzcash: "JazzCash", bank: "Bank transfer" };
const PAY_PILL: Record<string, string> = { delivered: "green", rejected: "rust" };

const STATUS_LABEL = { pending: "Pending", preparing: "Preparing", ready: "Ready", out: "Out for delivery", delivered: "Delivered", rejected: "Rejected" };

const fmtMins = (m: number | null) => m === null ? "—" : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
const hourLabel = (h: number) => h === 0 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`;

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return <span className="rep-delta">±0%</span>;
  return <span className={"rep-delta " + (pct > 0 ? "up" : "down")}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span>;
}

export default function AdminReports() {
  const [date, setDate] = useState(""); // empty = today, as the server sees it
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paySearch, setPaySearch] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payType, setPayType] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [exporting, setExporting] = useState(false);

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
  const maxHour = r ? Math.max(1, ...r.hours.map((h) => h.orders)) : 1;
  const mains = useMemo(() => (r?.items.filter((i) => !i.addon) ?? []).filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase())), [r, itemSearch]);
  const addonsAll = useMemo(() => r?.items.filter((i) => i.addon) ?? [], [r]);
  const addons = useMemo(() => addonsAll.filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase())), [addonsAll, itemSearch]);
  const topQty = Math.max(1, ...(r?.items.map((i) => i.qty) ?? [1]));

  const filteredPayments = useMemo(() => {
    if (!r) return [];
    const q = paySearch.trim().toLowerCase();
    return r.payments.filter((p) => {
      if (payMethod && p.method !== payMethod) return false;
      if (payType && p.orderType !== payType) return false;
      if (q && !p.customer.toLowerCase().includes(q) && !p.mobile.includes(q) && !p.orderNo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [r, paySearch, payMethod, payType]);
  const filtersActive = !!(paySearch || payMethod || payType);

  const exportPdf = async () => {
    if (!r) return;
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Moccy's — Daily Report", 14, 16);
      doc.setFontSize(10);
      doc.setTextColor(90, 100, 133);
      doc.text(nice(r.date) + (filtersActive ? " (filtered)" : ""), 14, 22);
      doc.setTextColor(10, 18, 48);
      doc.text(
        `Revenue ${money(r.summary.revenue)}   Net ${money(r.summary.netRevenue)}   Orders ${r.summary.orders}   Avg order ${money(r.summary.average)}`,
        14, 29,
      );
      autoTable(doc, {
        startY: 35,
        head: [["Time", "Order", "Customer", "Mobile", "Method", "Type", "Amount", "Status"]],
        body: filteredPayments.map((p) => [
          timeOf(p.time), p.orderNo, p.customer, p.mobile, METHOD[p.method], p.orderType,
          money(p.amount), STATUS_LABEL[p.status as keyof typeof STATUS_LABEL] ?? p.status,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [10, 18, 48] },
      });
      doc.save(`moccys-report-${r.date}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const itemTable = (title: string, rows: typeof mains, emptyMsg: string) => (
    <div className="table-card rep-block">
      <div className="table-head"><h3>{title}</h3></div>
      <table>
        <thead><tr><th>Item</th><th>Sold</th><th>Revenue</th><th className="rep-share-h"></th></tr></thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="col-empty">{emptyMsg}</td></tr>
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
            <div className="rep-card accent">
              <span>Revenue</span>
              <b>{money(r.summary.revenue)} <Delta cur={r.summary.revenue} prev={r.previous.revenue} /></b>
              <small>{isToday ? "so far today" : nice(r.date)} · net {money(r.summary.netRevenue)}{r.summary.safepayFees > 0 ? ` (−${money(r.summary.safepayFees)} fees)` : ""}</small>
            </div>
            <div className="rep-card">
              <span>Orders</span>
              <b>{r.summary.orders} <Delta cur={r.summary.orders} prev={r.previous.orders} /></b>
              <small>{r.summary.rejected ? `${r.summary.rejected} rejected` : "none rejected"}</small>
            </div>
            <div className="rep-card">
              <span>Average order</span>
              <b>{money(r.summary.average)} <Delta cur={r.summary.average} prev={r.previous.average} /></b>
              <small>per order</small>
            </div>
            <div className="rep-card"><span>Items sold</span><b>{r.summary.itemsSold}</b><small>excluding add-ons</small></div>
            <div className="rep-card"><span>Delivered</span><b>{money(r.summary.deliveredRevenue)}</b><small>completed orders</small></div>
            <div className="rep-card"><span>Delivery fees</span><b>{money(r.summary.deliveryFees)}</b><small>included in revenue</small></div>
            <div className="rep-card"><span>Avg prep time</span><b>{fmtMins(r.summary.avgPrepMins)}</b><small>order placed → out for delivery</small></div>
            <div className="rep-card"><span>Avg delivery time</span><b>{fmtMins(r.summary.avgDeliveryMins)}</b><small>{r.summary.timedOrders ? `${r.summary.timedOrders} delivered orders` : "out for delivery → delivered"}</small></div>
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
                <div><span>Online (Safepay)</span><b>{r.byPay.safepay}</b></div>
              </div>
            </div>
          </div>

          <div className="table-card rep-block">
            <div className="table-head"><h3>Busy hours · {nice(r.date)}</h3></div>
            <div className="rep-bars rep-hours" role="img" aria-label="Orders by hour of day">
              {r.hours.map((h) => (
                <div key={h.hour} className="rep-bar" title={`${hourLabel(h.hour)}: ${h.orders} orders, ${money(h.revenue)}`}>
                  <span style={{ height: `${Math.max(h.orders ? 6 : 0, (h.orders / maxHour) * 100)}%` }} />
                  <i>{hourLabel(h.hour)}</i>
                </div>
              ))}
            </div>
          </div>

          <div className="table-card rep-block">
            <div className="table-head rep-payhead">
              <h3>Payments · {nice(r.date)}</h3>
              <div className="rep-filters">
                <input type="text" placeholder="Search customer, order #, mobile…" value={paySearch} onChange={(e) => setPaySearch(e.target.value)} />
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} aria-label="Filter by payment method">
                  <option value="">All methods</option>
                  <option value="cod">Cash on delivery</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="safepay">Online (Safepay)</option>
                  <option value="bank">Bank transfer</option>
                </select>
                <select value={payType} onChange={(e) => setPayType(e.target.value)} aria-label="Filter by order type">
                  <option value="">All types</option>
                  <option value="delivery">Delivery</option>
                  <option value="pickup">Pick-up</option>
                </select>
                <button className="rep-export" onClick={exportPdf} disabled={exporting || r.payments.length === 0}>{exporting ? "Exporting…" : "Export PDF"}</button>
              </div>
            </div>
            <div className="rep-paytotals">
              <div><span>Cash on delivery</span><b>{money(r.payTotals.cod)}</b></div>
              <div><span>Online (Safepay)</span><b>{money(r.payTotals.safepay)}</b></div>
              <div><span>Total</span><b>{money(r.payTotals.cod + r.payTotals.easypaisa + r.payTotals.safepay + r.payTotals.bank)}</b></div>
            </div>
            <div className="rep-scroll">
              <table>
                <thead><tr><th>Time</th><th>Order</th><th>Customer</th><th>Method</th><th>Amount</th><th>Paid</th><th>Status</th></tr></thead>
                <tbody>
                  {r.payments.length === 0 ? (
                    <tr><td colSpan={7} className="col-empty">No payments</td></tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr><td colSpan={7} className="col-empty">No payments match your filters</td></tr>
                  ) : filteredPayments.map((p) => (
                    <tr key={p.orderNo} className={p.status === "rejected" ? "rep-void" : undefined}>
                      <td>{timeOf(p.time)}</td>
                      <td>{p.orderNo}</td>
                      <td>{p.customer}<br /><small className="rep-sub">{p.mobile}</small></td>
                      <td>{METHOD[p.method]}</td>
                      <td className="amount">{money(p.amount)}</td>
                      <td>
                        {p.status === "rejected" ? (
                          <span className="pill pill-rust">Voided</span>
                        ) : p.method === "safepay" || p.method === "jazzcash" || p.status === "delivered" ? (
                          <span className="pill pill-green">Paid</span>
                        ) : (
                          <span className="pill pill-amber">Pending</span>
                        )}
                      </td>
                      <td><span className={"pill pill-" + (PAY_PILL[p.status] ?? "amber")}>{STATUS_LABEL[p.status as keyof typeof STATUS_LABEL]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rep-itemsearch">
            <input type="text" placeholder="Search items…" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
          </div>
          {itemTable(`Items sold · ${nice(r.date)}`, mains, itemSearch ? "No items match your search" : "Nothing sold")}
          {addonsAll.length > 0 && itemTable("Add-ons sold", addons, "No items match your search")}
        </>
      )}
    </section>
  );
}
