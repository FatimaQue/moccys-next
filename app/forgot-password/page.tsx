import "../login/login.css";
import ForgotPasswordClient from "@/components/ForgotPasswordClient";

export const metadata = { title: "mccoy's — Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="pg-login">
      <ForgotPasswordClient />
    </div>
  );
}
