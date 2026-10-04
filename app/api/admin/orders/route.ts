import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { customCatalog } from "@/lib/menuShared";
import { getMenuState } from "@/lib/menuStore";
import { addonCatalog, menuCatalog } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Row = {
  id: number; order_no: string; status: string; order_type: string; customer_name: string; mobile: string;
  city: string | null; address: string | null; notes: string | null; pay_method: string; easypaisa_number: string | null; payment_status: string;
  total: number; created_at: string; out_at: string | null; delivered_at: string | null;
  driver: { name: string } | null;
  order_items: { name: string; price: number; qty: number; is_addon: boolean }[];
};

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("id, order_no, status, order_type, customer_name, mobile, city, address, notes, pay_method, easypaisa_number, payment_status, total, created_at, out_at, delivered_at, driver:profiles!driver_id(name), order_items(name, price, qty, is_addon)")
    // an unpaid/abandoned online (Safepay, or older JazzCash) checkout never reached the kitchen, so it shouldn't show up here
    .or("pay_method.not.in.(safepay,jazzcash),payment_status.eq.paid")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Row[]>();
  if (error) {
    console.error("admin orders fetch failed", error);
    return NextResponse.json({ error: "Could not load orders" }, { status: 500 });
  }

  const custom = customCatalog((await getMenuState()).custom);
  const orders = data.map((o) => {
    const main = o.order_items.filter((i) => !i.is_addon);
    const first = main[0] ?? o.order_items[0];
    const img = first ? (menuCatalog.get(first.name) ?? custom.get(first.name) ?? addonCatalog.get(first.name))?.img : undefined;
    const details = [
      ...o.order_items.map((i) => `${i.qty}x ${i.name}${i.is_addon ? " (add-on)" : ""}`),
      `${o.order_type === "delivery" ? "Delivery" : "Pick-up"} · ${o.mobile}`,
      ...(o.order_type === "delivery" ? [[o.address, o.city].filter(Boolean).join(", ")] : []),
      o.pay_method === "easypaisa" ? `EasyPaisa · ${o.easypaisa_number}` : o.pay_method === "safepay" ? "Paid online · Safepay" : o.pay_method === "jazzcash" ? "JazzCash · Paid" : o.pay_method === "bank" ? `Bank transfer · ${o.easypaisa_number}` : "Cash on delivery",
      ...(o.notes ? [`"${o.notes}"`] : []),
    ];
    return {
      dbId: o.id,
      id: o.order_no,
      status: o.status,
      orderType: o.order_type,
      customer: o.customer_name,
      items: `${o.order_items.reduce((s, i) => s + i.qty, 0)} items`,
      total: o.total,
      address: o.order_type === "delivery" ? [o.address, o.city].filter(Boolean).join(", ") : "Pick-up",
      createdAt: o.created_at,
      driver: o.driver?.name ?? null,
      outAt: o.out_at,
      deliveredAt: o.delivered_at,
      name: first ? first.name + (main.length > 1 ? ` +${main.length - 1} more` : "") : "Order",
      img,
      details,
    };
  });
  return NextResponse.json({ orders });
}
