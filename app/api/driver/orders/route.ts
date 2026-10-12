import { NextResponse } from "next/server";
import { getDriver } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Row = {
  id: number; order_no: string; status: string; customer_name: string; mobile: string; city: string | null;
  address: string | null; notes: string | null; pay_method: string; payment_status: string; total: number; out_at: string | null; delivered_at: string | null;
  order_items: { name: string; qty: number; is_addon: boolean }[];
};

// the signed-in driver's own orders: still on the road, plus what they delivered today
export async function GET() {
  const driver = await getDriver();
  if (!driver) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("id, order_no, status, customer_name, mobile, city, address, notes, pay_method, payment_status, total, out_at, delivered_at, order_items(name, qty, is_addon)")
    .eq("driver_id", driver.id)
    .or(`status.eq.out,and(status.eq.delivered,delivered_at.gte.${startOfDay.toISOString()})`)
    .order("out_at", { ascending: true })
    .returns<Row[]>();
  if (error) {
    console.error("driver orders fetch failed", error);
    return NextResponse.json({ error: "Could not load orders" }, { status: 500 });
  }

  const orders = data.map((o) => ({
    dbId: o.id,
    id: o.order_no,
    status: o.status,
    customer: o.customer_name,
    mobile: o.mobile,
    address: [o.address, o.city].filter(Boolean).join(", "),
    notes: o.notes,
    items: o.order_items.map((i) => `${i.qty}x ${i.name}${i.is_addon ? " (add-on)" : ""}`),
    total: o.total,
    // Cash on delivery, and any order whose payment hasn't been confirmed (e.g. a bank transfer the admin never saw
    // arrive), is collected at the door. Only a confirmed payment means "nothing to collect".
    cash: o.pay_method === "cod" || o.payment_status !== "paid",
    deliveredAt: o.delivered_at,
  }));
  return NextResponse.json({ name: driver.name, orders });
}
