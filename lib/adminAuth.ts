import "server-only";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";

export type Staff = { id: string; role: "admin" | "driver"; name: string };

// Being signed in is not enough: anyone can create a Supabase account, so a user only counts as staff when
// they have an active row in `profiles` (role = admin | driver). The old ADMIN_EMAILS list (comma separated)
// still works as a fallback for admins, so existing logins keep working until they get a profile row.
export async function getStaff(): Promise<Staff | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const { data: p } = await supabaseAdmin()
    .from("profiles")
    .select("role, name, active")
    .eq("id", user.id)
    .maybeSingle<{ role: string; name: string; active: boolean | null }>();
  if (p && p.active !== false && (p.role === "admin" || p.role === "driver")) {
    return { id: user.id, role: p.role, name: p.name };
  }

  const allow = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const email = user.email?.toLowerCase();
  return email && allow.includes(email) ? { id: user.id, role: "admin", name: "Admin" } : null;
}

export async function getAdmin() {
  const s = await getStaff();
  return s?.role === "admin" ? s : null;
}

export async function getDriver() {
  const s = await getStaff();
  return s?.role === "driver" ? s : null;
}
