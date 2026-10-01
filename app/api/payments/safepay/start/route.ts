import { NextResponse } from "next/server";
import { getCustomer } from "@/lib/customer";
import { confirmPayment, safepayConfigured, startCheckout } from "@/lib/safepay";
import { supabaseAdmin } from "@/lib/supabase/admin";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  if (!safepayConfigured()) return bad("Online payment isn't set up yet. Please choose another payment method.", 503);

  // Order numbers are short and guessable, so knowing one must not be enough to start (and so replace) its payment:
  // the caller has to be the account the order was placed under.
  const customer = await getCustomer();
  if (!customer) return bad("Please log in to pay for your order.", 401);

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
    .select("id, order_no, total, pay_method, payment_status, email, mobile, safepay_tracker")
    .eq("order_no", orderNo)
    .single();

  const mine = !!order && (customer.email ? order.email === customer.email : order.mobile === customer.phone);
  if (error || !order || !mine || order.pay_method !== "safepay" || order.payment_status === "paid") {
    return bad("This order can't be paid online.");
  }

  // The order only remembers one tracker, and paying is matched back to the order through it. Before replacing
  // an earlier attempt, ask Safepay whether it was actually paid (e.g. the customer paid in another tab and is
  // retrying): if so the order is settled and a new tracker would only orphan that payment.
  const previous: string | null = order.safepay_tracker;
  if (previous && (await confirmPayment(previous).catch(() => null))?.paid) {
    return bad("This order has already been paid.", 409);
  }

  // A fresh Safepay tracker per attempt lets the customer retry after a failed/abandoned payment.
  let checkout: { tracker: string; url: string };
  try {
    checkout = await startCheckout({ orderNo: order.order_no, amountPkr: order.total });
  } catch (e) {
    console.error("safepay start failed", e);
    return bad("Could not start payment. Please try again.", 502);
  }

  // Swap only if the tracker is still the one we read, so two overlapping starts can't silently overwrite each other.
  const swap = db.from("orders").update({ safepay_tracker: checkout.tracker }).eq("id", order.id);
  const { data: swapped, error: updErr } = await (previous ? swap.eq("safepay_tracker", previous) : swap.is("safepay_tracker", null)).select("id");
  if (updErr) {
    console.error("safepay tracker update failed", updErr);
    return bad("Could not start payment. Please try again.", 500);
  }
  if (!swapped?.length) return bad("A payment for this order is already being started. Please wait a moment and try again.", 409);

  return NextResponse.json({ url: checkout.url });
}
