import "server-only";
import crypto from "crypto";
import { logOrderEvent } from "@/lib/orderEvents";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Safepay hosted checkout (v1 "custom" flow) — the customer picks JazzCash, Easypaisa, bank
// account/Raast or card on Safepay's page. Same calls the official @sfpy/node-sdk makes, done
// with fetch so we don't pull in its old axios dependency.
const URLS = {
  sandbox: { api: "https://sandbox.api.getsafepay.com", checkout: "https://sandbox.api.getsafepay.com/checkout/pay" },
  production: { api: "https://api.getsafepay.com", checkout: "https://getsafepay.com/checkout/pay" },
};

function config() {
  const apiKey = process.env.SAFEPAY_API_KEY;
  const v1Secret = process.env.SAFEPAY_V1_SECRET;
  const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !v1Secret || !site) return null;
  const environment = process.env.SAFEPAY_ENV === "production" ? "production" : "sandbox";
  return { apiKey, v1Secret, webhookSecret, site, environment, ...URLS[environment] } as const;
}

// Lets the rest of the app check whether Safepay is set up yet without throwing.
export function safepayConfigured() {
  return config() !== null;
}

// Creates a Safepay payment for the order and returns its tracker plus the hosted page to send
// the customer to. Amounts are in rupees (not paisas) for the v1 API.
export async function startCheckout(opts: { orderNo: string; amountPkr: number }) {
  const cfg = config();
  if (!cfg) throw new Error("Safepay is not configured");

  const res = await fetch(`${cfg.api}/order/v1/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: opts.amountPkr, client: cfg.apiKey, currency: "PKR", environment: cfg.environment }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  const tracker: unknown = json?.data?.token;
  if (!res.ok || typeof tracker !== "string") {
    throw new Error(`Safepay init failed (${res.status}): ${JSON.stringify(json?.status ?? json)}`);
  }

  const params = new URLSearchParams({
    beacon: tracker,
    cancel_url: `${cfg.site}/checkout?safepay=cancelled&order=${encodeURIComponent(opts.orderNo)}`,
    env: cfg.environment,
    order_id: opts.orderNo,
    redirect_url: `${cfg.site}/api/payments/safepay/return`,
    source: "custom",
    webhooks: "true",
  });
  return { tracker, url: `${cfg.checkout}?${params}` };
}

function safeEqualHex(given: string, expected: string) {
  try {
    const a = Buffer.from(given, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// The redirect back from Safepay carries sig = HMAC-SHA256(tracker, v1 secret), so a forged or
// edited return URL can't mark an order paid.
export function verifyRedirect(tracker: string, sig: string) {
  const cfg = config();
  if (!cfg || !tracker || !sig) return false;
  return safeEqualHex(sig, crypto.createHmac("sha256", cfg.v1Secret).update(tracker).digest("hex"));
}

// Webhooks carry x-sfpy-signature = HMAC-SHA512(JSON.stringify(body.data), webhook secret).
export function verifyWebhook(data: unknown, signature: string | null) {
  const cfg = config();
  if (!cfg?.webhookSecret || !signature) return false;
  const expected = crypto.createHmac("sha512", cfg.webhookSecret).update(JSON.stringify(data)).digest("hex");
  return safeEqualHex(signature, expected);
}

// Marks the order with this tracker paid and tells the admin board about it. Both the browser
// redirect and the webhook call this, often at the same moment, so the update only matches an
// order that isn't paid yet — whichever arrives second changes nothing and logs nothing.
export async function markPaid(tracker: string) {
  const db = supabaseAdmin();
  const { data: order } = await db
    .from("orders")
    .update({ payment_status: "paid", paid_at: new Date().toISOString() })
    .eq("safepay_tracker", tracker)
    .neq("payment_status", "paid")
    .select("id, order_no, total, customer_name")
    .maybeSingle();

  if (order) {
    // Only now does the order become visible to the kitchen — see app/api/admin/orders/route.ts.
    await logOrderEvent({
      orderId: order.id, orderNo: order.order_no, kind: "new_order", actor: "Customer",
      message: `New order ${order.order_no} from ${order.customer_name} — Rs. ${order.total.toLocaleString("en-US")}, paid online via Safepay, waiting for approval`,
    });
    return order.order_no as string;
  }

  const { data: existing } = await db.from("orders").select("order_no").eq("safepay_tracker", tracker).maybeSingle();
  return (existing?.order_no as string | undefined) ?? null;
}
