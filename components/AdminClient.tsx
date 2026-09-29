"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import AdminDrivers, { type DriverInfo } from "./AdminDrivers";
import AdminInventory from "./AdminInventory";
import AdminReports from "./AdminReports";

type Phase = "pending" | "preparing" | "ready" | "out" | "delivered";
type Status = Phase | "rejected";
// one order as /api/admin/orders returns it
type Order = {
  dbId: number; id: string; status: Status; customer: string; items: string; total: number; address: string;
  createdAt: string; name: string; img?: string; details: string[];
  driver: string | null; deliveredAt: string | null;
};
type Driver = DriverInfo;
type Action = "accept" | "reject" | "ready" | "dispatch" | "delivered";

const timeOf = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

const NEXT_STATUS: Record<Action, Status> = { accept: "preparing", reject: "rejected", ready: "ready", dispatch: "out", delivered: "delivered" };
// one line of the bell's feed, as /api/admin/notifications returns it
type Ev = { id: number; order_no: string; kind: string; message: string; created_at: string };
const ALERT_KINDS = new Set(["new_order", "delivered"]); // the rest are the admin's own moves: listed, but no alert
const KIND_COLOR: Record<string, string> = { new_order: "var(--rust)", accepted: "var(--amber)", ready: "var(--green)", out: "var(--muted)", delivered: "var(--green)", rejected: "var(--rust)" };
const SEEN_KEY = "moccys-admin-last-seen-event";
const TITLE = "mccoy's — Admin";
const POLL_MS = 8000;

