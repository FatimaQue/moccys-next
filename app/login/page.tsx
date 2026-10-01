import "./login.css";
import LoginClient from "@/components/LoginClient";
import { safeNext } from "@/lib/nextPath";

export const metadata = { title: "mccoy's — Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="pg-login">
      <LoginClient next={safeNext(next)} />
    </div>
  );
}
