import { NextResponse } from "next/server";
import { markPaid, verifyRedirect } from "@/lib/safepay";

// Safepay sends the customer's browser back here (redirect_url) after a successful payment, with
// the tracker and its signature — posted as a form, or on the query string. The signature is
// checked here rather than trusting the redirect, since a browser-delivered callback can be edited.
async function handle(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const goTo = (path: string) => NextResponse.redirect(`${site}${path}`, 303);

  const fields = new URL(req.url).searchParams;
  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    form?.forEach((v, k) => fields.set(k, String(v)));
  }
  const tracker = fields.get("tracker") ?? "";
  const sig = fields.get("sig") ?? "";

  if (!verifyRedirect(tracker, sig)) {
    console.error("safepay return: bad signature", tracker);
    return goTo("/checkout?safepay=failed");
  }

  const orderNo = await markPaid(tracker);
  if (!orderNo) return goTo("/checkout?safepay=failed");
  return goTo(`/checkout?safepay=success&order=${encodeURIComponent(orderNo)}`);
}

export { handle as GET, handle as POST };
