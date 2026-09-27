import "../login/login.css";
import SignupClient from "@/components/SignupClient";

export const metadata = { title: "mccoy's — Sign Up" };

export default function SignupPage() {
  return (
    <div className="pg-login">
      <SignupClient />
    </div>
  );
}
