"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type Variant = { label: string; price: string };
type Row = {
  name: string; priceLabel: string; img: string; available: boolean;
  kind: "builtin" | "custom" | "addon";
  customId?: number;            // set for items added on this page
  price: number; description: string; options?: { label: string; price: number }[];
  hidden: boolean;              // a built-in item that was removed from the menu
  edited: boolean;              // a built-in item whose price / photo / description was changed
  canEdit: boolean;
};
type Group = { id: string; label: string; items: Row[] };
type Inventory = { categories: Group[]; addons: Group[]; needsSetup?: boolean };
type Editing = { row: Row; groupId: string };

const EMPTY_FORM = { category: "", name: "", price: "", description: "", img: "" };

const send = (method: string, body: object) =>
  fetch("/api/admin/inventory", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);

export default function AdminInventory() {
  const [inv, setInv] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; body: string; ok: string; danger?: boolean; run: () => void } | null>(null);

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

  // popups close with Escape and stop the page behind them from scrolling
  const popupOpen = adding || !!editing || !!confirm;
  useEffect(() => {
    if (!popupOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setConfirm(null); setAdding(false); setEditing(null); } };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [popupOpen]);

  // switch items on/off: the screen updates right away and the server call confirms it
  const setAvailable = async (names: string[], available: boolean) => {
    setInv((prev) => prev && ({
      ...prev,
      categories: prev.categories.map((g) => ({ ...g, items: g.items.map((i) => (names.includes(i.name) ? { ...i, available } : i)) })),
      addons: prev.addons.map((g) => ({ ...g, items: g.items.map((i) => (names.includes(i.name) ? { ...i, available } : i)) })),
    }));
    const res = await send("PATCH", { names, available });
    if (!res?.ok) flash("Couldn't save that change. Please try again.");
    load();
  };

  const doRemove = async (row: Row) => {
    const added = row.kind === "custom";
    const res = await send("DELETE", added ? { id: row.customId } : { builtIn: row.name });
    flash(res?.ok ? `"${row.name}" ${added ? "deleted" : "removed"}.` : "Couldn't remove that item.");
    load();
  };

  const remove = (row: Row) => {
    const added = row.kind === "custom";
    setConfirm({
      title: added ? "Delete this item?" : "Remove this item?",
      body: added
        ? `"${row.name}" will be deleted from the menu. This can't be undone.`
        : `"${row.name}" will disappear from the menu. You can restore it later from this page.`,
      ok: added ? "Delete" : "Remove", danger: true,
      run: () => doRemove(row),
    });
  };

  const doBuiltInAction = async (row: Row, action: "restore" | "reset") => {
    const res = await send("PUT", { builtIn: row.name, [action]: true });
    flash(res?.ok ? (action === "restore" ? `"${row.name}" is back on the menu.` : `"${row.name}" reset.`) : "Couldn't save that change.");
    load();
  };

  const builtInAction = (row: Row, action: "restore" | "reset") => {
    if (action === "restore") return doBuiltInAction(row, action);
    setConfirm({
      title: "Reset this item?", body: `"${row.name}" will go back to its original price, photo and description.`,
      ok: "Reset", run: () => doBuiltInAction(row, action),
    });
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

  const everything = inv ? [...inv.categories, ...inv.addons].flatMap((g) => g.items).filter((i) => !i.hidden) : [];
  const offCount = everything.filter((i) => !i.available).length;

  const closeForm = () => { setAdding(false); setEditing(null); };

  return (
    <section className="page">
      <div className="content-head">
        <div className="head-left"><h2>Inventory</h2></div>
        <button className="inv-add" onClick={() => { setEditing(null); setAdding((a) => !a); }}>{adding ? "Close" : "+ Add new item"}</button>
      </div>

      {notice && <p className="inv-notice" role="status">{notice}</p>}

      {inv?.needsSetup && (
        <p className="inv-notice" role="alert">
          To edit or remove the built-in menu items, run the updated supabase/inventory.sql in the Supabase SQL Editor, then refresh this page.
        </p>
      )}

      {inv && (adding || editing) && (
        <div className="inv-pop" onMouseDown={(e) => e.target === e.currentTarget && closeForm()}>
          <div className="inv-pop-box" role="dialog" aria-modal="true">
            <button className="inv-pop-x" aria-label="Close" onClick={closeForm}>×</button>
            <ItemForm
              key={editing ? editing.row.name : "new"}
              categories={inv.categories}
              editing={editing}
              onCancel={closeForm}
              onDone={(msg) => { closeForm(); flash(msg); load(); }}
            />
          </div>
        </div>
      )}

      {confirm && (
        <div className="inv-pop" onMouseDown={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div className="inv-pop-box inv-pop-sm" role="alertdialog" aria-modal="true">
            <h3>{confirm.title}</h3>
            <p>{confirm.body}</p>
            <div className="inv-pop-btns">
              <button className="inv-btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className={"inv-btn " + (confirm.danger ? "danger" : "primary")} onClick={() => { confirm.run(); setConfirm(null); }}>{confirm.ok}</button>
            </div>
          </div>
        </div>
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

          {groups.map((g) => {
            const live = g.items.filter((i) => !i.hidden);
            return (
            <div className="table-card rep-block" key={g.id}>
              <div className="table-head inv-head">
                <h3>{g.label} <small>{live.filter((i) => i.available).length}/{live.length} available</small></h3>
                <div>
                  <button onClick={() => setAvailable(live.map((i) => i.name), true)}>All available</button>
                  <button onClick={() => setAvailable(live.map((i) => i.name), false)}>All unavailable</button>
                </div>
              </div>
              <div className="rep-scroll">
                <table>
                  <tbody>
                    {g.items.map((i) => (
                      <tr key={i.name} className={i.available && !i.hidden ? undefined : "inv-off"}>
                        <td className="inv-img"><Image src={i.img} alt="" width={44} height={44} className="order-thumb" /></td>
                        <td>
                          <b>{i.name}</b>
                          {i.kind === "custom" && <span className="card-tag inv-new">Added</span>}
                          {i.edited && !i.hidden && <span className="card-tag inv-new">Edited</span>}
                        </td>
                        <td>{i.priceLabel}</td>
                        <td className="inv-actions">
                          {i.hidden ? (
                            <>
                              <span className="inv-state">Removed</span>
                              <button className="inv-btn edit" onClick={() => builtInAction(i, "restore")}>Restore</button>
                            </>
                          ) : (
                            <>
                              {i.canEdit && <button className="inv-btn edit" onClick={() => { setAdding(false); setEditing({ row: i, groupId: g.id }); }}>Edit</button>}
                              {i.edited && <button className="inv-btn ghost" onClick={() => builtInAction(i, "reset")}>Reset</button>}
                              {(i.kind === "custom" || i.canEdit) && <button className="inv-btn danger-o" onClick={() => remove(i)}>{i.kind === "custom" ? "Delete" : "Remove"}</button>}
                              <span className="inv-state">{i.available ? "Available" : "Unavailable"}</span>
                              <button
                                role="switch" aria-checked={i.available} aria-label={`${i.name} available`}
                                className={"switch inv-switch" + (i.available ? " on" : "")}
                                onClick={() => setAvailable([i.name], !i.available)}
                              />
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}
        </>
      )}
    </section>
  );
}

// one form for adding an item and for editing one. Items added here can change everything; built-in items keep
// their name and category (customers' carts and past orders refer to them by name) but can change price, photo and description.
function ItemForm({ categories, editing, onCancel, onDone }: {
  categories: Group[]; editing: Editing | null; onCancel: () => void; onDone: (msg: string) => void;
}) {
  const row = editing?.row;
  const builtIn = !!row && row.kind !== "custom";       // built-in item or add-on
  const fixedSizes = !!row && row.kind === "builtin" && !!row.options?.length; // sizes can have new prices but not be added or removed

  const [f, setF] = useState({
    ...EMPTY_FORM,
    category: editing?.groupId ?? categories[0]?.id ?? "",
    name: row?.name ?? "", price: row ? String(row.price) : "", description: row?.description ?? "", img: row?.img ?? "",
  });
  const [variants, setVariants] = useState<Variant[]>(row?.options?.map((o) => ({ label: o.label, price: String(o.price) })) ?? []);
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
    const common = {
      name: f.name, price: Number(f.price), description: f.description, img: f.img,
      options: variants.map((v) => ({ label: v.label, price: Number(v.price) })),
    };
    const res = !row
      ? await send("POST", { ...common, category: f.category })
      : builtIn
        ? await send("PUT", { ...common, builtIn: row.name })
        : await send("PUT", { ...common, id: row.customId, category: f.category });
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (res?.ok) onDone(row ? `"${row.name}" updated.` : `"${f.name}" added to the menu.`);
    else setError(data?.error || (row ? "Couldn't save the changes. Please try again." : "Couldn't add the item. Please try again."));
  };

  return (
    <form className="table-card inv-form" onSubmit={submit}>
      <div className="table-head"><h3>{row ? `Edit ${row.name}` : "New menu item"}</h3></div>
      <div className="inv-grid">
        {!builtIn && (
          <label>Category
            <select value={f.category} onChange={set("category")}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
        )}
        <label>Name
          <input required maxLength={80} value={f.name} onChange={set("name")} disabled={builtIn} placeholder="e.g. Bruce Wayne Burger" />
        </label>
        <label>Price (Rs.)
          <input type="number" min={1} step={1} required={variants.length === 0} disabled={variants.length > 0} value={variants.length ? variants[0].price : f.price} onChange={set("price")} placeholder="e.g. 850" />
        </label>
        {row?.kind !== "addon" && (
          <label className="inv-full">Description
            <textarea maxLength={500} rows={2} value={f.description} onChange={set("description")} placeholder="What's in it?" />
          </label>
        )}

        {(!builtIn || fixedSizes) && (
          <div className="inv-full">
            <span className="inv-lab">Sizes / options {!fixedSizes && <small>(optional: use when one item has several prices, e.g. Chicken / Beef)</small>}</span>
            {variants.map((v, i) => (
              <div className="inv-variant" key={i}>
                <input required placeholder="Label, e.g. Large" value={v.label} readOnly={fixedSizes} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input required type="number" min={1} step={1} placeholder="Price" value={v.price} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                {!fixedSizes && <button type="button" onClick={() => setVariants((p) => p.filter((_, j) => j !== i))} aria-label="Remove option">×</button>}
              </div>
            ))}
            {!fixedSizes && <button type="button" className="inv-link" onClick={() => setVariants((p) => [...p, { label: "", price: "" }])}>+ Add a size / option</button>}
          </div>
        )}

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
      <div className="inv-submit">
        <button type="submit" disabled={busy || uploading}>{busy ? "Saving…" : row ? "Save changes" : "Add to menu"}</button>
        {row && <button type="button" className="inv-cancel" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
