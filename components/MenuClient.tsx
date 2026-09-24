"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { categories, type MenuItem } from "@/data/menu";
import CartPanel from "./CartPanel";
import ItemCard from "./ItemCard";
import ItemModal from "./ItemModal";

// old links from before the two burger tabs were merged
const hashAlias: Record<string, string> = { chicken: "burgers", beef: "burgers" };

export default function MenuClient() {
  const [cat, setCat] = useState(categories[0].id);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // deep link: /menu#panel-<category> opens that tab on load
  useEffect(() => {
    const raw = window.location.hash.replace("#panel-", "");
    const id = hashAlias[raw] || raw;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the URL hash is browser-only, so it can only be read after mount
    if (categories.some((c) => c.id === id)) setCat(id);
  }, []);

  const showCategory = (id: string, el?: HTMLElement) => {
    setCat(id);
    if (wrapRef.current) window.scrollTo({ top: wrapRef.current.offsetTop - 90, behavior: "smooth" });
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  const close = useCallback(() => setSelected(null), []);
  const active = categories.find((c) => c.id === cat)!;

  return (
    <div className="wrap">
      <div className="cattabs-wrap" ref={wrapRef}>
        <button className="cattabs-arw prev" aria-label="Scroll categories left" onClick={() => tabsRef.current?.scrollBy({ left: -220, behavior: "smooth" })}>
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="cattabs" ref={tabsRef}>
          {categories.map((c) => (
            <button key={c.id} className={"cattab" + (c.id === cat ? " on" : "")} onClick={(e) => showCategory(c.id, e.currentTarget)}>
              {c.label}
            </button>
          ))}
        </div>
        <button className="cattabs-arw next" aria-label="Scroll categories right" onClick={() => tabsRef.current?.scrollBy({ left: 220, behavior: "smooth" })}>
          <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="menu-layout">
        <div className="menu-main">
          <section className="menu-panel on" id={"panel-" + active.id}>
            <div className="panel-head">
              <h2 className="display">{active.title}</h2>
              <p>{active.subtitle}</p>
            </div>
            <div className="item-grid">
              {active.items.map((item) => (
                <ItemCard key={item.name} item={item} onAdd={setSelected} />
              ))}
            </div>
          </section>
        </div>
        <CartPanel />
      </div>

      {selected && <ItemModal key={selected.name} item={selected} onClose={close} />}
    </div>
  );
}
