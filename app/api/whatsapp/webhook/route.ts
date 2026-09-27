import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CODE_TTL_MINUTES, hashOtp, MAX_SENDS, newOtp, normalizePhone, sendWhatsAppText } from "@/lib/waLogin";

// Meta calls this once when you save the webhook in the developer console
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const ok = q.get("hub.mode") === "subscribe" && !!process.env.WHATSAPP_VERIFY_TOKEN && q.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN;
  return ok ? new Response(q.get("hub.challenge") ?? "", { status: 200 }) : new Response("Forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const a = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const b = Buffer.from(header.slice(7));
  return a.length === b.length && timingSafeEqual(a, b);
}

type Payload = { entry?: { changes?: { value?: { messages?: { from?: string; type?: string }[] } }[] }[] };
type Row = { id: string; status: string; send_count: number; expires_at: string };

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) return new Response("Forbidden", { status: 403 });

  let payload: Payload = {};
  try { payload = JSON.parse(raw); } catch { /* ignore, answer 200 below */ }

  const db = supabaseAdmin();
  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) for (const m of change.value?.messages ?? []) {
    const phone = normalizePhone(m.from); // WhatsApp gives 923001234567
    if (!phone) continue;

    // whatever they sent — text, a tap on a button, anything — counts as proving they own the number;
    // we only care that it's from them, not what it says
    const { data: row } = await db
      .from("wa_otp_sessions")
      .select("id, status, send_count, expires_at")
      .eq("phone", phone).in("status", ["pending", "sent"])
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Row>();
    if (!row || row.send_count >= MAX_SENDS) continue;

    const code = newOtp();
    await db.from("wa_otp_sessions").update({
      code_hash: hashOtp(phone, code), status: "sent",
      code_sent_at: new Date().toISOString(), send_count: row.send_count + 1, attempts: 0,
    }).eq("id", row.id);

    await sendWhatsAppText(phone, `${code} is your mccoy's login code. It expires in ${CODE_TTL_MINUTES} minutes. Don't share it with anyone.`);
  }
  return NextResponse.json({ ok: true }); // always 200, or Meta keeps retrying
}
