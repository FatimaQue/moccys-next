"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { deals } from "@/data/home";
import type { MenuItem } from "@/data/menu";
import { findMenuItem } from "@/data/menuLookup";

export default function Deals({ onPick }: { onPick: (item: MenuItem) => void }) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scrollDeals = (dir: number) => {
    const row = rowRef.current;
    if (!row) return;
    const card = row.querySelector(".deal-card");
    const step = card ? card.getBoundingClientRect().width + 28 : row.clientWidth;
    row.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section className="sec deals grain" id="deals">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div>
            <span className="eyebrow">Today&apos;s Deals</span>
            <h2 className="display" style={{ marginTop: 18 }}>Built to <span className="amber">share</span> (or not)</h2>
          </div>
          <Link href="/menu" className="viewall">Full menu →</Link>
        </div>

        <div className="deal-wrap">
          <div className="deal-row" ref={rowRef}>
            {deals.map((d) => (
              <article className="deal-card" data-deal data-tilt key={d.name}>
                <div className="deal-img">
                  <Image
                    src={d.img} alt={d.imgAlt} fill sizes="(max-width:860px) 80vw, 400px"
                    style={d.imgPos ? { objectPosition: d.imgPos } : undefined}
                  />
                  <span className={"burst" + (d.burst.hot ? " hot" : "")} aria-hidden="true">{d.burst.text}<b>{d.burst.strong}</b></span>
                </div>
                <div className="deal-body">
                  <h3>{d.name}</h3>
                  <p>{d.desc}</p>
                  <div className="deal-foot">
                    <span className="deal-price"><span>Rs.</span>{d.priceLabel}</span>
                    <button
                      className="btn btn-rust btn-sm cart-add" data-magnet
                      onClick={() => onPick(findMenuItem(d.name)!)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="deal-arrows">
            <button className="arw prev" aria-label="Previous deal" onClick={() => scrollDeals(-1)}><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></button>
            <button className="arw next" aria-label="Next deal" onClick={() => scrollDeals(1)}><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
      </div>
    </section>
  );
}
