"use client";

import { showcase } from "@/data/home";
import type { MenuItem } from "@/data/menu";
import { findMenuItem } from "@/data/menuLookup";
import { TearBottom, TearTop } from "./Tears";

/* The pinned scroll-driven slider is driven by GSAP in HomeClient (it needs to see every section at once);
   this component only renders the markup it animates, and reports the active item so the dots can follow. */
export default function Showcase({ active, onPick }: { active: number; onPick: (item: MenuItem) => void }) {
  return (
    <section className="showcase" id="showcase">
      <div className="showcase-sticky">
        {/* cream tear (moved from promo) — the cream menu section above tears away to reveal this dark background */}
        <TearTop />

        <div className="showcase-bg" id="showcaseBg"></div>
        <span className="showcase-kicker">Best Sellers</span>

        <div className="showcase-stage">
          {showcase.map((it, idx) => {
            const menuItem = findMenuItem(it.menuName)!;
            return (
            <article className="show-item" data-idx={idx} data-color={it.color} key={it.name}>
              <span className="show-word" aria-hidden="true">{it.word}</span>
              <div className="show-imgwrap cutout">
                {/* plain <img>: GSAP and the --sx/--sy/--sc nudges own this element's transform */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.img} style={it.imgVars as React.CSSProperties} alt={it.imgAlt} loading="lazy" />
              </div>
              <div className="show-info">
                <span className="show-tag">{it.tag}</span>
                <h3>{it.name}</h3>
                <p>{it.desc}</p>
                <div className="show-price-row">
                  <span className="show-price">{menuItem.priceLabel}</span>
                  <div className="show-opts">
                    <button
                      className="btn btn-rust btn-sm cart-add" data-magnet
                      onClick={() => onPick(menuItem)}
                    >
                      + Add to Cart
                    </button>
                  </div>
                </div>
              </div>
              <div className="show-side">
                <span className="show-bubble">{it.bubble}</span>
                <ul className="show-facts">{it.facts.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            </article>
            );
          })}
        </div>

        <div className="showcase-dots" id="showcaseDots">
          {showcase.map((_, i) => (
            <button key={i} className={i === active ? "on" : undefined} data-i={i} aria-label={`Show item ${i + 1}`} />
          ))}
        </div>

        {/* cream tear — the dark showcase tears away to the off-white promo section below */}
        <TearBottom />
      </div>
    </section>
  );
}
