"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type User = { id: string; name: string; email: string | null; phone: string | null; via: string; joined: string; lastSignIn: string | null; orders: number; spent: number };
type Stat = { visitors: number; views: number };
type Visitor = { visitor_id: string; first_seen: string; last_seen: string; views: number; device: string | null; customer: string | null; last_path: string; ip: string | null; country: string | null; city: string | null; browser: string | null; os: string | null };
type Count = { name: string; visitors: number; times?: number };
type Stats = {
  today: Stat; week: Stat; month: Stat;
  daily: { day: string; visitors: number; views: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  devices: { device: string; visitors: number }[];
  browsers: Count[]; systems: Count[];
  places: { country: string; city: string; visitors: number }[];
  sources: { source: string; visitors: number }[];
  funnel: { visitors: number; viewed_item: number; added: number; checkout: number; ordered: number };
  items_viewed: Count[]; items_added: Count[];
  searches: { term: string; times: number; visitors: number }[];
  visitors: Visitor[];
};

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const shortDay = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const countryName = (c: string | null) => { try { return c && c !== "—" ? regionNames?.of(c) ?? c : "Unknown"; } catch { return c ?? "Unknown"; } };
const place = (country: string | null, city: string | null) => [city, country ? countryName(country) : null].filter(Boolean).join(", ") || "—";
const money = (n: number) => "Rs. " + n.toLocaleString("en-US");

// who has an account, and who has been visiting the site (anonymous visitors included)
export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState(30);
  const [newThisWeek, setNewThisWeek] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"users" | "visitors">("users");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as { users: User[]; stats: Stats | null; days: number };
      setUsers(d.users); setNewThisWeek(d.users.filter((u) => Date.now() - new Date(u.joined).getTime() < 7 * 864e5).length); setStats(d.stats); setDays(d.days); setError(null);
    } catch {
      setError("Couldn't load users. Please refresh.");
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first fetch has to start after mount
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => [u.name, u.email, u.phone].some((v) => v?.toLowerCase().includes(s)));
  }, [users, q]);

  const max = stats ? Math.max(1, ...stats.daily.map((d) => d.views)) : 1;
  const signedInVisitors = stats?.visitors.filter((v) => v.customer).length ?? 0;

  return (
    <section className="page">
      <div className="content-head"><div className="head-left"><h2>Users</h2></div></div>
      {error && <p className="signin-err">{error}</p>}

      <div className="rep-cards">
        <div className="rep-card accent"><span>Registered users</span><b>{users.length}</b><small>{loaded ? `${newThisWeek} joined this week` : "Loading…"}</small></div>
        <div className="rep-card"><span>Visitors today</span><b>{stats ? stats.today.visitors : "—"}</b><small>{stats ? `${stats.today.views} page views` : "tracking not set up"}</small></div>
        <div className="rep-card"><span>Visitors · 7 days</span><b>{stats ? stats.week.visitors : "—"}</b><small>{stats ? `${stats.week.views} page views` : ""}</small></div>
        <div className="rep-card"><span>Visitors · {days} days</span><b>{stats ? stats.month.visitors : "—"}</b><small>{stats ? `${signedInVisitors} of them signed in` : ""}</small></div>
      </div>

      {loaded && !stats && !error && (
        <div className="table-card rep-block">
          <div className="table-head"><h3>Turn on visitor tracking</h3></div>
          <p className="col-empty" style={{ textAlign: "left", padding: "18px 20px", lineHeight: 1.6 }}>
            Visits are already being collected once the <b>page_views</b> table exists. Open Supabase → SQL Editor, paste the contents of
            <b> supabase/page_views.sql</b> from the project, and run it once. Then refresh this page.
          </p>
        </div>
      )}

      {stats && (
        <>
          <div className="table-card rep-block">
            <div className="table-head"><h3>Page views · last {days} days</h3></div>
            <div className="rep-bars" role="img" aria-label="Page views per day">
              {stats.daily.map((d) => (
                <div key={d.day} className="rep-bar" title={`${shortDay(d.day)}: ${d.visitors} visitors, ${d.views} views`}>
                  <i>{d.views || ""}</i>
                  <span style={{ height: `${Math.max(d.views ? 4 : 0, (d.views / max) * 100)}%` }} />
                  <em>{shortDay(d.day)}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="rep-grid">
            <div className="table-card rep-block">
              <div className="table-head"><h3>Top pages</h3></div>
              <table>
                <thead><tr><th>Page</th><th>Views</th><th>Visitors</th></tr></thead>
                <tbody>
                  {stats.top_pages.length === 0 ? <tr><td colSpan={3} className="col-empty">No visits yet</td></tr>
                    : stats.top_pages.map((p) => <tr key={p.path}><td>{p.path}</td><td className="amount">{p.views}</td><td>{p.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="table-card rep-block">
              <div className="table-head"><h3>Devices</h3></div>
              <table>
                <thead><tr><th>Device</th><th>Visitors</th></tr></thead>
                <tbody>
                  {stats.devices.length === 0 ? <tr><td colSpan={2} className="col-empty">No visits yet</td></tr>
                    : stats.devices.map((d) => <tr key={d.device}><td style={{ textTransform: "capitalize" }}>{d.device}</td><td className="amount">{d.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rep-grid">
            <div className="table-card rep-block">
              <div className="table-head"><h3>What visitors do · last {days} days</h3></div>
              <table>
                <thead><tr><th>Step</th><th>Visitors</th><th>of all visitors</th></tr></thead>
                <tbody>
                  {([["Visited the site", stats.funnel.visitors], ["Opened an item", stats.funnel.viewed_item], ["Added to cart", stats.funnel.added], ["Reached checkout", stats.funnel.checkout], ["Placed an order", stats.funnel.ordered]] as [string, number][]).map(([label, n]) => (
                    <tr key={label}><td>{label}</td><td className="amount">{n}</td><td>{stats.funnel.visitors ? Math.round((n / stats.funnel.visitors) * 100) + "%" : "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-card rep-block">
              <div className="table-head"><h3>Where they come from</h3></div>
              <table>
                <thead><tr><th>Source</th><th>Visitors</th></tr></thead>
                <tbody>
                  {stats.sources.length === 0 ? <tr><td colSpan={2} className="col-empty">No visits yet</td></tr>
                    : stats.sources.map((x) => <tr key={x.source}><td>{x.source}</td><td className="amount">{x.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rep-grid">
            <div className="table-card rep-block">
              <div className="table-head"><h3>Most viewed items</h3></div>
              <table>
                <thead><tr><th>Item</th><th>Opened</th><th>Visitors</th></tr></thead>
                <tbody>
                  {stats.items_viewed.length === 0 ? <tr><td colSpan={3} className="col-empty">Nothing yet</td></tr>
                    : stats.items_viewed.map((x) => <tr key={x.name}><td>{x.name}</td><td className="amount">{x.times}</td><td>{x.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="table-card rep-block">
              <div className="table-head"><h3>Most added to cart</h3></div>
              <table>
                <thead><tr><th>Item</th><th>Added</th><th>Visitors</th></tr></thead>
                <tbody>
                  {stats.items_added.length === 0 ? <tr><td colSpan={3} className="col-empty">Nothing yet</td></tr>
                    : stats.items_added.map((x) => <tr key={x.name}><td>{x.name}</td><td className="amount">{x.times}</td><td>{x.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rep-grid">
            <div className="table-card rep-block">
              <div className="table-head"><h3>What they search for</h3></div>
              <table>
                <thead><tr><th>Search</th><th>Times</th><th>Visitors</th></tr></thead>
                <tbody>
                  {stats.searches.length === 0 ? <tr><td colSpan={3} className="col-empty">No searches yet</td></tr>
                    : stats.searches.map((x) => <tr key={x.term}><td>{x.term}</td><td className="amount">{x.times}</td><td>{x.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="table-card rep-block">
              <div className="table-head"><h3>Where they are</h3></div>
              <table>
                <thead><tr><th>Location</th><th>Visitors</th></tr></thead>
                <tbody>
                  {stats.places.length === 0 ? <tr><td colSpan={2} className="col-empty">No visits yet</td></tr>
                    : stats.places.map((x) => <tr key={x.country + x.city}><td>{place(x.country, x.city)}</td><td className="amount">{x.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rep-grid">
            <div className="table-card rep-block">
              <div className="table-head"><h3>Browsers</h3></div>
              <table>
                <thead><tr><th>Browser</th><th>Visitors</th></tr></thead>
                <tbody>
                  {stats.browsers.length === 0 ? <tr><td colSpan={2} className="col-empty">No visits yet</td></tr>
                    : stats.browsers.map((x) => <tr key={x.name}><td>{x.name}</td><td className="amount">{x.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="table-card rep-block">
              <div className="table-head"><h3>Operating systems</h3></div>
              <table>
                <thead><tr><th>System</th><th>Visitors</th></tr></thead>
                <tbody>
                  {stats.systems.length === 0 ? <tr><td colSpan={2} className="col-empty">No visits yet</td></tr>
                    : stats.systems.map((x) => <tr key={x.name}><td>{x.name}</td><td className="amount">{x.visitors}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="role-tabs" style={{ maxWidth: 360 }}>
        <button className={tab === "users" ? "on" : ""} onClick={() => setTab("users")}>Registered users</button>
        <button className={tab === "visitors" ? "on" : ""} onClick={() => setTab("visitors")} disabled={!stats}>Visitors</button>
      </div>

      {tab === "users" ? (
        <div className="table-card">
          <div className="table-head rep-payhead">
            <h3>Registered users ({shown.length})</h3>
            <div className="rep-filters">
              <input type="text" placeholder="Search name, email or mobile…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
            </div>
          </div>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Signed up with</th><th>Joined</th><th>Last sign-in</th><th>Orders</th><th>Spent</th></tr></thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={8} className="col-empty">{!loaded ? "Loading users…" : q ? "No users match your search" : "No users yet"}</td></tr>
              ) : shown.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td><td>{u.email ?? "—"}</td><td>{u.phone ?? "—"}</td>
                  <td><span className={"pill pill-" + (u.via === "Email" ? "amber" : "green")}>{u.via}</span></td>
                  <td>{when(u.joined)}</td><td>{when(u.lastSignIn)}</td>
                  <td>{u.orders}</td><td className="amount">{u.spent ? money(u.spent) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-head"><h3>Recent visitors · last {days} days</h3></div>
          <table>
            <thead><tr><th>Visitor</th><th>IP address</th><th>Location</th><th>Signed in as</th><th>Device</th><th>Pages viewed</th><th>First visit</th><th>Last visit</th><th>Last page</th></tr></thead>
            <tbody>
              {!stats || stats.visitors.length === 0 ? (
                <tr><td colSpan={9} className="col-empty">No visits yet</td></tr>
              ) : stats.visitors.map((v) => (
                <tr key={v.visitor_id}>
                  <td>#{v.visitor_id.slice(0, 6)}</td>
                  <td>{v.ip ?? "—"}</td>
                  <td>{place(v.country, v.city)}</td>
                  <td>{v.customer ?? <span className="rep-sub">Guest</span>}</td>
                  <td><span style={{ textTransform: "capitalize" }}>{v.device ?? "—"}</span>{v.browser || v.os ? <div className="rep-sub">{[v.browser, v.os].filter(Boolean).join(" · ")}</div> : null}</td>
                  <td>{v.views}</td><td>{when(v.first_seen)}</td><td>{when(v.last_seen)}</td><td>{v.last_path}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rep-sub" style={{ padding: "12px 20px" }}>Each browser gets a random ID; its latest IP address and location are shown. A name only shows if they were signed in during a visit.</p>
        </div>
      )}
    </section>
  );
}
