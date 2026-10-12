import "./checkout.css";
import CheckoutClient from "@/components/CheckoutClient";
import { getCustomer } from "@/lib/customer";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isOpenNow } from "@/lib/hours";
import { safepayConfigured } from "@/lib/safepay";
import { readSavedAddresses } from "@/lib/savedAddresses";

export const metadata = { title: "mccoy's — Checkout" };
export const dynamic = "force-dynamic"; // depends on who is signed in and what time it is

type Search = { [key: string]: string | string[] | undefined };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Search> }) {
  const customer = await getCustomer();
  // the addresses saved under My Account, offered in the delivery address field
  const meta = customer ? (await (await supabaseServer()).auth.getUser()).data.user?.user_metadata : null;
  const addresses = readSavedAddresses(meta?.addresses);

  // Coming back from Safepay the URL says how it went, but anyone can type that URL. "Success" is only shown when the
  // order really belongs to this account and is really marked paid; the other outcomes carry no order number at all.
  const q = await searchParams;
  const result = first(q.safepay);
  const orderNo = first(q.order) ?? "";
  let safepayReturn: { result: "success" | "failed" | "cancelled"; orderNo: string | null } | null = null;
  if (customer && (result === "failed" || result === "cancelled")) {
    safepayReturn = { result, orderNo: null };
  } else if (customer && result === "success" && /^#\d{6}$/.test(orderNo)) {
    const { data: order } = await supabaseAdmin()
      .from("orders")
      .select("order_no, email, mobile, pay_method, payment_status")
      .eq("order_no", orderNo)
      .maybeSingle();
    const mine = !!order && (customer.email ? order.email === customer.email : order.mobile === customer.phone);
    if (order && mine && order.pay_method === "safepay" && order.payment_status === "paid") {
      safepayReturn = { result: "success", orderNo: order.order_no };
    }
  }

  return (
    <div className="pg-checkout">
      <CheckoutClient
        onlinePay={safepayConfigured()}
        open={isOpenNow()}
        savedAddresses={addresses}
        safepayReturn={safepayReturn}
        customer={customer && { name: customer.name, email: customer.email, phone: customer.phone }}
      />
    </div>
  );
}
