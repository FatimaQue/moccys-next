import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/staffAuth";
import { supabaseServer } from "@/lib/supabase/server";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const ALREADY = "An account with that email already exists. Please log in instead.";
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

  // with "Confirm email" on in Supabase, signUp creates the account unconfirmed and emails a 6-digit code
  // (Confirm signup template uses {{ .Token }}); no session until /api/auth/verify-email checks it
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { role: "customer", full_name: `${firstName} ${lastName}`, phone } },
  });
  if (error) {
    if (error.status === 429) {
      // over_email_send_rate_limit = project-wide hourly email cap (tiny on Supabase's built-in mailer);
      // anything else here is the per-address 60s gap between codes
      console.warn("signup rate limited", error.code, error.message);
      return bad(error.code === "over_email_send_rate_limit"
        ? "We're sending a lot of emails right now. Please try again in a little while."
        : "Please wait a minute before requesting another code.", 429);
    }
    if (/already|registered/i.test(error.message)) return bad(ALREADY, 409);
    console.error("signup failed", error.message);
    return bad("Could not create your account. Please try again.", 500);
  }
  // a confirmed account with this email already exists: Supabase returns a fake user with no identities
  // instead of an error. An unconfirmed one just gets a fresh code, which is what we want.
  if (!data.user?.identities?.length) return bad(ALREADY, 409);

  return NextResponse.json({ ok: true, verify: true });
}
