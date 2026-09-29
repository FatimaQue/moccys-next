import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";

export type StaffRole = "admin" | "driver"; // "driver" is shown to users as "Rider"; the database value is unchanged

export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD = 4;
export const MAX_PASSWORD = 40;
export const MIN_USERNAME = 3;
export const MAX_USERNAME = 20;

// 03001234567, +92 300 1234567 and 923001234567 are all the same person
export function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("0092")) d = d.slice(4);
  else if (d.startsWith("92") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("3")) d = "0" + d;
  return /^03\d{9}$/.test(d) ? d : null;
}

// admin/driver login identifier, chosen by the admin when adding staff. Lowercase letters, digits,
// dot/underscore/hyphen, 3-20 chars, must start and end with a letter or digit (so a stray leading/
// trailing "." or "_" can't create a near-duplicate of another username). Always normalized to
// lowercase so storage, uniqueness, and lookups never have to special-case case sensitivity.
export function normalizeUsername(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{1,18}[a-z0-9]$/.test(s) ? s : null;
}

export const normalizeName = (s: unknown) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
export const validPassword = (s: unknown): s is string => typeof s === "string" && s.length >= MIN_PASSWORD && s.length <= MAX_PASSWORD;

export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pw, salt, 32).toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(pw, Buffer.from(salt, "hex"), 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Supabase Auth needs an email + password, so every phone-login account (admin or rider) gets a hidden pair
// nobody types. The password is derived from a server secret, so it can't be guessed; the real gate is the
// phone + password check above. For role "driver" this reproduces the exact format already in use, so
// existing driver accounts keep working unchanged.
export const staffEmail = (role: StaffRole, phone: string) => `${role}-${phone}@${role}.example.com`;
export const staffPassword = (role: StaffRole, phone: string) =>
  createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`${role}-login:${phone}`).digest("hex");

export type StaffRow = {
  id: string; role: StaffRole; name: string; phone: string | null; username: string | null; active: boolean | null;
  password_hash: string | null; failed_attempts: number; locked_until: string | null;
};

// used to sign in, once a username has been chosen
export async function findStaffByUsername(username: string) {
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("id, role, name, phone, username, active, password_hash, failed_attempts, locked_until")
    .eq("username", username)
    .in("role", ["admin", "driver"])
    .maybeSingle<StaffRow>();
  return data;
}

// used only for first-time claim — the admin registers someone by name + phone, before that person has
// picked a username, so phone is the only way to find their row at that point
export async function findStaffByPhone(phone: string) {
  const { data } = await supabaseAdmin()
    .from("profiles")
    .select("id, role, name, phone, username, active, password_hash, failed_attempts, locked_until")
    .eq("phone", phone)
    .in("role", ["admin", "driver"])
    .maybeSingle<StaffRow>();
  return data;
}

export const isLocked = (s: StaffRow) => !!s.locked_until && new Date(s.locked_until).getTime() > Date.now();

export async function recordFailure(s: StaffRow) {
  const attempts = s.failed_attempts + 1;
  const patch: Record<string, unknown> = { failed_attempts: attempts };
  if (attempts >= MAX_ATTEMPTS) patch.locked_until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
  await supabaseAdmin().from("profiles").update(patch).eq("id", s.id);
}

export const clearFailures = (id: string) =>
  supabaseAdmin().from("profiles").update({ failed_attempts: 0, locked_until: null }).eq("id", id);

export async function startStaffSession(role: StaffRole, phone: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: staffEmail(role, phone), password: staffPassword(role, phone) });
  if (error) console.error("staff session failed", role, error.message);
  return !error;
}
