import { NextResponse } from "next/server";
import { markPaid, verifyWebhook } from "@/lib/safepay";

type Notification = { tracker?: string; token?: string; state?: string };
type Payload = { data?: { type?: string; tracker?: string; notification?: Notification } };

// Safepay calls this server-to-server once a payment goes through, so an order still gets marked
// paid when the customer closes the tab before the browser redirect lands. Set this URL
// (<site>/api/payments/safepay/webhook) in the Safepay dashboard.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.data || !verifyWebhook(body.data, req.headers.get("x-sfpy-signature"))) {
    console.error("safepay webhook: bad signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { type, notification } = body.data;
  const tracker = notification?.tracker ?? notification?.token ?? body.data.tracker;
  // only a completed payment marks the order paid; every other event is acknowledged and ignored
  const paid = type === "payment:created" || notification?.state === "PAID" || notification?.state === "TRACKER_ENDED";
  if (paid && tracker) await markPaid(tracker);
  else console.info("safepay webhook ignored", type, notification?.state);

  return NextResponse.json({ ok: true });
}
