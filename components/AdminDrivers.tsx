"use client";

import { useState } from "react";

export type DriverInfo = { id: string; name: string; phone: string | null; active: boolean; pinSet: boolean };

// add drivers, reset a forgotten PIN, switch a driver off/on
export default function AdminDrivers({ drivers, onChange }: { drivers: DriverInfo[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/drivers", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setMsg({ text: `${name} added. Ask them to open the sign-in page, choose Driver → “First time? Set your PIN”.` });
      setName(""); setPhone(""); onChange();
    } else {
      setMsg({ text: res ? ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Could not add the driver." : "Couldn't reach the server.", bad: true });
    }
  };

  const act = async (d: DriverInfo, action: "reset-pin" | "disable" | "enable") => {
    if (action === "reset-pin" && !confirm(`Reset ${d.name}'s PIN? They will choose a new one the next time they sign in.`)) return;
    if (action === "disable" && !confirm(`Disable ${d.name}? They will be signed out and can't receive orders.`)) return;
    const res = await fetch(`/api/admin/drivers/${d.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    }).catch(() => null);
    setMsg(res?.ok ? { text: action === "reset-pin" ? `${d.name}'s PIN was reset.` : `${d.name} updated.` } : { text: "Couldn't update that driver.", bad: true });
    onChange();
  };

  return (
    <section className="page">
      <div className="content-head"><div className="head-left"><h2>Drivers</h2></div></div>
      <div className="table-card">
        <form className="drv-form" onSubmit={add}>
          <div>
            <label htmlFor="nName">Full name</label>
            <input id="nName" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="nPhone">Phone number</label>
            <input id="nPhone" type="tel" placeholder="03001234567" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button className="btn-ready" type="submit" disabled={busy}>{busy ? "Adding…" : "Add driver"}</button>
          {msg && <p className={msg.bad ? "signin-err" : ""} style={{ margin: 0, flexBasis: "100%" }}>{msg.text}</p>}
        </form>
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {drivers.length === 0 ? (
              <tr><td colSpan={4} className="col-empty">No drivers yet</td></tr>
            ) : drivers.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.phone ?? "—"}</td>
                <td>
                  <span className={"pill pill-" + (!d.active ? "rust" : d.pinSet ? "green" : "amber")}>
                    {!d.active ? "Disabled" : d.pinSet ? "Active" : "Waiting for PIN setup"}
                  </span>
                </td>
                <td>
                  <div className="drv-actions">
                    {d.pinSet && <button onClick={() => act(d, "reset-pin")}>Reset PIN</button>}
                    {d.active
                      ? <button className="danger" onClick={() => act(d, "disable")}>Disable</button>
                      : <button onClick={() => act(d, "enable")}>Enable</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
