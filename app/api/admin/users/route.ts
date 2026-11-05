import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { normalizePhone } from "@/lib/staffAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// the customers who have an account (visitor tracking lives in /api/admin/visitors)
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();

  // every Supabase Auth user, 1000 at a time; staff and riders are filtered out below
  const authUsers = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("users fetch failed", error);
      return NextResponse.json({ error: "Could not load users" }, { status: 500 });
    }
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const customers = authUsers.filter((u) => u.user_metadata?.role === "customer");

  // orders per customer: an email account's orders carry its email, a WhatsApp account's its number
  const { data: orderRows } = await db.from("orders").select("email, mobile, total, status").neq("status", "rejected").limit(10000);
  const byEmail = new Map<string, { n: number; spent: number }>();
  const byMobile = new Map<string, { n: number; spent: number }>();
  const add = (m: Map<string, { n: number; spent: number }>, k: string | null | undefined, total: number) => {
    if (!k) return;
    const cur = m.get(k) ?? { n: 0, spent: 0 };
    cur.n += 1; cur.spent += total;
    m.set(k, cur);
  };
  (orderRows ?? []).forEach((o: { email: string | null; mobile: string | null; total: number }) => {
    add(byEmail, o.email?.toLowerCase(), Number(o.total));
    add(byMobile, normalizePhone(o.mobile), Number(o.total));
  });

  const users = customers
    .map((u) => {
      const hidden = /@customer\.example\.com$/i.test(u.email ?? ""); // WhatsApp accounts get a made-up email
      const email = hidden ? null : (u.email?.toLowerCase() ?? null);
      const phone = normalizePhone(u.user_metadata?.phone);
      const o = (email && byEmail.get(email)) || (phone && byMobile.get(phone)) || { n: 0, spent: 0 };
      return {
        id: u.id,
        name: String(u.user_metadata?.full_name ?? "") || "—",
        email, phone,
        via: email ? "Email" : "WhatsApp",
        joined: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        orders: o.n, spent: o.spent,
      };
    })
    .sort((a, b) => b.joined.localeCompare(a.joined));

  return NextResponse.json({ users });
}
