"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MenuItem } from "@/data/menu";
import ItemModal from "../ItemModal";
import Nav from "../Nav";
import Footer from "../Footer";
import WhatsAppButton from "../WhatsAppButton";
import AddressModal from "./AddressModal";
import CartDrawer from "./CartDrawer";
import Categories from "./Categories";
import Deals from "./Deals";
import Hero from "./Hero";
import PickupModal from "./PickupModal";
import Showcase from "./Showcase";

const NAV_LINKS = [
  { href: "#top", label: "Home" },
  { href: "#deals", label: "Deals" },
  { href: "#menu", label: "Menu" },
  { href: "#promo", label: "Offers" },
  { href: "#footer", label: "Contact" },
];

// scroll budget (x100vh): a short hold on item 1, one full swipe per item change, a hold on the last
// item. Without the holds the panel un-pins the instant the last item finishes fading in, so it
// felt like the scroll "ran out" — and item 1 started leaving before it had even settled.
const LEAD = 0.5;
const TAIL = 0.5;

export default function HomeClient() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [showIdx, setShowIdx] = useState(0);
  const [selected, setSelected] = useState<MenuItem | null>(null);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const closeAddr = useCallback(() => setAddrOpen(false), []);
  const closePickup = useCallback(() => setPickupOpen(false), []);
  const closeItem = useCallback(() => setSelected(null), []);

  /* ---------- GSAP: scroll reveals, tilt, magnets, pinned showcase ---------- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    gsap.registerPlugin(ScrollTrigger);
    const q = <T extends Element = HTMLElement>(sel: string) => gsap.utils.toArray<T>(sel, root);
    let mm: gsap.MatchMedia | undefined;

    const ctx = gsap.context(() => {
      /* section reveals */
      ScrollTrigger.batch(q("[data-reveal]"), {
        start: "top 86%", once: true,
        onEnter: (b) => gsap.fromTo(b, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.08, ease: "power3.out" }),
      });

      /* deal cards — hand-placed settle */
      ScrollTrigger.batch(q("[data-deal]"), {
        start: "top 88%", once: true,
        onEnter: (b) => gsap.fromTo(b,
          { y: 46, opacity: 0, rotateZ: -2.5 },
          { y: 0, opacity: 1, rotateZ: 0, duration: 0.8, stagger: 0.12, ease: "power3.out" }),
      });

      /* category tiles build in */
      ScrollTrigger.batch(q("[data-cat]"), {
        start: "top 90%", once: true,
        onEnter: (b) => gsap.fromTo(b.map((c) => c.querySelector(".cat-ring")),
          { scale: 0.82, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.75, stagger: 0.08, ease: "back.out(1.6)" }),
      });

      /* rotating stamp */
      gsap.to("#stamp svg", { rotation: 360, duration: 22, repeat: -1, ease: "none", transformOrigin: "50% 50%" });

      const mq = gsap.matchMedia();
      mm = mq;

      mq.add("(min-width: 861px)", () => {
        const off: (() => void)[] = [];
        const on = (el: Element, ev: string, fn: (e: MouseEvent) => void) => {
          el.addEventListener(ev, fn as EventListener);
          off.push(() => el.removeEventListener(ev, fn as EventListener));
        };

        /* floating food tiles — each out of sync */
        q("[data-spin]").forEach((el) => {
          gsap.to(el, {
            y: "+=11", duration: 2.6 + Math.random() * 1.6, repeat: -1, yoyo: true,
            ease: "sine.inOut", delay: -Math.random() * 2,
          });
        });

        /* pointer tilt */
        q("[data-tilt]").forEach((card) => {
          const img = card.querySelector("img");
          const ring = card.querySelector(".cat-ring");
          on(card, "mousemove", (e) => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            gsap.to(card, { rotateY: px * 16, rotateX: -py * 16, transformPerspective: 800, transformOrigin: "center", duration: 0.4, ease: "power2.out" });
            if (img) gsap.to(img, { scale: 1.06, duration: 0.4, ease: "power2.out" });
            if (ring) gsap.to(ring, { rotation: 8, duration: 0.5, ease: "power2.out" });
          });
          on(card, "mouseleave", () => {
            gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.9, ease: "elastic.out(1,.5)" });
            if (img) gsap.to(img, { scale: 1, duration: 0.5, ease: "power2.out" });
            if (ring) gsap.to(ring, { rotation: 0, duration: 0.7, ease: "power2.out" });
          });
        });

        /* magnetic buttons */
        q("[data-magnet]").forEach((btn) => {
          on(btn, "mousemove", (e) => {
            const r = btn.getBoundingClientRect();
            gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.28, y: (e.clientY - r.top - r.height / 2) * 0.38, duration: 0.4, ease: "power2.out" });
          });
          on(btn, "mouseleave", () => gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1,.4)" }));
        });

        return () => off.forEach((f) => f());
      });

      /* ---------- menu showcase: pinned scroll-driven product slider ---------- */
      const showcase = root.querySelector("#showcase");
      if (!showcase) return;

      const items = q(".show-item");
      const colors = items.map((it) => it.dataset.color as string);
      const dots = q<HTMLButtonElement>("#showcaseDots button");
      const bg = root.querySelector("#showcaseBg") as HTMLElement;
      const n = items.length;

      const onUpdate = (self: ScrollTrigger) => {
        const idx = Math.max(0, Math.min(n - 1, Math.round(self.progress * (LEAD + n - 1 + TAIL) - LEAD)));
        setShowIdx(idx);
        items.forEach((it, i) => { it.style.pointerEvents = i === idx ? "auto" : "none"; });
      };

      // clicking a dot scrolls to where that item is fully in view
      const wireDots = (tl: gsap.core.Timeline) => {
        const handlers = dots.map((d) => {
          const fn = () => {
            const i = Number(d.dataset.i);
            const st = tl.scrollTrigger!;
            const y = st.start + (st.end - st.start) * ((LEAD + i) / (LEAD + n - 1 + TAIL));
            window.scrollTo({ top: y, behavior: "smooth" });
          };
          d.addEventListener("click", fn);
          return () => d.removeEventListener("click", fn);
        });
        return () => handlers.forEach((f) => f());
      };

      const makeTimeline = () => gsap.timeline({
        scrollTrigger: {
          trigger: "#showcase",
          start: "top top",
          // the section is 600vh tall and its inner panel is position:sticky, so the
          // whole travel happens inside this section — no pin, nothing injected
          end: "bottom bottom",
          scrub: 1,
          onUpdate,
        },
      });

      // has to match the @media in the showcase CSS: desktop overlap layout only when there's room for it
      mq.add("(min-width: 1181px) and (min-height: 700px)", () => {
        const words = items.map((it) => it.querySelector(".show-word"));
        const imgs = items.map((it) => it.querySelector(".show-imgwrap"));
        const infos = items.map((it) => it.querySelector(".show-info"));

        // the CSS centres the photo and text with translate(-50%,-50%); GSAP reads that back as a pixel
        // offset and, at fractional sizes (e.g. 38vw = 448.8px), fails to recognise it as 50% — so it
        // stacked its own xPercent/yPercent on top and threw the photo up off-screen. Clearing the CSS
        // transform first lets GSAP own the centring outright.
        [...imgs, ...infos].forEach((el) => { (el as HTMLElement).style.transform = "none"; });

        // opacity lives ONLY on the parent .show-item — the image, giant word and
        // info panel of one item can never fall out of sync with each other or
        // leave a gap, because they share a single opacity value by construction.
        // sub-elements get transform-only motion (scale/x/y) for visual flair.
        gsap.set(bg, { backgroundColor: colors[0] });
        gsap.set(items, { opacity: 0 });
        gsap.set(items[0], { opacity: 1 });
        // xPercent/yPercent -50 recreates the CSS translate(-50%,-50%) centering
        // that gsap.set() would otherwise silently drop
        gsap.set(imgs, { xPercent: -50, scale: 0.6, yPercent: -10 });
        gsap.set(imgs[0], { xPercent: -50, scale: 1, yPercent: -50 });
        // words are anchored at left:52% (the burger's centre); -50 centres each one there
        gsap.set(words, { xPercent: -20, yPercent: -50 });
        gsap.set(words[0], { xPercent: -50, yPercent: -50 });
        // same story for the text block: yPercent:-50 keeps it centred on its anchor
        gsap.set(infos, { y: 30, yPercent: -50 });
        gsap.set(infos[0], { y: 0, yPercent: -50 });
        items.forEach((it, i) => { it.style.pointerEvents = i === 0 ? "auto" : "none"; });

        const tl = makeTimeline();
        for (let i = 0; i < n - 1; i++) {
          const pos = LEAD + i;
          tl.to(items[i], { opacity: 0, duration: 1, ease: "power2.inOut" }, pos)
            .fromTo(items[i + 1], { opacity: 0 }, { opacity: 1, duration: 1, ease: "power2.inOut" }, pos)
            .to(imgs[i], { scale: 0.8, yPercent: -150, duration: 1, ease: "power2.inOut" }, pos)
            .fromTo(imgs[i + 1], { scale: 0.6, yPercent: -10 }, { scale: 1, yPercent: -50, duration: 1, ease: "power2.inOut" }, pos)
            .to(words[i], { xPercent: -80, duration: 1, ease: "power2.inOut" }, pos)
            .fromTo(words[i + 1], { xPercent: -20 }, { xPercent: -50, duration: 1, ease: "power2.inOut" }, pos)
            .to(infos[i], { y: -30, duration: 1, ease: "power2.inOut" }, pos)
            .fromTo(infos[i + 1], { y: 30 }, { y: 0, duration: 1, ease: "power2.inOut" }, pos)
            .to(bg, { backgroundColor: colors[i + 1], duration: 1, ease: "power2.inOut" }, pos);
        }
        tl.to({}, { duration: TAIL }, LEAD + n - 1); // pads the timeline so the last item gets its hold

        const unwire = wireDots(tl);
        return () => {
          unwire();
          tl.scrollTrigger?.kill();
          tl.kill();
          // drop back to plain CSS (opacity:1, no transform) so a resize down to
          // mobile never leaves an item stuck mid-fade from the desktop timeline
          gsap.set([...items, ...words, ...imgs, ...infos], { clearProps: "all" });
          items.forEach((it) => { it.style.pointerEvents = ""; });
        };
      });

      // same pinned scroll-jack as desktop, but items are stacked (image row, then text/price/cart row)
      // by the mobile CSS instead of overlapping — so the crossfade only moves the item + bg color
      mq.add("not all and (min-width: 1181px) and (min-height: 700px)", () => {
        gsap.set(bg, { backgroundColor: colors[0] });
        gsap.set(items, { opacity: 0, y: 36 });
        gsap.set(items[0], { opacity: 1, y: 0 });
        items.forEach((it, i) => { it.style.pointerEvents = i === 0 ? "auto" : "none"; });

        const tl = makeTimeline();
        for (let i = 0; i < n - 1; i++) {
          const pos = LEAD + i;
          tl.to(items[i], { opacity: 0, y: -36, duration: 1, ease: "power2.inOut" }, pos)
            .fromTo(items[i + 1], { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1, ease: "power2.inOut" }, pos)
            .to(bg, { backgroundColor: colors[i + 1], duration: 1, ease: "power2.inOut" }, pos);
        }
        tl.to({}, { duration: TAIL }, LEAD + n - 1);

        const unwire = wireDots(tl);
        return () => {
          unwire();
          tl.scrollTrigger?.kill();
          tl.kill();
          gsap.set(items, { clearProps: "all" });
          items.forEach((it) => { it.style.pointerEvents = ""; });
        };
      });
    }, root);

    return () => {
      mm?.revert();
      ctx.revert();
    };
  }, []);

  return (
    <div className="pg-home" ref={rootRef}>
      <Nav
        links={NAV_LINKS}
        onCartClick={openCart}
        onDeliveryClick={() => setAddrOpen(true)}
        onPickupClick={() => setPickupOpen(true)}
        onAddressClick={() => setAddrOpen(true)}
        address={address}
        onAddressChange={setAddress}
      />

      <Hero />
      <Deals onPick={setSelected} />
      <Categories />
      <Showcase active={showIdx} onPick={setSelected} />

      {/* ==================== 20% OFF PROMO ==================== */}
      <section className="sec grain promo" id="promo">
        <div className="wrap promo-in">
          <div className="promo-copy">
            <div className="promo-badge" data-reveal>
              <svg viewBox="0 0 24 24"><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13zm2.2.3 7.3 6 7.3-6H4.2zM20 7.9l-7.4 6.1a1 1 0 0 1-1.2 0L4 7.9v10.6c0 .3.2.5.5.5h15c.3 0 .5-.2.5-.5V7.9z" /></svg>
              Stay updated
            </div>
            <h2 className="display" data-reveal><span className="ln">Special offers</span><span className="ln amber">&amp; news</span></h2>
            <p className="promo-sub" data-reveal>Subscribe now for news, promotions and more delivered right to your inbox.</p>
            <form className="promo-form" data-reveal onSubmit={(e) => e.preventDefault()}>
              <input type="email" className="promo-input" placeholder="Enter email address" aria-label="Enter email address" required />
              <button type="submit" className="btn btn-rust" data-magnet>Subscribe →</button>
            </form>
            <p className="promo-fine" data-reveal>No spam, ever. Unsubscribe anytime.</p>
          </div>
          <div className="promo-pic" data-reveal>
            <Image src="/images/double-deal.jpg" alt="Double Down burger deal" width={700} height={700} />
          </div>
        </div>
      </section>

      <Footer />

      <WhatsAppButton />

      {selected && <ItemModal key={selected.name} item={selected} onClose={closeItem} onAdded={openCart} />}

      <CartDrawer open={cartOpen} onClose={closeCart} />
      <AddressModal open={addrOpen} onClose={closeAddr} onConfirm={setAddress} />
      <PickupModal open={pickupOpen} onClose={closePickup} />
    </div>
  );
}
