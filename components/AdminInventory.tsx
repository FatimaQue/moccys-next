"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type Row = { name: string; priceLabel: string; img: string; available: boolean; customId?: number };
type Group = { id: string; label: string; items: Row[] };
type Inventory = { categories: Group[]; addons: Group[] };
type Variant = { label: string; price: string };

const EMPTY_FORM = { category: "", name: "", price: "", description: "", img: "" };

export default function AdminInventory() {
  const [inv, setInv] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inventory", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't load the inventory.");
      setInv(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the inventory.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first fetch has to start after mount
    load();
  }, [load]);

  const flash = (msg: string) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };

  // switch items on/off: the screen updates right away and the server call confirms it
  const setAvailable = async (names: string[], available: boolean) => {
    setInv((prev) => prev && ({
      categories: prev.categories.map((g) => ({ ...g, items: g.items.map((i) => (names.includes(i.name) ? { ...i, available } : i)) })),
      addons: prev.addons.map((g) => ({ ...g, items: g.items.map((i) => (names.includes(i.name) ? { ...i, available } : i)) })),
    }));
    const res = await fetch("/api/admin/inventory", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ names, available }),
    }).catch(() => null);
    if (!res?.ok) flash("Couldn't save that change. Please try again.");
    load();
  };

  const remove = async (row: Row) => {
    if (!window.confirm(`Delete "${row.name}" from the menu? This can't be undone.`)) return;
    const res = await fetch("/api/admin/inventory", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.customId }),
    }).catch(() => null);
    flash(res?.ok ? `"${row.name}" deleted.` : "Couldn't delete that item.");
    load();
  };

  const groups = useMemo(() => {
    if (!inv) return [];
    const all = [...inv.categories, ...inv.addons];
    const needle = q.trim().toLowerCase();
    return all
      .filter((g) => group === "all" || g.id === group)
      .map((g) => ({ ...g, items: needle ? g.items.filter((i) => i.name.toLowerCase().includes(needle)) : g.items }))
      .filter((g) => g.items.length);
  }, [inv, q, group]);

  const everything = inv ? [...inv.categories, ...inv.addons].flatMap((g) => g.items) : [];
  const offCount = everything.filter((i) => !i.available).length;

  return (
    <section className="page">
      <div className="content-head">
        <div className="head-left"><h2>Inventory</h2></div>
        <button className="inv-add" onClick={() => setAdding((a) => !a)}>{adding ? "Close" : "+ Add new item"}</button>
      </div>

      {notice && <p className="inv-notice" role="status">{notice}</p>}

      {adding && inv && (
        <AddItem
          categories={inv.categories}
          onDone={(msg) => { setAdding(false); flash(msg); load(); }}
        />
      )}

      {!inv ? (
        <div className="table-card"><p className="col-empty" style={{ padding: 30 }}>{error ?? "Loading inventory…"}</p></div>
      ) : (
        <>
          <div className="rep-cards">
            <div className="rep-card"><span>Total items</span><b>{everything.length}</b><small>menu and add-ons</small></div>
            <div className="rep-card"><span>Available</span><b>{everything.length - offCount}</b><small>customers can order</small></div>
            <div className="rep-card accent"><span>Unavailable</span><b>{offCount}</b><small>hidden from ordering</small></div>
          </div>

          <div className="inv-filters">
            <input type="search" placeholder="Search items…" aria-label="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="inv-chips">
              {[{ id: "all", label: "All" }, ...inv.categories, ...inv.addons].map((g) => (
                <button key={g.id} className={group === g.id ? "on" : ""} onClick={() => setGroup(g.id)}>{g.label}</button>
              ))}
            </div>
          </div>

          {groups.length === 0 && <div className="table-card"><p className="col-empty" style={{ padding: 30 }}>No items match.</p></div>}

          {groups.map((g) => (
            <div className="table-card rep-block" key={g.id}>
              <div className="table-head inv-head">
                <h3>{g.label} <small>{g.items.filter((i) => i.available).length}/{g.items.length} available</small></h3>
                <div>
                  <button onClick={() => setAvailable(g.items.map((i) => i.name), true)}>All available</button>
                  <button onClick={() => setAvailable(g.items.map((i) => i.name), false)}>All unavailable</button>
                </div>
              </div>
              <div className="rep-scroll">
                <table>
                  <tbody>
                    {g.items.map((i) => (
                      <tr key={i.name} className={i.available ? undefined : "inv-off"}>
                        <td className="inv-img"><Image src={i.img} alt="" width={44} height={44} className="order-thumb" /></td>
                        <td><b>{i.name}</b>{i.customId && <span className="card-tag inv-new">Added</span>}</td>
                        <td>{i.priceLabel}</td>
                        <td className="inv-actions">
                          {i.customId && <button className="inv-del" onClick={() => remove(i)}>Delete</button>}
                          <span className="inv-state">{i.available ? "Available" : "Unavailable"}</span>
                          <button
                            role="switch" aria-checked={i.available} aria-label={`${i.name} available`}
                            className={"switch inv-switch" + (i.available ? " on" : "")}
                            onClick={() => setAvailable([i.name], !i.available)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function AddItem({ categories, onDone }: { categories: Group[]; onDone: (msg: string) => void }) {
  const [f, setF] = useState({ ...EMPTY_FORM, category: categories[0]?.id ?? "" });
  const [variants, setVariants] = useState<Variant[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/inventory/upload", { method: "POST", body }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) setF((p) => ({ ...p, img: data.url }));
    else setError(data?.error || "Could not upload the image.");
    setUploading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/inventory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: f.category, name: f.name, price: Number(f.price), description: f.description, img: f.img,
        options: variants.map((v) => ({ label: v.label, price: Number(v.price) })),
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok) onDone(`"${f.name}" added to the menu.`);
    else setError(data?.error || "Couldn't add the item. Please try again.");
  };

  return (
    <form className="table-card inv-form" onSubmit={submit}>
      <div className="table-head"><h3>New menu item</h3></div>
      <div className="inv-grid">
        <label>Category
          <select value={f.category} onChange={set("category")}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label>Name
          <input required maxLength={80} value={f.name} onChange={set("name")} placeholder="e.g. Bruce Wayne Burger" />
        </label>
        <label>Price (Rs.)
          <input type="number" min={1} step={1} required={variants.length === 0} disabled={variants.length > 0} value={variants.length ? variants[0].price : f.price} onChange={set("price")} placeholder="e.g. 850" />
        </label>
        <label className="inv-full">Description
          <textarea maxLength={500} rows={2} value={f.description} onChange={set("description")} placeholder="What's in it?" />
        </label>

        <div className="inv-full">
          <span className="inv-lab">Sizes / options <small>(optional: use when one item has several prices, e.g. Chicken / Beef)</small></span>
          {variants.map((v, i) => (
            <div className="inv-variant" key={i}>
              <input required placeholder="Label, e.g. Large" value={v.label} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input required type="number" min={1} step={1} placeholder="Price" value={v.price} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
              <button type="button" onClick={() => setVariants((p) => p.filter((_, j) => j !== i))} aria-label="Remove option">×</button>
            </div>
          ))}
          <button type="button" className="inv-link" onClick={() => setVariants((p) => [...p, { label: "", price: "" }])}>+ Add a size / option</button>
        </div>

        <div className="inv-full">
          <span className="inv-lab">Photo</span>
          <div className="inv-photo">
            {f.img && <Image src={f.img} alt="Preview" width={84} height={84} className="order-thumb" style={{ width: 84, height: 84 }} />}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            {uploading && <small>Uploading…</small>}
          </div>
        </div>
      </div>
      {error && <p className="signin-err" role="alert" style={{ padding: "0 20px" }}>{error}</p>}
      <div className="inv-submit"><button type="submit" disabled={busy || uploading}>{busy ? "Adding…" : "Add to menu"}</button></div>
    </form>
  );
}
