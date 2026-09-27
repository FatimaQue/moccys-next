import "../login/login.css";
import ResetPasswordClient from "@/components/ResetPasswordClient";

export const metadata = { title: "mccoy's — Reset Password" };

export default function ResetPasswordPage() {
  return (
    <div className="pg-login">
      <ResetPasswordClient />
    </div>
  );
}
