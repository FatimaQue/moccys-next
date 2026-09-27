import { NextResponse } from "next/server";
import { logOrderEvent } from "@/lib/orderEvents";
import { verifyReturn } from "@/lib/jazzcash";
import { supabaseAdmin } from "@/lib/supabase/admin";

// JazzCash's hosted checkout page POSTs the customer's browser back here (pp_ReturnURL) once
// they've confirmed or cancelled the payment. This must verify the secure hash itself rather
// than trusting the redirect, since a browser-delivered callback can be replayed or edited.
export async function POST(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const goTo = (path: string) => NextResponse.redirect(`${site}${path}`, 303);

  const form = await req.formData().catch(() => null);
  if (!form) return goTo("/checkout?jazzcash=failed");

  const fields: Record<string, string> = {};
  form.forEach((v, k) => { fields[k] = String(v); });

  if (!verifyReturn(fields)) {
    console.error("jazzcash return: bad secure hash", fields.pp_TxnRefNo);
    return goTo("/checkout?jazzcash=failed");
  }

  const txnRefNo = fields.pp_TxnRefNo;
  const db = supabaseAdmin();
  const { data: order } = await db
    .from("orders")
    .select("id, order_no, payment_status, total, customer_name")
    .eq("jazzcash_txn_ref", txnRefNo)
    .single();

  if (!order) return goTo("/checkout?jazzcash=failed");

  // JazzCash can post the same callback more than once; only act on it the first time.
  if (order.payment_status === "paid") return goTo(`/checkout?jazzcash=success&order=${order.order_no}`);

  const success = fields.pp_ResponseCode === "000";
  if (!success) {
    await db.from("orders").update({ payment_status: "failed", jazzcash_response_code: fields.pp_ResponseCode ?? null }).eq("id", order.id);
    return goTo(`/checkout?jazzcash=failed&order=${order.order_no}`);
  }

  await db.from("orders").update({
    payment_status: "paid",
    jazzcash_response_code: fields.pp_ResponseCode,
    paid_at: new Date().toISOString(),
  }).eq("id", order.id);

  // Only now does the order become visible to the kitchen — see app/api/admin/orders/route.ts.
  await logOrderEvent({
    orderId: order.id, orderNo: order.order_no, kind: "new_order", actor: "Customer",
    message: `New order ${order.order_no} from ${order.customer_name} — Rs. ${order.total.toLocaleString("en-US")}, paid via JazzCash, waiting for approval`,
  });

  return goTo(`/checkout?jazzcash=success&order=${order.order_no}`);
}
