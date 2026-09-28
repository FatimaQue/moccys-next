import { NextResponse } from "next/server";
import { safepayConfigured, startCheckout } from "@/lib/safepay";
import { supabaseAdmin } from "@/lib/supabase/admin";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  if (!safepayConfigured()) return bad("Online payment isn't set up yet. Please choose another payment method.", 503);

  let body: { orderNo?: string };
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request.");
  }
  const orderNo = typeof body.orderNo === "string" ? body.orderNo.trim() : "";
  if (!orderNo) return bad("Invalid order.");

  const db = supabaseAdmin();
  const { data: order, error } = await db
    .from("orders")
    .select("id, order_no, total, pay_method, payment_status")
    .eq("order_no", orderNo)
    .single();

  if (error || !order || order.pay_method !== "safepay" || order.payment_status === "paid") {
    return bad("This order can't be paid online.");
  }

  // A fresh Safepay tracker per attempt lets the customer retry after a failed/abandoned payment.
  let checkout: { tracker: string; url: string };
  try {
    checkout = await startCheckout({ orderNo: order.order_no, amountPkr: order.total });
  } catch (e) {
    console.error("safepay start failed", e);
    return bad("Could not start payment. Please try again.", 502);
  }

  const { error: updErr } = await db.from("orders").update({ safepay_tracker: checkout.tracker }).eq("id", order.id);
  if (updErr) {
    console.error("safepay tracker update failed", updErr);
    return bad("Could not start payment. Please try again.", 500);
  }

  return NextResponse.json({ url: checkout.url });
}
