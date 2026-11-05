"use client";

import { useState } from "react";

export type DriverInfo = { id: string; name: string; phone: string | null; username: string | null; active: boolean; passwordSet: boolean };

// add, edit, disable/enable and remove riders
export default function AdminDrivers({ drivers, onChange }: { drivers: DriverInfo[]; onChange: () => void }) {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [editing, setEditing] = useState<DriverInfo | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [eUser, setEUser] = useState("");
  const [ePhone, setEPhone] = useState("");

  const fail = async (res: Response | null, fallback: string) =>
    setMsg({ text: res ? ((await res.json().catch(() => ({}))) as { error?: string }).error ?? fallback : "Couldn't reach the server.", bad: true });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/drivers", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, phone }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setMsg({ text: `${username} added. Ask them to open the sign-in page, choose "First time? Set up your account", and enter this username and their phone number to set a password.` });
      setUsername(""); setPhone(""); onChange();
    } else {
      await fail(res, "Could not add the rider.");
    }
  };

  const act = async (d: DriverInfo, action: "disable" | "enable") => {
    if (action === "disable" && !confirm(`Disable ${d.username ?? d.name}? They will be signed out and can't receive orders.`)) return;
    const res = await fetch(`/api/admin/drivers/${d.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    }).catch(() => null);
    if (res?.ok) setMsg({ text: `${d.username ?? d.name} updated.` });
    else await fail(res, "Couldn't update that rider.");
    onChange();
  };

  const startEdit = (d: DriverInfo) => { setEditing(d); setEUser(d.username ?? d.name); setEPhone(d.phone ?? ""); setEditErr(null); setMsg(null); };
  const closeEdit = () => { setEditing(null); setEditErr(null); };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setEditErr(null);
    const res = await fetch(`/api/admin/drivers/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "edit", username: eUser, phone: ePhone }),
    }).catch(() => null);
    setSaving(false);
    if (res?.ok) { closeEdit(); setMsg({ text: "Saved." }); onChange(); return; }
    setEditErr(res ? ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save." : "Couldn't reach the server.");
  };

  const remove = async (d: DriverInfo) => {
    if (!confirm(`Remove ${d.username ?? d.name}? This can't be undone.`)) return;
    const res = await fetch(`/api/admin/drivers/${d.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) { setMsg({ text: `${d.username ?? d.name} removed.` }); onChange(); } else await fail(res, "Couldn't remove.");
  };

  return (
    <section className="page">
      <div className="content-head"><div className="head-left"><h2>Riders</h2></div></div>
      {editing && (
        <div className="inv-pop" onMouseDown={(e) => e.target === e.currentTarget && closeEdit()}>
          <div className="inv-pop-box inv-pop-sm" role="dialog" aria-modal="true">
            <button className="inv-pop-x" aria-label="Close" onClick={closeEdit}>×</button>
            <form className="drv-pop-form" onSubmit={saveEdit}>
              <h3>Edit rider</h3>
              <label htmlFor="eUser">Username</label>
              <input id="eUser" required minLength={3} maxLength={20} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={eUser} onChange={(e) => setEUser(e.target.value)} autoFocus />
              <label htmlFor="ePhone">Phone number</label>
              <input id="ePhone" type="tel" required placeholder="03001234567" value={ePhone} onChange={(e) => setEPhone(e.target.value)} />
              {editErr && <p className="signin-err" role="alert">{editErr}</p>}
              <div className="inv-pop-btns">
                <button type="button" className="inv-btn ghost" onClick={closeEdit}>Cancel</button>
                <button type="submit" className="inv-btn primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="table-card">
        <form className="drv-form" onSubmit={add}>
          <div>
            <label htmlFor="nName">Username</label>
            <input id="nName" required minLength={3} maxLength={20} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="ali.rider" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label htmlFor="nPhone">Phone number</label>
            <input id="nPhone" type="tel" placeholder="03001234567" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button className="drv-add" type="submit" disabled={busy}>{busy ? "Adding…" : "Add rider"}</button>
        </form>
        {msg && <p className={msg.bad ? "signin-err" : ""} style={{ margin: 0, padding: "10px 20px" }}>{msg.text}</p>}
        <table>
          <thead><tr><th>Username</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {drivers.length === 0 ? (
              <tr><td colSpan={4} className="col-empty">No riders yet</td></tr>
            ) : drivers.map((d) => (
              <tr key={d.id}>
                <td>{d.username ?? d.name}</td>
                <td>{d.phone ?? "—"}</td>
                <td>
                  <span className={"pill pill-" + (!d.active ? "rust" : d.passwordSet ? "green" : "amber")}>
                    {!d.active ? "Disabled" : d.passwordSet ? "Active" : "Waiting for password setup"}
                  </span>
                </td>
                <td>
                  <div className="drv-actions">
                    <button className="inv-btn edit" onClick={() => startEdit(d)}>Edit</button>
                    {d.active
                      ? <button className="danger" onClick={() => act(d, "disable")}>Disable</button>
                      : <button onClick={() => act(d, "enable")}>Enable</button>}
                    <button className="inv-btn danger-o" onClick={() => remove(d)}>Remove</button>
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
