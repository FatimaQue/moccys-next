import "./checkout.css";
import CheckoutClient from "@/components/CheckoutClient";
import { getCustomer } from "@/lib/customer";
import { supabaseServer } from "@/lib/supabase/server";
import { isOpenNow } from "@/lib/hours";
import { safepayConfigured } from "@/lib/safepay";

export const metadata = { title: "mccoy's — Checkout" };
export const dynamic = "force-dynamic"; // depends on who is signed in and what time it is

export default async function CheckoutPage() {
  const customer = await getCustomer();
  // the addresses saved under My Account, offered in the delivery address field
  const meta = customer ? (await (await supabaseServer()).auth.getUser()).data.user?.user_metadata : null;
  const addresses = Array.isArray(meta?.addresses) ? (meta.addresses as { label: string; address: string }[]) : [];
  return (
    <div className="pg-checkout">
      <CheckoutClient
        onlinePay={safepayConfigured()}
        open={isOpenNow()}
        savedAddresses={addresses}
        customer={customer && { name: customer.name, email: customer.email, phone: customer.phone }}
      />
    </div>
  );
}
