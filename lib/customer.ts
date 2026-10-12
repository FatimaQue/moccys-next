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

  const hidden = /^customer-(\d+)@customer\.example\.com$/i.exec(user.email ?? ""); // WhatsApp accounts get a made-up one
  return {
    id: user.id,
    name: String(user.user_metadata?.full_name ?? ""),
    email: hidden ? null : (user.email?.toLowerCase() ?? null),
    // A WhatsApp account's number comes from its login email (set by the server after the WhatsApp check), never from
    // user_metadata: customers can edit their own metadata, so a number read from there proves nothing.
    phone: hidden ? normalizePhone(hidden[1]) : normalizePhone(user.user_metadata?.phone),
  };
}
