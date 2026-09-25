import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { logOrderEvent, type EventKind } from "@/lib/orderEvents";
import { supabaseAdmin } from "@/lib/supabase/admin";

const STATUSES = ["pending", "preparing", "ready", "out", "delivered", "rejected"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status, driverId } = (await req.json().catch(() => ({}))) as { status?: string; driverId?: string };
  if (!status || !STATUSES.includes(status) || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = supabaseAdmin();
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

  const { data, error } = await db.from("orders").update(patch).eq("id", Number(id)).select("order_no");
  if (error) {
    console.error("order status update failed", error);
    return NextResponse.json({ error: "Could not update the order" }, { status: 500 });
  }

  // the bell only needs a line for real moves (pending has no event of its own)
  const order = data?.[0];
  const events: Partial<Record<string, [EventKind, string]>> = {
    preparing: ["accepted", "accepted"],
    ready: ["ready", "is ready for pick up"],
    out: ["out", `sent out with ${driverName}`],
    delivered: ["delivered", "marked delivered"],
    rejected: ["rejected", "rejected"],
  };
  const ev = events[status];
  if (order && ev) await logOrderEvent({ orderId: Number(id), orderNo: order.order_no, kind: ev[0], actor: "Admin", message: `Order ${order.order_no} ${ev[1]}` });
  return NextResponse.json({ ok: true });
}
