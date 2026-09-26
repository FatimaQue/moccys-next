import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { startCustomerSession } from "@/lib/waLogin";

type Row = { id: string; phone: string; status: string; expires_at: string };

export async function POST(req: Request) {
  const { sid } = (await req.json().catch(() => ({}))) as { sid?: string };
  if (!sid || !/^[0-9a-f-]{36}$/i.test(sid)) return NextResponse.json({ status: "invalid" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: row } = await db.from("wa_login_sessions").select("id, phone, status, expires_at").eq("id", sid).maybeSingle<Row>();
  if (!row || new Date(row.expires_at).getTime() < Date.now() || row.status === "used") return NextResponse.json({ status: "expired" });
  if (row.status !== "verified") return NextResponse.json({ status: "pending" });

  // claim it exactly once, so a replayed poll can't sign in twice
  const { data: claimed } = await db.from("wa_login_sessions").update({ status: "used" }).eq("id", sid).eq("status", "verified").select("id");
  if (!claimed?.length) return NextResponse.json({ status: "expired" });

  if (!(await startCustomerSession(row.phone))) return NextResponse.json({ error: "Could not sign you in. Please try again." }, { status: 500 });
  return NextResponse.json({ status: "ok" });
}
