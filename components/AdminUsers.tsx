"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type User = { id: string; name: string; email: string | null; phone: string | null; via: string; joined: string; lastSignIn: string | null; orders: number; spent: number };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const money = (n: number) => "Rs. " + n.toLocaleString("en-US");

// who has registered an account (visitors have their own page)
export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [newThisWeek, setNewThisWeek] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = (await res.json()) as { users: User[] };
      setUsers(d.users); setNewThisWeek(d.users.filter((u) => Date.now() - new Date(u.joined).getTime() < 7 * 864e5).length); setError(null);
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

  return (
    <section className="page">
      <div className="content-head"><div className="head-left"><h2>Users</h2></div></div>
      {error && <p className="signin-err">{error}</p>}

      <div className="rep-cards">
        <div className="rep-card accent"><span>Registered users</span><b>{users.length}</b><small>{loaded ? `${newThisWeek} joined this week` : "Loading…"}</small></div>
      </div>

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
    </section>
  );
}
