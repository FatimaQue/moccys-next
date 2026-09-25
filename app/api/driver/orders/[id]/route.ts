import { NextResponse } from "next/server";
import { getDriver } from "@/lib/adminAuth";
import { logOrderEvent } from "@/lib/orderEvents";
import { supabaseAdmin } from "@/lib/supabase/admin";

// a driver can do exactly one thing: mark one of their own out-for-delivery orders as delivered
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const driver = await getDriver();
  if (!driver) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // ownership and current status are part of the query itself, so nothing else can be touched
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", Number(id))
    .eq("driver_id", driver.id)
    .eq("status", "out")
    .select("id, order_no");
  if (error) {
    console.error("driver delivery update failed", error);
    return NextResponse.json({ error: "Could not update the order" }, { status: 500 });
  }
  if (!data?.length) return NextResponse.json({ error: "That order isn't on your list" }, { status: 403 });
  await logOrderEvent({ orderId: data[0].id, orderNo: data[0].order_no, kind: "delivered", actor: driver.name, message: `Order ${data[0].order_no} delivered by ${driver.name}` });
  return NextResponse.json({ ok: true });
}
