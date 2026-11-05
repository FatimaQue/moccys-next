import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";

export type StaffRole = "admin" | "driver" | "cashier"; // "driver" is shown to users as "Rider"; the database value is unchanged

export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD = 8;
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
    .in("role", ["admin", "driver", "cashier"])
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
    .in("role", ["admin", "driver", "cashier"])
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

// the admin registers a rider or cashier by username + phone only; that person later opens "First time? Set up
// your account", proves they are them with the same two values, and chooses their own password. The username
// doubles as the display name, so there is no separate full-name field.
export async function createStaff(role: "driver" | "cashier", rawUsername: unknown, rawPhone: unknown): Promise<{ ok: true } | { error: string; status: number }> {
  const username = normalizeUsername(rawUsername);
  const phone = normalizePhone(rawPhone);
  if (!username) return { error: "Choose a username: 3-20 lowercase letters, numbers, dots, underscores or hyphens.", status: 400 };
  if (!phone) return { error: "Enter a valid mobile number, like 03001234567.", status: 400 };

  const db = supabaseAdmin();
  const { data: phoneTaken } = await db.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (phoneTaken) return { error: "Someone with that phone number already exists.", status: 409 };
  const { data: nameTaken } = await db.from("profiles").select("id").eq("username", username).maybeSingle();
  if (nameTaken) return { error: "That username is already taken.", status: 409 };

  const { data: created, error: authErr } = await db.auth.admin.createUser({ email: staffEmail(role, phone), password: staffPassword(role, phone), email_confirm: true });
  if (authErr || !created.user) {
    console.error("staff auth user failed", authErr?.message);
    return { error: "Could not create the account.", status: 500 };
  }
  const { error } = await db.from("profiles").insert({ id: created.user.id, role, name: username, username, phone, active: true });
  if (error) {
    console.error("staff profile failed", error);
    await db.auth.admin.deleteUser(created.user.id);
    return { error: error.code === "23505" ? "That username is already taken." : "Could not create the account.", status: error.code === "23505" ? 409 : 500 };
  }
  return { ok: true };
}

// change a rider's or cashier's username and phone. The hidden sign-in identity is derived from the phone, so it is
// moved to the new number too; the password they chose (stored on the profile) is not touched.
export async function updateStaff(id: string, role: "driver" | "cashier", rawUsername: unknown, rawPhone: unknown): Promise<{ ok: true } | { error: string; status: number }> {
  const username = normalizeUsername(rawUsername);
  const phone = normalizePhone(rawPhone);
  if (!username) return { error: "Enter a username: 3-20 lowercase letters, numbers, dots, underscores or hyphens.", status: 400 };
  if (!phone) return { error: "Enter a valid mobile number, like 03001234567.", status: 400 };

  const db = supabaseAdmin();
  const { data: cur } = await db.from("profiles").select("id, phone").eq("id", id).eq("role", role).maybeSingle<{ id: string; phone: string | null }>();
  if (!cur) return { error: "Not found", status: 404 };
  const { data: phoneTaken } = await db.from("profiles").select("id").eq("phone", phone).neq("id", id).maybeSingle();
  if (phoneTaken) return { error: "Someone with that phone number already exists.", status: 409 };
  const { data: nameTaken } = await db.from("profiles").select("id").eq("username", username).neq("id", id).maybeSingle();
  if (nameTaken) return { error: "That username is already taken.", status: 409 };

  if (cur.phone !== phone) {
    const { error: authErr } = await db.auth.admin.updateUserById(id, { email: staffEmail(role, phone), password: staffPassword(role, phone), email_confirm: true });
    if (authErr) {
      console.error("staff auth update failed", authErr.message);
      return { error: "Could not update the phone number.", status: 500 };
    }
  }
  const { error } = await db.from("profiles").update({ username, name: username, phone }).eq("id", id).eq("role", role);
  if (error) {
    console.error("staff update failed", error);
    return { error: error.code === "23505" ? "That username or phone is already taken." : "Could not save the changes.", status: error.code === "23505" ? 409 : 500 };
  }
  return { ok: true };
}

// remove a rider or cashier for good (profile and sign-in). A rider who already has orders on record can't be
// deleted, because those orders point at them; the admin should disable that rider instead.
export async function deleteStaff(id: string, role: "driver" | "cashier"): Promise<{ ok: true } | { error: string; status: number }> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("profiles").delete().eq("id", id).eq("role", role).select("id");
  if (error) {
    if (error.code === "23503") return { error: "They have orders on record, so they can't be removed. Disable them instead.", status: 409 };
    console.error("staff delete failed", error);
    return { error: "Could not remove them.", status: 500 };
  }
  if (!data?.length) return { error: "Not found", status: 404 };
  await db.auth.admin.deleteUser(id);
  return { ok: true };
}
