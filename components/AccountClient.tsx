"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Address = { label: string; address: string };
type Order = { order_no: string; status: string; order_type: string; total: number; created_at: string };
type Tab = "profile" | "orders" | "addresses";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Edit Profile" },
  { id: "orders", label: "Order History" },
  { id: "addresses", label: "Saved Addresses" },
];

export default function AccountClient({
  phone: initialPhone, initialName, initialBirthday, initialAddresses, initialAvatarUrl,
}: { phone: string; initialName: string; initialBirthday: string; initialAddresses: Address[]; initialAvatarUrl: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [birthday, setBirthday] = useState(initialBirthday);
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [label, setLabel] = useState("");
  const [addr, setAddr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    if (tab !== "orders" || orders) return;
    fetch("/api/account/orders")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load your orders.");
        setOrders(d.orders);
      })
      .catch((e: Error) => setOrdersError(e.message));
  }, [tab, orders]);

  // name, birthday and addresses live on the user's own account record, so no extra table is needed
  const save = async (data: Record<string, unknown>, done: string) => {
    setSaving(true); setMsg("");
    const { error } = await supabaseBrowser().auth.updateUser({ data });
    setSaving(false);
    setMsg(error ? "Could not save. Please try again." : done);
    return !error;
  };

  const addAddress = async () => {
    if (!addr.trim()) return;
    const next = [...addresses, { label: label.trim() || "Home", address: addr.trim() }];
    if (await save({ addresses: next }, "Address saved.")) { setAddresses(next); setLabel(""); setAddr(""); }
  };
  const removeAddress = async (i: number) => {
    const next = addresses.filter((_, idx) => idx !== i);
    if (await save({ addresses: next }, "Address removed.")) setAddresses(next);
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true); setMsg("");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/account/avatar", { method: "POST", body }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok && data.url && (await save({ avatar_url: data.url }, "Photo updated."))) setAvatarUrl(data.url);
    else setMsg(data?.error || "Could not upload the photo. Please try again.");
    setUploadingAvatar(false);
  };

  const logout = async () => {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <main className="acct">
      <div className="acct-head">
        <h1>My Account</h1>
        <button type="button" className="acct-logout" onClick={logout}>Log out</button>
      </div>

      <div className="acct-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : undefined}
            onClick={() => { setTab(t.id); setMsg(""); }}>{t.label}</button>
        ))}
      </div>

      {tab === "profile" && (
        <form className="acct-form" onSubmit={(e) => { e.preventDefault(); save({ full_name: name.trim(), phone: phone.trim(), birthday }, "Profile updated."); }}>
          <div className="acct-avatar">
            <div className="acct-avatar-photo">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- a user photo, not from next/image's known set of sources
                <img src={avatarUrl} alt="" />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>
              )}
            </div>
            <label className="acct-avatar-edit" aria-label="Change photo">
              {uploadingAvatar ? (
                <span className="acct-avatar-spin" />
              ) : (
                <svg viewBox="0 0 24 24"><path d="M4 8a2 2 0 012-2h1.2l.9-1.4A2 2 0 019.8 3.6h4.4a2 2 0 011.7 1l.9 1.4H18a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" /><circle cx="12" cy="13" r="3.4" /></svg>
              )}
              <input
                type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploadingAvatar}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }}
              />
            </label>
          </div>
          <label>Full Name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Your name" /></label>
          <label>Phone Number<input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={11} inputMode="tel" placeholder="03XXXXXXXXX" /></label>
          <label>Date of Birthday<input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} /></label>
          <button type="submit" className="btn btn-rust" disabled={saving}>{saving ? "Saving…" : "Update"}</button>
        </form>
      )}

      {tab === "orders" && (
        <div className="acct-list">
          {ordersError && <p className="acct-msg err">{ordersError}</p>}
          {!ordersError && !orders && <p className="acct-empty">Loading…</p>}
          {orders && !orders.length && <p className="acct-empty">No orders yet. When you order with {phone}, it will show up here.</p>}
          {orders?.map((o) => (
            <div className="acct-order" key={o.order_no}>
              <div><strong>{o.order_no}</strong><span>{new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {o.order_type}</span></div>
              <div><em className={"st st-" + o.status}>{o.status}</em><strong>Rs. {Number(o.total).toLocaleString()}</strong></div>
            </div>
          ))}
        </div>
      )}

      {tab === "addresses" && (
        <div className="acct-list">
          {!addresses.length && <p className="acct-empty">No saved addresses yet.</p>}
          {addresses.map((a, i) => (
            <div className="acct-order" key={i}>
              <div><strong>{a.label}</strong><span>{a.address}</span></div>
              <button type="button" className="acct-x" onClick={() => removeAddress(i)} disabled={saving}>Remove</button>
            </div>
          ))}
          <div className="acct-form acct-addform">
            <label>Label<input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={30} placeholder="Home, Work…" /></label>
            <label>Address<input value={addr} onChange={(e) => setAddr(e.target.value)} maxLength={250} placeholder="House, street, area, city" /></label>
            <button type="button" className="btn btn-rust" onClick={addAddress} disabled={saving || !addr.trim()}>Add address</button>
          </div>
        </div>
      )}

      {msg && <p className={"acct-msg" + (msg.startsWith("Could not") ? " err" : "")} role="status">{msg}</p>}
    </main>
  );
}
