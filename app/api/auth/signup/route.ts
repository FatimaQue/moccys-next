import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/staffAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // Supabase Auth (bcrypt underneath) only looks at the first 72 characters anyway

type Body = { firstName?: string; lastName?: string; email?: string; phone?: string; password?: string; confirmPassword?: string };

export async function POST(req: Request) {
  let b: Body;
  try {
    b = await req.json();
  } catch {
    return bad("Invalid request.");
  }

  const firstName = clean(b.firstName, 60);
  const lastName = clean(b.lastName, 60);
  const email = clean(b.email, 150).toLowerCase();
  const phone = normalizePhone(b.phone);
  const password = typeof b.password === "string" ? b.password : "";
  const confirmPassword = typeof b.confirmPassword === "string" ? b.confirmPassword : "";

  if (!firstName || !lastName) return bad("Please enter your first and last name.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad("Please enter a valid email address.");
  if (!phone) return bad("Please enter a valid mobile number (03XXXXXXXXX).");
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) return bad(`Password must be at least ${MIN_PASSWORD} characters.`);
  if (password !== confirmPassword) return bad("Passwords don't match.");

  // email_confirm skips the "click the link we emailed you" step, same call as lib/waLogin.ts /
  // lib/staffAuth.ts make for their own accounts — this app doesn't gate any login on email confirmation
  const { error: createErr } = await supabaseAdmin().auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { role: "customer", full_name: `${firstName} ${lastName}`, phone },
  });
  if (createErr) {
    if (/already|registered/i.test(createErr.message)) {
      return bad("An account with that email already exists. Please log in instead.", 409);
    }
    console.error("signup failed", createErr.message);
    return bad("Could not create your account. Please try again.", 500);
  }

  const supabase = await supabaseServer();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    console.error("post-signup sign-in failed", signInErr.message);
    return bad("Your account was created, but we couldn't sign you in automatically. Please log in.", 500);
  }
  return NextResponse.json({ ok: true });
}
