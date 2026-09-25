import "server-only";
import { supabaseAdmin } from "./supabase/admin";

export type EventKind = "new_order" | "accepted" | "ready" | "out" | "delivered" | "rejected";

// Adds a line to the admin notification bell. A missing or failing log must never break the order itself,
// so errors are only logged.
export async function logOrderEvent(e: { orderId: number; orderNo: string; kind: EventKind; message: string; actor: string }) {
  const { error } = await supabaseAdmin()
    .from("order_events")
    .insert({ order_id: e.orderId, order_no: e.orderNo, kind: e.kind, message: e.message, actor: e.actor });
  if (error) console.error("order event failed", error.message);
}
