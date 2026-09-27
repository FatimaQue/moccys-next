import "./checkout.css";
import CheckoutClient from "@/components/CheckoutClient";
import { safepayConfigured } from "@/lib/safepay";

export const metadata = { title: "mccoy's — Checkout" };

export default function CheckoutPage() {
  return (
    <div className="pg-checkout">
      <CheckoutClient onlinePay={safepayConfigured()} />
    </div>
  );
}
