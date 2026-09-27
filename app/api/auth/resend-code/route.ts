import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error?.status === 429) {
    console.warn("resend code rate limited", error.code, error.message);
    const msg = error.code === "over_email_send_rate_limit"
      ? "We're sending a lot of emails right now. Please try again in a little while."
      : "Please wait a minute before requesting another code.";
    return NextResponse.json({ error: msg }, { status: 429 });
  }
  // anything else (no such account, already confirmed) looks like success, so this can't be used to
  // discover which emails have accounts
  if (error) console.error("resend code failed", error.message);
  return NextResponse.json({ ok: true });
}
