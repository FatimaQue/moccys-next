import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string; password?: string };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return bad("Please enter your email and password.");

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // one message for "no such account" and "wrong password" alike, so a login attempt can't be used to
  // discover which emails have accounts
  if (error) return bad("Incorrect email or password.", 401);
  return NextResponse.json({ ok: true });
}
