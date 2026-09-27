import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MAX_ATTEMPTS, otpMatches, startCustomerSession } from "@/lib/waLogin";

const WRONG = "That code is wrong. Please check WhatsApp and try again.";

type Row = { id: string; phone: string; code_hash: string | null; status: string; attempts: number; expires_at: string };

export async function POST(req: Request) {
  const { sid, code } = (await req.json().catch(() => ({}))) as { sid?: string; code?: string };
  const typed = String(code ?? "").trim();
  if (!sid || !/^[0-9a-f-]{36}$/i.test(sid) || !/^\d{6}$/.test(typed)) {
    return NextResponse.json({ error: "Please enter the 6-digit code." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: row } = await db.from("wa_otp_sessions").select("id, phone, code_hash, status, attempts, expires_at").eq("id", sid).maybeSingle<Row>();
  if (!row || new Date(row.expires_at).getTime() < Date.now() || row.status !== "sent" || !row.code_hash) {
    return NextResponse.json({ error: "That code expired. Please start again." }, { status: 410 });
  }
  if (row.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "Too many wrong tries. Please start again." }, { status: 429 });

  if (!otpMatches(row.phone, typed, row.code_hash)) {
    await db.from("wa_otp_sessions").update({ attempts: row.attempts + 1 }).eq("id", sid);
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }

  // claim it exactly once, so a replayed request can't sign in twice
  const { data: claimed } = await db.from("wa_otp_sessions").update({ status: "used" }).eq("id", sid).eq("status", "sent").select("id");
  if (!claimed?.length) return NextResponse.json({ error: "That code expired. Please start again." }, { status: 410 });

  if (!(await startCustomerSession(row.phone))) return NextResponse.json({ error: "Could not sign you in. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
