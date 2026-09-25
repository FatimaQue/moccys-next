import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";

export const PIN_RE = /^\d{6}$/;
export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

// 03001234567, +92 300 1234567 and 923001234567 are all the same driver
export function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("0092")) d = d.slice(4);
  else if (d.startsWith("92") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("3")) d = "0" + d;
  return /^03\d{9}$/.test(d) ? d : null;
}

export const normalizeName = (s: unknown) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export function hashPin(pin: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyPin(pin: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(pin, Buffer.from(salt, "hex"), 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Supabase Auth needs an email + password, so every driver gets a hidden pair that nobody types.
// The password is derived from a server secret, so it can't be guessed; the real gate is the PIN check above.
export const driverEmail = (phone: string) => `driver-${phone}@driver.example.com`;
export const driverPassword = (phone: string) =>
  createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`driver-login:${phone}`).digest("hex");

export async function startDriverSession(phone: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: driverEmail(phone), password: driverPassword(phone) });
  if (error) console.error("driver session failed", error.message);
  return !error;
}

export type DriverRow = { id: string; name: string; pin_hash: string | null; active: boolean | null; failed_attempts: number; locked_until: string | null };

export async function findDriver(phone: string) {
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("id, name, pin_hash, active, failed_attempts, locked_until")
    .eq("phone", phone)
    .eq("role", "driver")
    .maybeSingle<DriverRow>();
  return data;
}

export const isLocked = (d: DriverRow) => !!d.locked_until && new Date(d.locked_until).getTime() > Date.now();

// count a wrong attempt; the fifth one in a row locks the number for a while
export async function recordFailure(d: DriverRow) {
  const attempts = d.failed_attempts + 1;
  const lock = attempts >= MAX_ATTEMPTS;
  await supabaseAdmin()
    .from("profiles")
    .update({ failed_attempts: lock ? 0 : attempts, locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null })
    .eq("id", d.id);
}

export const clearFailures = (id: string) =>
  supabaseAdmin().from("profiles").update({ failed_attempts: 0, locked_until: null }).eq("id", id);
