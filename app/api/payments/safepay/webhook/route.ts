import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/safepay";

type Notification = { tracker?: string; token?: string };
type Payload = { data?: { tracker?: string; token?: string; notification?: Notification }; tracker?: string };

// Safepay calls this server-to-server when a payment changes, so an order still gets marked paid
// when the customer closes the tab before the browser redirect lands. Set this URL
// (<site>/api/payments/safepay/webhook) under Developer -> Endpoints in the Safepay dashboard.
// The payload only tells us which tracker to check — confirmPayment asks Safepay whether it was
// actually paid, so a forged call can't mark anything paid.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Payload | null;
  // TEMP: checking whether Safepay's webhook payload already carries payment_method/instrument
  // details (card/JazzCash/Easypaisa/bank) so the reports "Account" column can show them — remove
  // this once we've inspected a real payload in the Vercel logs.
  console.info("safepay webhook payload", JSON.stringify(body));
  const d = body?.data;
  const tracker = [d?.notification?.tracker, d?.notification?.token, d?.tracker, d?.token, body?.tracker]
    .find((t): t is string => typeof t === "string" && t.startsWith("track_"));

  if (!tracker) {
    console.info("safepay webhook without a tracker ignored");
    return NextResponse.json({ ok: true });
  }
  const result = await confirmPayment(tracker).catch((e) => {
    console.error("safepay webhook: confirm failed", tracker, e);
    return undefined;
  });
  // a 500 makes Safepay retry later; unknown trackers/unpaid states are acknowledged
  if (result === undefined) return NextResponse.json({ error: "Try again" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
