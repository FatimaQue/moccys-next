import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { normalizePhone } from "@/lib/staffAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DAYS = 30;

type Stat = { visitors: number; views: number };
type Stats = {
  today: Stat; week: Stat; month: Stat;
  daily: { day: string; visitors: number; views: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  devices: { device: string; visitors: number }[];
  visitors: { visitor_id: string; first_seen: string; last_seen: string; views: number; device: string | null; user_id: string | null; last_path: string; ip: string | null }[];
};

// the customers who have an account, and (once supabase/page_views.sql has been run) who has been visiting the site
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

  // visitor stats come from one SQL function; if the table/function isn't there yet, the page shows the setup note
  let stats: Stats | null = null;
  const { data: s, error: sErr } = await db.rpc("visit_stats", { days: DAYS });
  if (sErr) console.error("visit stats failed (has supabase/page_views.sql been run?)", sErr.message);
  else stats = s as Stats;

  const names = new Map(users.map((u) => [u.id, u.name !== "—" ? u.name : (u.email ?? u.phone ?? "Customer")]));
  const visitors = (stats?.visitors ?? []).map((v) => ({ ...v, customer: v.user_id ? names.get(v.user_id) ?? "Customer" : null }));

  return NextResponse.json({ users, stats: stats && { ...stats, visitors }, days: DAYS });
}
