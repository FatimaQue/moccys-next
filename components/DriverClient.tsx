"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type DriverOrder = {
  dbId: number; id: string; status: "out" | "delivered"; customer: string; mobile: string; address: string;
  notes: string | null; items: string[]; total: number; cash: boolean; deliveredAt: string | null;
};

const POLL_MS = 15000;
const money = (n: number) => "Rs. " + n.toLocaleString("en-US");
const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");

export default function DriverClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null); // order waiting for the second tap
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/orders", { cache: "no-store" });
      if (res.status === 401) { router.replace("/admin/login"); return; }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { name: string; orders: DriverOrder[] };
      setName(data.name);
      setOrders(data.orders);
      setError(null);
    } catch {
      setError("Couldn't refresh. Retrying…");
    } finally {
      setLoaded(true);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first fetch has to start after mount
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const deliver = async (id: number) => {
    setBusy(id);
    const res = await fetch(`/api/driver/orders/${id}`, { method: "PATCH" }).catch(() => null);
    setBusy(null);
    setConfirming(null);
    if (!res?.ok) setError("Couldn't mark that order delivered. Please try again.");
    load();
  };

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace("/admin/login");
  };

  const active = orders.filter((o) => o.status === "out");
  const done = orders.filter((o) => o.status === "delivered");

  return (
    <div className="drv">
      <header className="drv-top">
        <Image className="brand-logo" src="/images/Logo-01.png" alt="McCoy's" width={120} height={24} />
        <div className="drv-who">
          <span>{name}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className="drv-main">
        <h1 className="display">My deliveries <span className="drv-count">{active.length}</span></h1>
        {error && <p className="signin-err" role="alert">{error}</p>}

        {active.length === 0 && <p className="drv-empty">{!loaded ? "Loading…" : "No deliveries assigned right now."}</p>}

        {active.map((o) => (
          <article className="drv-card" key={o.dbId}>
            <div className="drv-row">
              <strong>{o.id}</strong>
              <span className="drv-total">{money(o.total)}</span>
            </div>
            <p className="drv-name">{o.customer}</p>
            <p className="drv-addr">{o.address || "No address given"}</p>
            {o.notes && <p className="drv-notes">“{o.notes}”</p>}
            <ul className="drv-items">{o.items.map((i) => <li key={i}>{i}</li>)}</ul>
            <p className={"drv-pay" + (o.cash ? " cash" : "")}>{o.cash ? `Collect ${money(o.total)} in cash` : "Already paid — nothing to collect"}</p>

            <div className="drv-links">
              <a href={`tel:${o.mobile}`}>Call</a>
              {o.address && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.address)}`} target="_blank" rel="noreferrer">Navigate</a>}
            </div>

            {confirming === o.dbId ? (
              <div className="drv-confirm">
                <button className="drv-yes" disabled={busy === o.dbId} onClick={() => deliver(o.dbId)}>{busy === o.dbId ? "Saving…" : "Yes, delivered"}</button>
                <button className="drv-no" onClick={() => setConfirming(null)}>Cancel</button>
              </div>
            ) : (
              <button className="drv-done" onClick={() => setConfirming(o.dbId)}>Mark delivered</button>
            )}
          </article>
        ))}

        {done.length > 0 && (
          <>
            <h2 className="drv-sub">Delivered today · {done.length}</h2>
            {done.map((o) => (
              <div className="drv-past" key={o.dbId}>
                <span>{o.id} · {o.customer}</span>
                <span>{clock(o.deliveredAt)}</span>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
