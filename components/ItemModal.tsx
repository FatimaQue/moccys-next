"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ADDONS } from "@/data/addons";
import type { MenuItem, Option } from "@/data/menu";
import { money, useCart } from "./CartProvider";
import { useMenu } from "./MenuProvider";
import "./ItemModal.css";

const addonByName = Object.fromEntries(ADDONS.flatMap((g) => g.items).map((i) => [i.name, i]));

export default function ItemModal({ item, onClose, onAdded }: { item: MenuItem; onClose: () => void; onAdded?: () => void }) {
  const { add } = useCart();
  const { isAvailable } = useMenu();
  const boxRef = useRef<HTMLDivElement>(null);

  // cards without options add themselves under their own name and price
  const opts: Option[] = item.options?.length ? item.options : [{ label: "", name: item.name, price: item.price }];
  const [optIdx, setOptIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);

  const opt = opts[optIdx];
  const unit = opt.price + picked.reduce((s, n) => s + addonByName[n].price, 0);

  useEffect(() => {
    document.body.classList.add("mnav-lock");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("mnav-lock");
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const toggle = (name: string) =>
    setPicked((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));

  // each add-on becomes its own cart row (own price), at the same quantity as the item
  const addToCart = () => {
    add({ name: opt.name, price: opt.price, img: item.img, qty });
    picked.forEach((n) => add({ name: n, price: addonByName[n].price, img: addonByName[n].img, qty, addon: true }));
    onAdded?.();
    onClose();
  };

  return (
    <div className="pmodal-root">
    <div className="pmodal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pm-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="pmTitle">
        <button className="pm-close" aria-label="Close" onClick={onClose}>&times;</button>
        <div className="pm-top">
          <div className="pm-img">
            <Image
              src={item.img}
              alt={item.imgAlt}
              width={340}
              height={340}
              style={item.imgPos ? { objectPosition: item.imgPos } : undefined}
            />
          </div>
          <div className="pm-info">
            <h3 id="pmTitle">{item.name}</h3>
            <p className="pm-desc">{item.desc}</p>
            <div className="pm-price">{money(opt.price)}</div>

            {opts.length > 1 && (
              <div className="pm-group">
                <h4>Sizes</h4>
                <div className="pm-chips">
                  {opts.map((o, i) => (
                    <button key={o.name} type="button" className={"pm-chip" + (i === optIdx ? " on" : "")} onClick={() => setOptIdx(i)}>
                      {o.label}<small>{money(o.price)}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pm-group">
              <h4>Quantity</h4>
              <div className="pm-qty">
                <button type="button" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))}>&minus;</button>
                <span>{qty}</span>
                <button type="button" aria-label="Increase" onClick={() => setQty((q) => Math.min(20, q + 1))}>+</button>
              </div>
            </div>

            <button className="pm-add" type="button" onClick={addToCart}>
              Add to Cart · {money(unit * qty)}
            </button>
          </div>
        </div>

        <div className="pm-addons">
          <h4>Add-ons <span>(Optional)</span></h4>
          {ADDONS.filter((g) => !g.only || g.only === item.name).map((g) => ({ ...g, items: g.items.filter((a) => isAvailable(a.name)) })).filter((g) => g.items.length).map((g) => (
            <div className="pm-agroup" key={g.group}>
              <h5>{g.group}</h5>
              <div className="pm-alist">
                {g.items.map((a) => {
                  const on = picked.includes(a.name);
                  return (
                    <div className={"pm-aitem" + (on ? " on" : "")} key={a.name}>
                      <Image src={a.img} alt="" width={46} height={46} />
                      <div className="pm-ainfo"><b>{a.name}</b><span>{money(a.price)}</span></div>
                      <button className="pm-atoggle" type="button" aria-pressed={on} aria-label={`Add ${a.name}`} onClick={() => toggle(a.name)}>
                        {on ? "✓" : "+"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
