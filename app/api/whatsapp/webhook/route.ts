import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CODE_RE, normalizePhone } from "@/lib/waLogin";

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

type Payload = { entry?: { changes?: { value?: { messages?: { from?: string; type?: string; text?: { body?: string } }[] } }[] }[] };

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) return new Response("Forbidden", { status: 403 });

  let payload: Payload = {};
  try { payload = JSON.parse(raw); } catch { /* ignore, answer 200 below */ }

  const db = supabaseAdmin();
  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) for (const m of change.value?.messages ?? []) {
    if (m.type !== "text") continue;
    const code = m.text?.body?.toUpperCase().match(CODE_RE)?.[0];
    const sender = normalizePhone(m.from); // WhatsApp gives 923001234567
    if (!code || !sender) continue;
    // the sender's own number must be the one typed on the site, so nobody can log in as someone else
    await db.from("wa_login_sessions").update({ status: "verified" })
      .eq("code", code).eq("phone", sender).eq("status", "pending").gt("expires_at", new Date().toISOString());
  }
  return NextResponse.json({ ok: true }); // always 200, or Meta keeps retrying
}
