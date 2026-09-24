"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Phase = "pending" | "preparing" | "ready" | "out";
type Order = { id: string; customer: string; items?: string; amount?: string; tag?: string; status?: string };
type Action = "accept" | "reject" | "ready" | "dispatch";

const INITIAL: Record<Phase, Order[]> = {
  pending: [
    { id: "#123456", customer: "John Doe", items: "5 items", amount: "Rs. 4,580", tag: "New" },
    { id: "#123457", customer: "Alice Smith", items: "3 items", amount: "Rs. 2,850" },
  ],
  preparing: [
    { id: "#123450", customer: "Alice Smith", items: "3 items", amount: "Rs. 2,850" },
    { id: "#123451", customer: "Driver R. Smith", items: "2 items", amount: "Rs. 2,850" },
  ],
  ready: [{ id: "#123448", customer: "Driver Alex R.", items: "4 items", amount: "Rs. 2,850" }],
  out: [{ id: "#123448", customer: "Driver Alex R.", status: "En route" }],
};

const TABS: { phase: Phase; label: string; accent: string; icon: React.ReactNode }[] = [
  { phase: "pending", label: "New / Pending", accent: "var(--rust)",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></> },
  { phase: "preparing", label: "Preparing", accent: "var(--amber)",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></> },
  { phase: "ready", label: "Ready for Pick Up", accent: "var(--green)",
    icon: <><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></> },
  { phase: "out", label: "Out for Delivery", accent: "var(--muted)",
    icon: <><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></> },
];

const COLUMNS: Record<Phase, string[]> = {
  pending: ["Order ID", "Customer", "Items", "Amount", "Action"],
  preparing: ["Order ID", "Customer", "Items", "Amount", "Action"],
  ready: ["Order ID", "Driver", "Items", "Amount", "Action"],
  out: ["Order ID", "Driver", "Status"],
};

const ALL_ORDERS = [
  ["#123456", "John Doe", "102 Elalta, Manona, alva", "Rs. 4,580", "rust", "Pending"],
  ["#123450", "Alice Smith", "1032 Elalta, Manona, iia", "Rs. 2,850", "amber", "Preparing"],
  ["#123448", "Alice Smith", "5032 Elalta, Manona", "Rs. 2,850", "green", "Ready"],
  ["#123448", "Alice Smith", "5032 Elalta, Manona", "Rs. 2,850", "amber", "Out for Delivery"],
  ["#123441", "Alice Smith", "5032 Elalta, Manona", "Rs. 4,580", "green", "Delivered"],
];

