import "./checkout.css";
import CheckoutClient from "@/components/CheckoutClient";

export const metadata = { title: "mccoy's — Checkout" };

export default function CheckoutPage() {
  return (
    <div className="pg-checkout">
      <CheckoutClient />
    </div>
  );
}
