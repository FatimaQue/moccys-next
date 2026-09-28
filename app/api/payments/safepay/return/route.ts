import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/safepay";

// Safepay sends the customer's browser back here (redirect_url) after payment, with
// ?order_id=&tracker= (a GET; POST handled too). Nothing in the redirect is trusted — the
// tracker is looked up with Safepay itself before the order is marked paid.
async function handle(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const goTo = (path: string) => NextResponse.redirect(`${site}${path}`, 303);

  const fields = new URL(req.url).searchParams;
  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    form?.forEach((v, k) => fields.set(k, String(v)));
  }
  const tracker = fields.get("tracker") ?? "";

  const result = await confirmPayment(tracker).catch((e) => {
    console.error("safepay return: confirm failed", tracker, e);
    return null;
  });
  if (!result) return goTo("/checkout?safepay=failed");
  const order = encodeURIComponent(result.orderNo);
  return goTo(`/checkout?safepay=${result.paid ? "success" : "failed"}&order=${order}`);
}

export { handle as GET, handle as POST };
