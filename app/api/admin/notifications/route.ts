import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// the latest activity for the admin bell, newest first
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("order_events")
    .select("id, order_no, kind, message, created_at")
    .order("id", { ascending: false })
    .limit(30);
  if (error) {
    console.error("notifications fetch failed", error);
    return NextResponse.json({ error: "Could not load notifications" }, { status: 500 });
  }
  return NextResponse.json({ events: data });
}
