"use client";

import gsap from "gsap";
import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import { TearBottom } from "./Tears";

type Seg = { t: string; em?: boolean };
type Slide = { img: string; alt: string; chip: string; lines: Seg[][]; sub: string; cta: { href: string; label: string } };

const SLIDES: Slide[] = [
  {
    img: "/images/IMG_2996.JPG", alt: "Wood-fired pizza fresh from the oven", chip: "Now Open",
    lines: [[{ t: "mccoy's is now" }], [{ t: "open in islamabad", em: true }]],
    sub: "Fresh out the oven on I-8 Markaz. Come say hello — we'd love to have you in.",
    cta: { href: "#footer", label: "Find the branch →" },
  },
  {
    img: "/images/IMG_2998.JPG", alt: "Stacked double cheeseburger", chip: "#1 Best Seller",
    lines: [[{ t: "stacked high," }], [{ t: "built to order" }]],
    sub: "Double patties, melted cheese, toasted buns — made fresh the moment you order.",
    cta: { href: "#menu", label: "See the menu →" },
  },
  {
    img: "/images/IMG_2999.JPG", alt: "Crispy fries and burger on a tray", chip: "Signature",
    lines: [[{ t: "thin & crispy." }], [{ t: "straight outta", em: true }, { t: " the oven" }]],
    sub: "Hand-stretched dough, ninety seconds at 400°C. That's the whole secret.",
    cta: { href: "#menu", label: "See the menu →" },
  },
];

/* Letters are inline-blocks (for the entrance animation), which lets the browser wrap between ANY two letters —
   "THE" broke into "TH" / "E". Grouping each word in a nowrap box means lines only break at spaces.
   (only real spaces split words — a &nbsp; keeps two words glued together in one nowrap unit) */
function Line({ segs }: { segs: Seg[] }) {
  return (
    <span className="ln">
      {segs.map((s, i) =>
        s.em ? (
          <em key={i} className="ch" style={{ display: "inline-block" }}>{s.t}</em>
        ) : (
          <Fragment key={i}>
            {s.t.split(/([ \t\r\n]+)/).map((tok, j) => {
              if (!tok) return null;
              if (/^[ \t\r\n]+$/.test(tok)) return tok;
              return (
                <span key={j} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                  {tok.split("").map((ch, k) => (
                    <span key={k} className="ch" style={{ display: "inline-block" }}>{ch}</span>
                  ))}
                </span>
              );
            })}
          </Fragment>
        )
      )}
    </span>
  );
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Hero() {
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  function animateSlide(slide: HTMLElement) {
    // never animate into a hidden tab — rAF stalls there and would leave the
    // copy stuck at opacity 0 when the user comes back
    if (document.hidden || prefersReducedMotion()) return;
    const h = slide.querySelector("h1")!;
    const chip = slide.querySelector(".chip");
    const sub = slide.querySelector(".slide-sub");
    const btn = slide.querySelector(".btn");
    const chars = h.querySelectorAll(".ch");
    const bits = [chip, ...chars, sub, btn];
    gsap.killTweensOf(bits);
    const tl = gsap.timeline({ onComplete: () => { gsap.set(bits, { clearProps: "opacity,transform" }); } });
    tl.fromTo(chip, { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power2.out" })
      .fromTo(chars, { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.018, ease: "power3.out" }, "-=.2")
      .fromTo(sub, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, "-=.35")
      .fromTo(btn, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }, "-=.35");
    gsap.fromTo(slide.querySelector(".slide-img img"), { scale: 1.12 }, { scale: 1, duration: 7, ease: "none" });
  }

  // entrance animation for whichever slide just became active (also runs once for slide 1 on load)
  useEffect(() => {
    const el = slideRefs.current[cur];
    if (el) animateSlide(el);
  }, [cur]);

  // an auto-advancing carousel is exactly what reduced-motion users opt out of,
  // so leave it parked on slide 1 and let the dots drive it instead
  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const id = setInterval(() => setCur((c) => (c + 1) % SLIDES.length), 6000);
    return () => clearInterval(id);
  }, [paused, restartKey]);

  return (
    <section className="hero" id="top" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {SLIDES.map((s, i) => (
        <div key={s.chip} className={"slide" + (i === cur ? " on" : "")} data-slide ref={(el) => { slideRefs.current[i] = el; }}>
          <div className="slide-img">
            <Image src={s.img} alt={s.alt} fill sizes="100vw" priority={i === 0} />
          </div>
          <div className="slide-body"><div className="wrap">
            <span className="chip">{s.chip}</span>
            <h1 className="display">{s.lines.map((l, n) => <Line key={n} segs={l} />)}</h1>
            <p className="slide-sub">{s.sub}</p>
            <a href={s.cta.href} className="btn btn-rust" data-magnet>{s.cta.label}</a>
          </div></div>
        </div>
      ))}

      <div className="stamp" id="stamp">
        <svg viewBox="0 0 100 100">
          <defs><path id="ring" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" /></defs>
          <circle className="ring" cx="50" cy="50" r="46" />
          <circle className="ring" cx="50" cy="50" r="27" />
          <text textLength="226" lengthAdjust="spacingAndGlyphs"><textPath href="#ring" startOffset="0%">· our food · your super power · </textPath></text>
          <image href="/images/Icon.png" x="28" y="38.5" width="44" height="23" preserveAspectRatio="xMidYMid meet" />
        </svg>
      </div>

      <div className="hero-ui"><div className="wrap hero-ui-in">
        <div className="dots" id="dots">
          {SLIDES.map((_, i) => (
            <button
              key={i} className={"dot" + (i === cur ? " on" : "")} aria-label={`Slide ${i + 1}`}
              onClick={() => { setCur(i); setRestartKey((k) => k + 1); }}
            />
          ))}
        </div>
      </div></div>

      <TearBottom />
    </section>
  );
}
