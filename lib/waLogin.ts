import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { normalizePhone } from "./driverPin";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";

export const WA_TTL_MINUTES = 5;
export const WA_MAX_STARTS = 5; // per phone per 10 minutes

// no 0/O/1/I so the code is easy to read off the screen
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_RE = /\b[2-9A-HJ-NP-Z]{6}\b/;

export const newCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

// Supabase Auth needs an email + password, so every customer gets a hidden pair nobody types (same idea as drivers).
// The password is derived from a server secret; the real gate is the WhatsApp check.
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
