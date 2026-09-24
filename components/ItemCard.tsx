import Image from "next/image";
import type { MenuItem } from "@/data/menu";

export default function ItemCard({ item, onAdd }: { item: MenuItem; onAdd: (item: MenuItem) => void }) {
  return (
    <article className="item-card">
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
          <button className="item-add" onClick={() => onAdd(item)}>+ Add to Cart</button>
        </div>
      </div>
    </article>
  );
}
