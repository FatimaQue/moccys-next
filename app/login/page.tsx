import "./login.css";
import LoginClient from "@/components/LoginClient";

export const metadata = { title: "mccoy's — Login" };

export default function LoginPage() {
  return (
    <div className="pg-login">
      <LoginClient />
    </div>
  );
}
