import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { normalizePhone } from "./staffAuth";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";

export const SESSION_TTL_MINUTES = 10; // whole login attempt (message + typing the code) has to finish inside this
export const CODE_TTL_MINUTES = 5;     // the code itself, once texted out
export const MAX_ATTEMPTS = 5;         // wrong codes before the session is dead
export const MAX_SENDS = 5;            // codes we'll text out for one session, so it can't be used to spam a stranger's number

export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export const hashOtp = (phone: string, code: string) =>
  createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`otp:${phone}:${code}`).digest("hex");

export function otpMatches(phone: string, code: string, hash: string) {
  const a = Buffer.from(hashOtp(phone, code));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

// sends a plain WhatsApp text; only legal within 24h of the customer's own last message to us (their reply to
// our login prompt keeps that window open), which is exactly when this gets called
export async function sendWhatsAppText(phone: string, body: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.error("sendWhatsAppText: WHATSAPP_TOKEN / WHATSAPP_PHONE_ID not set");
    return false;
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone.replace(/\D/g, ""), type: "text", text: { body } }),
  });
  if (!res.ok) console.error("sendWhatsAppText failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}

// Supabase Auth needs an email + password, so every customer gets a hidden pair nobody types (same idea as drivers).
// The password is derived from a server secret; the real gate is the WhatsApp code check.
const customerEmail = (phone: string) => `customer-${phone}@customer.example.com`;
const customerPassword = (phone: string) =>
  createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`customer-login:${phone}`).digest("hex");

export async function startCustomerSession(phone: string) {
  const supabase = await supabaseServer();
  const creds = { email: customerEmail(phone), password: customerPassword(phone) };
  let { error } = await supabase.auth.signInWithPassword(creds);
  if (error) {
    // first login for this number: create the account, then sign in
    const { error: createErr } = await supabaseAdmin().auth.admin.createUser({
      ...creds, email_confirm: true, user_metadata: { phone, role: "customer" },
    });
    if (createErr && !/already|registered/i.test(createErr.message)) {
      console.error("customer create failed", createErr.message);
      return false;
    }
    ({ error } = await supabase.auth.signInWithPassword(creds));
  }
  if (error) console.error("customer session failed", error.message);
  return !error;
}

export { normalizePhone };
