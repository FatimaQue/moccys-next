import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { WA_MAX_STARTS, WA_TTL_MINUTES, newCode, normalizePhone } from "@/lib/waLogin";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = normalizePhone(body.phone);
  if (!phone) return NextResponse.json({ error: "Please enter a valid mobile number, like 0300 1234567." }, { status: 400 });

  const number = (process.env.WHATSAPP_LOGIN_NUMBER || "").replace(/\D/g, "");
  if (!number) return NextResponse.json({ error: "WhatsApp login is not set up yet." }, { status: 503 });

  const db = supabaseAdmin();
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db.from("wa_login_sessions").select("*", { count: "exact", head: true }).eq("phone", phone).gte("created_at", since);
  if ((count ?? 0) >= WA_MAX_STARTS) return NextResponse.json({ error: "Too many tries. Please wait a few minutes." }, { status: 429 });

  const code = newCode();
  const { data, error } = await db
    .from("wa_login_sessions")
    .insert({ phone, code, expires_at: new Date(Date.now() + WA_TTL_MINUTES * 60_000).toISOString() })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return NextResponse.json({ error: "Could not start login. Please try again." }, { status: 500 });

  const text = encodeURIComponent(`Verify ${code}`);
  return NextResponse.json({ sid: data.id, code, url: `https://wa.me/${number}?text=${text}`, expiresInMinutes: WA_TTL_MINUTES });
}
