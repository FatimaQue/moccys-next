import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { logOrderEvent, type EventKind } from "@/lib/orderEvents";
import { supabaseAdmin } from "@/lib/supabase/admin";

const STATUSES = ["pending", "preparing", "ready", "out", "delivered", "rejected"];

// Where an order may go from each status. Anything else is a stale screen or a double click, and is refused
// instead of quietly dragging a finished order back onto the board.
const MOVES: Record<string, string[]> = {
  pending: ["preparing", "rejected"],
  preparing: ["ready", "rejected"],
  ready: ["out", "delivered", "rejected"],
  out: ["delivered", "ready"],
  delivered: [],
  rejected: [],
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status, driverId, action } = (await req.json().catch(() => ({}))) as { status?: string; driverId?: string; action?: string };

  // the admin has checked the bank account and the transfer is there: only now does the rider treat the order as paid
  if (action === "confirm-payment") {
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("orders")
      .update({ payment_status: "paid", paid_at: new Date().toISOString() })
      .eq("id", Number(id)).eq("pay_method", "bank").neq("payment_status", "paid").select("order_no");
    if (error) {
      console.error("bank payment confirm failed", error);
      return NextResponse.json({ error: "Could not update the order" }, { status: 500 });
    }
    if (!data?.length) return NextResponse.json({ error: "That order isn't waiting for a bank transfer" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (!status || !STATUSES.includes(status) || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: current } = await db.from("orders").select("status, order_type, pay_method, payment_status").eq("id", Number(id)).maybeSingle();
  if (!current) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!MOVES[current.status]?.includes(status)) {
    return NextResponse.json({ error: "This order was already updated. The board has been refreshed." }, { status: 409 });
  }
  if (status === "out" && current.order_type !== "delivery") {
    return NextResponse.json({ error: "Pick-up orders can't be sent out with a rider." }, { status: 400 });
  }
  if (current.status === "ready" && status === "delivered" && current.order_type !== "pickup") {
    return NextResponse.json({ error: "Delivery orders are sent out with a rider first." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { status };
  let driverName = "";
  if (status === "out") {
    // an order can only go out with a real, active driver attached
    if (!driverId) return NextResponse.json({ error: "Pick a driver first" }, { status: 400 });
    const { data: driver } = await db.from("profiles").select("id, name").eq("id", driverId).eq("role", "driver").neq("active", false).maybeSingle();
    if (!driver) return NextResponse.json({ error: "Unknown driver" }, { status: 400 });
    driverName = driver.name;
    patch.driver_id = driverId;
    patch.out_at = new Date().toISOString();
    patch.delivered_at = null;
  } else if (status === "delivered") {
    patch.delivered_at = new Date().toISOString();
  } else {
    // any other move takes the order back off the road
    patch.delivered_at = null;
    if (status !== "ready") patch.out_at = null;
  }

  // the move only applies if the order is still in the status we just checked, so two overlapping requests can't both win
  const { data, error } = await db.from("orders").update(patch).eq("id", Number(id)).eq("status", current.status).select("order_no");
  if (error) {
    console.error("order status update failed", error);
    return NextResponse.json({ error: "Could not update the order" }, { status: 500 });
  }
  if (!data?.length) return NextResponse.json({ error: "This order was already updated. The board has been refreshed." }, { status: 409 });

  // a customer who already paid online and is then rejected is owed their money back; say so where the admin will see it
  const refund = status === "rejected" && current.payment_status === "paid" ? " — already paid, refund needed" : "";

  // the bell only needs a line for real moves (pending has no event of its own)
  const order = data[0];
  const events: Partial<Record<string, [EventKind, string]>> = {
    preparing: ["accepted", "accepted"],
    ready: ["ready", "is ready for pick up"],
    out: ["out", `sent out with ${driverName}`],
    delivered: ["delivered", "marked delivered"],
    rejected: ["rejected", `rejected${refund}`],
  };
  const ev = events[status];
  if (ev) await logOrderEvent({ orderId: Number(id), orderNo: order.order_no, kind: ev[0], actor: "Admin", message: `Order ${order.order_no} ${ev[1]}` });
  return NextResponse.json({ ok: true });
}
