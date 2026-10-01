import "../login/login.css";
import SignupClient from "@/components/SignupClient";
import { safeNext } from "@/lib/nextPath";

export const metadata = { title: "mccoy's — Sign Up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="pg-login">
      <SignupClient next={safeNext(next)} />
    </div>
  );
}
