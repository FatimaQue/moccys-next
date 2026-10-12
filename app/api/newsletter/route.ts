import { NextResponse } from "next/server";
import { clientIp, tooMany } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase/admin";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as { email?: string };
  if (tooMany(`newsletter:${clientIp(req)}`, 5, 60_000)) return bad("Too many tries. Please wait a minute and try again.", 429);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 150 || !/^\S+@\S+\.\S+$/.test(email)) return bad("Please enter a valid email address.");

  const { error } = await supabaseAdmin().from("newsletter_subscribers").insert({ email });
  // already on the list — same success response, so this can't be used to check who's subscribed
  if (error && error.code !== "23505") {
    console.error("newsletter subscribe failed", error);
    return NextResponse.json({ error: "Could not subscribe. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
