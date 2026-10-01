import "server-only";
import { normalizePhone } from "./staffAuth";
import { supabaseServer } from "./supabase/server";

export type Customer = {
  id: string;
  name: string;
  // the OTP-verified email of an email account; null for a phone-only (WhatsApp) account
  email: string | null;
  phone: string | null;
};

// The signed-in customer, or null. Orders require one: an email account has proved its address with the emailed
// code, a WhatsApp account has proved its number, so that verified contact is what an order is tied to and
// what the order limits count against.
export async function getCustomer(): Promise<Customer | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.user_metadata?.role !== "customer") return null;

  const hiddenEmail = /@customer\.example\.com$/i.test(user.email ?? ""); // WhatsApp accounts get a made-up one
  return {
    id: user.id,
    name: String(user.user_metadata?.full_name ?? ""),
    email: hiddenEmail ? null : (user.email?.toLowerCase() ?? null),
    phone: normalizePhone(user.user_metadata?.phone),
  };
}