export default function AdminClient() {
  const [page, setPage] = useState<"dashboard" | "orders">("dashboard");
  const [phase, setPhase] = useState<Phase>("pending");
  const [orders, setOrders] = useState(INITIAL);
  const [sound, setSound] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // kept for the "new order received" alert; hidden again after 4 seconds
  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const handleAction = (id: string, action: Action) => {
    setOrders((prev) => {
      const list = prev[phase];
      const idx = list.findIndex((o) => o.id === id);
      if (idx === -1) return prev;
      const order = { ...list[idx] };
      delete order.tag;
      const next = { ...prev, [phase]: list.filter((_, i) => i !== idx) };
      if (action === "accept") next.preparing = [...next.preparing, order];
      else if (action === "ready") next.ready = [...next.ready, order];
      else if (action === "dispatch") next.out = [...next.out, { ...order, status: "En route" }];
      // "reject" just drops the order
      return next;
    });
  };

  const rows = orders[phase];
  const cols = COLUMNS[phase];

  return (
    <>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <Image className="brand-logo" src="/images/Logo-01.png" alt="McCoy's" width={160} height={32} />
            <div className="brand-sub">Admin</div>
          </div>
          <nav className="nav">
            <a className={"navlink" + (page === "dashboard" ? " on" : "")} href="#" onClick={(e) => { e.preventDefault(); setPage("dashboard"); }}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
              Dashboard
            </a>
            <a className={"navlink" + (page === "orders" ? " on" : "")} href="#" onClick={(e) => { e.preventDefault(); setPage("orders"); }}>
              <svg viewBox="0 0 24 24"><path d="M3 7h18l-1.5 12.2a2 2 0 01-2 1.8H6.5a2 2 0 01-2-1.8L3 7z" /><path d="M8 7V5a4 4 0 018 0v2" /></svg>
              Orders
            </a>
          </nav>
        </aside>

        <div className="main">
          <header className="topbar">
            <h1>{page === "dashboard" ? "Dashboard — Live" : "Orders"}</h1>
            <div className="topbar-right">
              <div className="bell" onClick={() => showToast("New order received!")}>
                <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
                <span className="dot"></span>
              </div>
              <div className="profile">
                <div className="avatar">M</div>
                <span>M. Admin</span>
                <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
              </div>
            </div>
          </header>

          <div className="content">
            {page === "dashboard" ? (
              <section className="page">
                <div className="content-head">
                  <div className="head-left"><h2>Dashboard</h2></div>
                  <div className="sound-toggle">
                    Enable Sound Alerts
                    <div className={"switch" + (sound ? " on" : "")} onClick={() => setSound((s) => !s)}></div>
                  </div>
                </div>

                <div className="tabbar">
                  {TABS.map((t) => (
                    <button
                      key={t.phase}
                      className={"tab" + (t.phase === phase ? " active" : "")}
                      style={{ "--tab-accent": t.accent } as React.CSSProperties}
                      onClick={() => setPhase(t.phase)}
                    >
                      <svg viewBox="0 0 24 24">{t.icon}</svg>
                      <span className="tab-label">{t.label}</span>
                      <span className="tab-count">{orders[t.phase].length}</span>
                    </button>
                  ))}
                </div>

                <div className="table-card phase-panel">
                  <table>
                    <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr><td colSpan={cols.length} className="col-empty">No orders</td></tr>
                      ) : rows.map((o) => (
                        <tr key={o.id + o.customer}>
                          <td>{o.id}{o.tag && <> <span className="card-tag">{o.tag}</span></>}</td>
                          <td>{o.customer}</td>
                          {phase === "out" ? (
                            <td><span className="card-status">{o.status}</span></td>
                          ) : (
                            <>
                              <td>{o.items}</td>
                              <td className="amount">{o.amount}</td>
                              <td>
                                {phase === "pending" && (
                                  <div className="card-actions">
                                    <button className="btn-accept" onClick={() => handleAction(o.id, "accept")}>Accept</button>
                                    <button className="btn-reject" onClick={() => handleAction(o.id, "reject")}>Reject</button>
                                  </div>
                                )}
                                {phase === "preparing" && <button className="btn-ready" onClick={() => handleAction(o.id, "ready")}>Mark Ready</button>}
                                {phase === "ready" && <button className="btn-ready" onClick={() => handleAction(o.id, "dispatch")}>Send Out</button>}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <section className="page">
                <div className="content-head"><div className="head-left"><h2>Orders</h2></div></div>
                <div className="table-card">
                  <div className="table-head"><h3>All Orders</h3></div>
                  <table>
                    <thead><tr><th>Order ID</th><th>Customer</th><th>Address</th><th>Amount</th><th>Live Status</th></tr></thead>
                    <tbody>
                      {ALL_ORDERS.map(([id, who, addr, amt, tone, label], i) => (
                        <tr key={i}>
                          <td>{id}</td><td>{who}</td><td>{addr}</td><td className="amount">{amt}</td>
                          <td><span className={"pill pill-" + tone}>{label}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      <div className={"toast" + (toast ? " show" : "")}>
        <span className="dot"></span>
        <span>{toast ?? "New order received!"}</span>
        <button onClick={() => setToast(null)}>&times;</button>
      </div>
    </>
  );
}
