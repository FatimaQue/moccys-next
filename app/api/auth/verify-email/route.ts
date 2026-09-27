import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; code?: string };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!email || !/^\d{6}$/.test(code)) return bad("Please enter the 6-digit code.");

  // confirms the email and sets the session cookies in one go
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    if (error.status === 429) return bad("Too many tries. Please wait a minute and try again.", 429);
    return bad("That code is wrong or has expired.");
  }
  return NextResponse.json({ ok: true });
}
