import { NextResponse } from "next/server";
import { buildHostedCheckout, jazzcashConfigured } from "@/lib/jazzcash";
import { supabaseAdmin } from "@/lib/supabase/admin";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  if (!jazzcashConfigured()) return bad("JazzCash isn't set up yet. Please choose another payment method.", 503);

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

  if (error || !order || order.pay_method !== "jazzcash" || order.payment_status === "paid") {
    return bad("This order can't be paid with JazzCash.");
  }

  // A fresh reference per attempt lets the customer retry after a failed/expired payment.
  const txnRefNo = "T" + Date.now() + Math.floor(100 + Math.random() * 900);
  const { error: updErr } = await db.from("orders").update({ jazzcash_txn_ref: txnRefNo }).eq("id", order.id);
  if (updErr) {
    console.error("jazzcash txn ref update failed", updErr);
    return bad("Could not start payment. Please try again.", 500);
  }

  const { action, fields } = buildHostedCheckout({ orderNo: order.order_no, amountPkr: order.total, txnRefNo });
  return NextResponse.json({ action, fields });
}
