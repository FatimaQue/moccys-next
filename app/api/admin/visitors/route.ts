import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
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

// who has been visiting the site (needs supabase/page_views.sql); signed-in visitors are matched to their customer name
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = supabaseAdmin();

  // visitor stats come from one SQL function; if the table/function isn't there yet, the page shows the setup note
  let stats: Stats | null = null;
  const { data: s, error: sErr } = await db.rpc("visit_stats", { days: DAYS });
  if (sErr) console.error("visit stats failed (has supabase/page_views.sql been run?)", sErr.message);
  else stats = s as Stats;

  const names = new Map<string, string>();
  if (stats?.visitors.some((v) => v.user_id)) {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) break;
      for (const u of data.users) {
        if (u.user_metadata?.role !== "customer") continue;
        const hidden = /@customer\.example\.com$/i.test(u.email ?? "");
        names.set(u.id, String(u.user_metadata?.full_name ?? "") || (hidden ? "" : u.email ?? "") || String(u.user_metadata?.phone ?? "") || "Customer");
      }
      if (data.users.length < 1000) break;
    }
  }
  const visitors = (stats?.visitors ?? []).map((v) => ({ ...v, customer: v.user_id ? names.get(v.user_id) ?? "Customer" : null }));

  return NextResponse.json({ stats: stats && { ...stats, visitors }, days: DAYS });
}
