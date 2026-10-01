import "./checkout.css";
import CheckoutClient from "@/components/CheckoutClient";
import { getCustomer } from "@/lib/customer";
import { isOpenNow } from "@/lib/hours";
import { safepayConfigured } from "@/lib/safepay";

export const metadata = { title: "mccoy's — Checkout" };
export const dynamic = "force-dynamic"; // depends on who is signed in and what time it is

export default async function CheckoutPage() {
  const customer = await getCustomer();
  return (
    <div className="pg-checkout">
      <CheckoutClient
        onlinePay={safepayConfigured()}
        open={isOpenNow()}
        customer={customer && { name: customer.name, email: customer.email, phone: customer.phone }}
      />
    </div>
  );
}
