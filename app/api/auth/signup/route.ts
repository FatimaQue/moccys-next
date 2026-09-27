import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/staffAuth";
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

  // a real signUp (not the admin API) is what makes Supabase actually send the "Confirm signup" email
  // with the 6-digit code — the account stays unconfirmed, and can't sign in, until that code is verified
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { role: "customer", full_name: `${firstName} ${lastName}`, phone } },
  });
  if (error) {
    console.error("signup failed", error.message);
    return bad("Could not create your account. Please try again.", 500);
  }
  // an email that's already registered and confirmed signs up again with no error and no identities —
  // Supabase's way of not leaking which emails exist; we still want to tell our own customer clearly
  if (data.user && data.user.identities?.length === 0) {
    return bad("An account with that email already exists. Please log in instead.", 409);
  }

  return NextResponse.json({ ok: true });
}
