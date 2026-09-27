import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Row = { id: string; status: string; expires_at: string };

// the login page polls this only to know when it can switch from "waiting for your message" to "enter the code"
export async function POST(req: Request) {
  const { sid } = (await req.json().catch(() => ({}))) as { sid?: string };
  if (!sid || !/^[0-9a-f-]{36}$/i.test(sid)) return NextResponse.json({ status: "invalid" }, { status: 400 });

  const { data: row } = await supabaseAdmin().from("wa_otp_sessions").select("id, status, expires_at").eq("id", sid).maybeSingle<Row>();
  if (!row || new Date(row.expires_at).getTime() < Date.now() || row.status === "used") return NextResponse.json({ status: "expired" });
  return NextResponse.json({ status: row.status }); // "pending" or "sent"
}
