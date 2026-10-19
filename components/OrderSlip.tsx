"use client";

import { createPortal } from "react-dom";

type SlipOrder = { id: string; orderType: "delivery" | "pickup"; customer: string; total: number; createdAt: string; details: string[] };

// The kitchen slip for the 80mm thermal printer. It sits outside the admin layout and is only visible
// while printing (see .print-slip in admin.css), so the board itself is never affected.
export default function OrderSlip({ order }: { order: SlipOrder }) {
  const when = new Date(order.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return createPortal(
    <div className="print-slip">
      <h1>MCCOY&apos;S</h1>
      <p className="slip-no">#{order.id}</p>
      <p className="slip-type">{order.orderType === "delivery" ? "DELIVERY" : "PICK-UP"}</p>
      <p>{when}</p>
      <p>{order.customer}</p>
      <hr />
      <ul>{order.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
      <hr />
      <p className="slip-total">TOTAL: Rs. {order.total.toLocaleString("en-US")}</p>
    </div>,
    document.body,
  );
}
