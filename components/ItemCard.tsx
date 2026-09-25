"use client";

import Image from "next/image";
import type { MenuItem } from "@/data/menu";
import { useMenu } from "./MenuProvider";

export default function ItemCard({ item, onAdd }: { item: MenuItem; onAdd: (item: MenuItem) => void }) {
  const { isAvailable } = useMenu();
  const out = !isAvailable(item.name);
  return (
    <article className={"item-card" + (out ? " sold-out" : "")}>
      <div className="item-img">
        <Image
          src={item.img}
          alt={item.imgAlt}
          fill
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 400px"
          style={item.imgPos ? { objectPosition: item.imgPos } : undefined}
        />
        {item.burst && (
          <span className={"burst" + (item.burst.hot ? " hot" : "")} aria-hidden="true">
            {item.burst.text}<b>{item.burst.strong}</b>
          </span>
        )}
      </div>
      <div className="item-body">
        <h3>{item.name}</h3>
        <p>{item.desc}</p>
        <div className="item-foot">
          <div className="item-price"><b>{item.priceLabel}</b></div>
          <button className="item-add" disabled={out} onClick={() => onAdd(item)}>{out ? "Unavailable" : "+ Add to Cart"}</button>
        </div>
      </div>
    </article>
  );
}
