import "server-only";
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
  const secretKey = process.env.SAFEPAY_V1_SECRET;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!apiKey || !site) return null;
  const environment = process.env.SAFEPAY_ENV === "production" ? "production" : "sandbox";
  return { apiKey, secretKey, site, environment, ...URLS[environment] } as const;
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

type Tracker = { state?: string; amount?: number; currency?: string; client?: string; transaction?: { token?: string } | null };

// Asks Safepay itself for the tracker's current state. The browser redirect only carries
// ?order_id=&tracker= (no signature), so it's never trusted on its own — this is the proof.
async function fetchTracker(tracker: string): Promise<Tracker | null> {
  const cfg = config();
  if (!cfg) return null;
  const res = await fetch(`${cfg.api}/order/v1/${encodeURIComponent(tracker)}`, {
    headers: cfg.secretKey ? { "X-SFPY-MERCHANT-SECRET": cfg.secretKey } : {},
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.data ?? null;
}

// Checks with Safepay whether the order behind this tracker was paid, and if so marks it paid and
// tells the admin board. Both the browser redirect and the webhook call this, often at the same
// moment, so the update only matches an order that isn't paid yet — whichever arrives second
// changes nothing and logs nothing. Returns null when no order has this tracker.
export async function confirmPayment(tracker: string): Promise<{ orderNo: string; paid: boolean } | null> {
  const cfg = config();
  if (!cfg || !/^track_[\w-]+$/.test(tracker)) return null;

  const db = supabaseAdmin();
  const { data: order } = await db
    .from("orders")
    .select("id, order_no, total, customer_name, payment_status")
    .eq("safepay_tracker", tracker)
    .maybeSingle();
  if (!order) return null;
  if (order.payment_status === "paid") return { orderNo: order.order_no, paid: true };

  // TRACKER_ENDED with a transaction = paid; it must also be our account and the full order amount
  const t = await fetchTracker(tracker);
  const paid = t?.state === "TRACKER_ENDED" && !!t.transaction && t.client === cfg.apiKey
    && t.currency === "PKR" && Number(t.amount) === Number(order.total);
  if (!paid) {
    console.error("safepay: tracker not paid", tracker, order.order_no, t?.state, t?.amount, order.total);
    return { orderNo: order.order_no, paid: false };
  }

  const { data: updated } = await db
    .from("orders")
    .update({ payment_status: "paid", paid_at: new Date().toISOString() })
    .eq("id", order.id)
    .neq("payment_status", "paid")
    .select("id")
    .maybeSingle();
  if (updated) {
    // Only now does the order become visible to the kitchen — see app/api/admin/orders/route.ts.
    await logOrderEvent({
      orderId: order.id, orderNo: order.order_no, kind: "new_order", actor: "Customer",
      message: `New order ${order.order_no} from ${order.customer_name} — Rs. ${order.total.toLocaleString("en-US")}, paid online via Safepay, waiting for approval`,
    });
  }
  return { orderNo: order.order_no, paid: true };
}