const ago = (iso: string, now: number) => {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`;
};
const NEW_MINUTES = 15;

const money = (n: number) => "Rs. " + n.toLocaleString("en-US");

// short two-note chime for a new order, generated so there is no audio file to ship
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.start(t); o.stop(t + 0.32);
    });
  } catch { /* audio blocked until the page has been interacted with */ }
}

const TABS: { phase: Phase; label: string; accent: string; icon: React.ReactNode }[] = [
  { phase: "pending", label: "New / Pending", accent: "var(--rust)",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></> },
  { phase: "preparing", label: "Preparing", accent: "var(--amber)",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></> },
  { phase: "ready", label: "Ready for Pick Up", accent: "var(--green)",
    icon: <><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></> },
  { phase: "out", label: "Out for Delivery", accent: "var(--muted)",
    icon: <><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></> },
  { phase: "delivered", label: "Delivered", accent: "var(--green)",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></> },
];

const PILL: Record<Status, [string, string]> = {
  pending: ["rust", "Pending"], preparing: ["amber", "Preparing"], ready: ["green", "Ready"],
  out: ["amber", "Out for Delivery"], delivered: ["green", "Delivered"], rejected: ["rust", "Rejected"],
};

export default function AdminClient() {
  const [page, setPage] = useState<"dashboard" | "orders" | "reports" | "inventory" | "drivers">("dashboard");
  const router = useRouter();
  const [all, setAll] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pick, setPick] = useState<Record<number, string>>({}); // driver chosen per order before "Send Out"
  const [now, setNow] = useState(0); // refreshed with every poll so "New" badges age out
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [events, setEvents] = useState<Ev[]>([]);
  const [lastSeen, setLastSeen] = useState<number | null>(null); // newest event the admin has looked at; null until the first load
  const [bellOpen, setBellOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  const topId = useRef<number | null>(null); // newest event already handled, so only genuinely new ones alert

  // shown for new orders and deliveries; hidden again after 4 seconds
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      if (res.status === 401) { router.replace("/admin/login"); return; }
      if (!res.ok) throw new Error();
      const { orders } = (await res.json()) as { orders: Order[] };
      setAll(orders);
      setNow(Date.now());
      setLoadError(null);
    } catch {
      setLoadError("Couldn't load orders. Retrying…");
    } finally {
      setLoaded(true);
    }
  }, [router]);

  // the bell feed; anything newer than the last poll that matters raises the toast, chime and browser alert
  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const { events: list } = (await res.json()) as { events: Ev[] };
      const newest = list[0]?.id ?? 0;
      const fresh = topId.current === null ? [] : list.filter((e) => e.id > topId.current! && ALERT_KINDS.has(e.kind));
      topId.current = Math.max(topId.current ?? 0, newest);
      setEvents(list);
      setNow(Date.now());
      setLastSeen((prev) => {
        if (prev !== null) return prev;
        // first visit on this browser: start from "everything so far is read"
        try { const s = Number(localStorage.getItem(SEEN_KEY)); if (s) return s; localStorage.setItem(SEEN_KEY, String(newest)); } catch { /* storage blocked */ }
        return newest;
      });
      if (fresh.length) {
        showToast(fresh.length === 1 ? fresh[0].message : `${fresh.length} new updates`);
        if (soundRef.current && fresh.some((e) => e.kind === "new_order")) chime();
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          fresh.slice(0, 3).forEach((e) => new Notification(e.kind === "new_order" ? "New order" : "Order delivered", { body: e.message, tag: `order-event-${e.id}` }));
        }
      }
    } catch { /* the next poll will try again */ }
  }, [showToast]);

  // no realtime channel: the board just re-reads the orders and the feed every few seconds
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first fetch has to start after mount
    load();
    loadEvents();
    const t = setInterval(() => { load(); loadEvents(); }, POLL_MS);
    return () => clearInterval(t);
  }, [load, loadEvents]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the browser permission can only be read after mount
    setPerm("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  const [newSince, setNewSince] = useState(0); // events above this id are shown as unread while the panel is open
  const unread = lastSeen === null ? 0 : events.filter((e) => e.id > lastSeen).length; // every update counts, not only the alerting ones
  useEffect(() => { document.title = unread ? `(${unread}) ${TITLE}` : TITLE; }, [unread]);

  const openBell = () => {
    const opening = !bellOpen;
    setBellOpen(opening);
    if (opening && events[0]) {
      setNewSince(lastSeen ?? events[0].id); // remember what was unread so those rows keep their red dot until the panel closes
      setLastSeen(events[0].id);
      try { localStorage.setItem(SEEN_KEY, String(events[0].id)); } catch { /* storage blocked */ }
    }
  };

  const enableBrowserAlerts = async () => {
    if (!("Notification" in window)) return;
    setPerm(await Notification.requestPermission());
  };

  const loadDrivers = useCallback(() => {
    fetch("/api/admin/drivers", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { drivers: [] }))
      .then((d: { drivers: Driver[] }) => setDrivers(d.drivers))
      .catch(() => {});
  }, []);
  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);
  const activeDrivers = useMemo(() => drivers.filter((d) => d.active), [drivers]);

  const handleAction = async (dbId: number, action: Action) => {
    const status = NEXT_STATUS[action];
    const driverId = pick[dbId] ?? (activeDrivers.length === 1 ? activeDrivers[0].id : undefined);
    if (action === "dispatch" && !driverId) { showToast("Pick a driver first."); return; }
    const driver = drivers.find((d) => d.id === driverId)?.name ?? null;
    setAll((prev) => prev.map((o) => (o.dbId === dbId ? { ...o, status, ...(action === "dispatch" ? { driver } : {}) } : o))); // move it right away, confirm below
    const res = await fetch(`/api/admin/orders/${dbId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, driverId }),
    }).catch(() => null);
    if (!res?.ok) showToast("Couldn't update that order. Please try again.");
    load();
  };

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace("/admin/login");
  };

  const orders = useMemo(() => {
    const g: Record<Phase, Order[]> = { pending: [], preparing: [], ready: [], out: [], delivered: [] };
    // oldest first so the kitchen works through them in the order they came in
    [...all].reverse().forEach((o) => { if (o.status in g) g[o.status as Phase].push(o); });
    g.delivered.sort((a, b) => (b.deliveredAt ?? "").localeCompare(a.deliveredAt ?? "")); // latest delivery first
    return g;
  }, [all]);

  const isNew = (o: Order) => o.status === "pending" && now - new Date(o.createdAt).getTime() < NEW_MINUTES * 60_000;

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return all;
    return all.filter((o) => o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q));
  }, [all, orderSearch]);

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
            <a className={"navlink" + (page === "reports" ? " on" : "")} href="#" onClick={(e) => { e.preventDefault(); setPage("reports"); }}>
              <svg viewBox="0 0 24 24"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
              Reports
            </a>
            <a className={"navlink" + (page === "inventory" ? " on" : "")} href="#" onClick={(e) => { e.preventDefault(); setPage("inventory"); }}>
              <svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></svg>
              Inventory
            </a>
            <a className={"navlink" + (page === "drivers" ? " on" : "")} href="#" onClick={(e) => { e.preventDefault(); setPage("drivers"); }}>
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
              Riders
            </a>
          </nav>
        </aside>

        <div className="main">
          <header className="topbar">
            <h1>{page === "dashboard" ? "Dashboard — Live" : page === "reports" ? "Reports" : page === "inventory" ? "Inventory" : page === "drivers" ? "Riders" : "Orders"}</h1>
            <div className="topbar-right">
              <div className="bell-wrap">
                <button className="bell" aria-label={unread ? `${unread} unread notifications` : "Notifications"} aria-expanded={bellOpen} onClick={openBell}>
                  <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></svg>
                  {unread > 0 && <span className="badge">{unread > 9 ? "9+" : unread}</span>}
                </button>
                {bellOpen && (
                  <>
                    <div className="bell-backdrop" onClick={() => setBellOpen(false)} />
                    <div className="bell-panel" role="dialog" aria-label="Notifications">
                      <div className="bell-head">
                        <strong>Notifications</strong>
                        {perm === "default" && <button onClick={enableBrowserAlerts}>Enable desktop alerts</button>}
                        {perm === "denied" && <span className="bell-note">Alerts blocked in browser</span>}
                      </div>
                      {events.length === 0 ? (
                        <p className="bell-empty">Nothing yet. New orders and deliveries will show up here.</p>
                      ) : (
                        <ul>
                          {events.map((e) => (
                            <li key={e.id} className={e.id > newSince ? "unread" : ""}>
                              <span className="bell-dot" style={{ background: e.id > newSince ? "var(--rust)" : KIND_COLOR[e.kind] ?? "var(--muted)" }} />
                              <div>
                                <p>{e.message}</p>
                                <small>{ago(e.created_at, now)}</small>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="profile">
                <div className="avatar">M</div>
                <span>M. Admin</span>
                <button className="signout" onClick={signOut}>Sign out</button>
              </div>
            </div>
          </header>

          <div className="content">
            {page === "inventory" ? (
              <AdminInventory />
            ) : page === "drivers" ? (
              <AdminDrivers drivers={drivers} onChange={loadDrivers} />
            ) : page === "reports" ? (
              <AdminReports />
            ) : page === "dashboard" ? (
              <section className="page">
                <div className="content-head">
                  <div className="head-left"><h2>Dashboard</h2></div>
                  <div className="sound-toggle">
                    Enable Sound Alerts
                    <div className={"switch" + (sound ? " on" : "")} onClick={() => setSound((s) => !s)}></div>
                  </div>
                </div>

                <div className="board">
                  {TABS.map((t) => (
                    <div className="col" data-col={t.phase} key={t.phase}>
                      <div className="col-head">
                        <h3><svg viewBox="0 0 24 24">{t.icon}</svg> {t.label}</h3>
                        <span className="col-count">{orders[t.phase].length}</span>
                      </div>
                      <div className="col-body">
                        {orders[t.phase].length === 0 ? (
                          <p className="col-empty">{!loaded ? "Loading…" : loadError ?? "No orders"}</p>
                        ) : orders[t.phase].map((o) => (
                          <div className="card" key={o.dbId}>
                            <div className="card-top">
                              <span className="card-id">{o.id}</span>
                              {isNew(o) && <span className="card-tag">New</span>}
                            </div>
                            <div className="order-cell">
                              {o.img && <Image className="order-thumb" src={o.img} alt={o.name ?? ""} width={36} height={36} />}
                              <span className="order-name">{o.name}</span>
                            </div>
                            <div className="card-cust">{o.customer}</div>
                            <ul className="order-details">{o.details?.map((d) => <li key={d}>{d}</li>)}</ul>

                            {t.phase === "delivered" ? (
                              <div className="card-status">Delivered by {o.driver ?? "—"} · {timeOf(o.deliveredAt)}</div>
                            ) : t.phase === "out" ? (
                              <div className="card-status">En route · {o.driver ?? "no driver"}</div>
                            ) : (
                              <div className="card-meta">
                                <span className="card-items">{o.items}</span>
                                <span className="card-price">{money(o.total)}</span>
                              </div>
                            )}

                            {t.phase === "pending" && (
                              <div className="card-actions">
                                <button className="btn-accept" onClick={() => handleAction(o.dbId, "accept")}>Accept</button>
                                <button className="btn-reject" onClick={() => handleAction(o.dbId, "reject")}>Reject</button>
                              </div>
                            )}
                            {t.phase === "preparing" && <button className="btn-ready" onClick={() => handleAction(o.dbId, "ready")}>Mark Ready</button>}
                            {t.phase === "ready" && (
                              <div className="card-actions">
                                <select className="driver-pick" value={pick[o.dbId] ?? (activeDrivers.length === 1 ? activeDrivers[0].id : "")} onChange={(e) => setPick((p) => ({ ...p, [o.dbId]: e.target.value }))}>
                                  <option value="">{activeDrivers.length ? "Pick rider…" : "No riders yet"}</option>
                                  {activeDrivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                <button className="btn-ready" onClick={() => handleAction(o.dbId, "dispatch")}>Send Out</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section className="page">
                <div className="content-head"><div className="head-left"><h2>Orders</h2></div></div>
                <div className="table-card">
                  <div className="table-head rep-payhead">
                    <h3>All Orders</h3>
                    <div className="rep-filters">
                      <input type="text" placeholder="Search by customer or order ID…" value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} aria-label="Search orders" />
                    </div>
                  </div>
                  <table>
                    <thead><tr><th>Order ID</th><th>Customer</th><th>Address</th><th>Amount</th><th>Rider</th><th>Live Status</th></tr></thead>
                    <tbody>
                      {all.length === 0 ? (
                        <tr><td colSpan={6} className="col-empty">{!loaded ? "Loading orders…" : loadError ?? "No orders yet"}</td></tr>
                      ) : filteredOrders.length === 0 ? (
                        <tr><td colSpan={6} className="col-empty">No orders match your search</td></tr>
                      ) : filteredOrders.map((o) => (
                        <tr key={o.dbId}>
                          <td>{o.id}</td><td>{o.customer}</td><td>{o.address}</td><td className="amount">{money(o.total)}</td>
                          <td>{o.driver ?? "—"}</td>
                          <td><span className={"pill pill-" + PILL[o.status][0]}>{PILL[o.status][1]}</span></td>
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
