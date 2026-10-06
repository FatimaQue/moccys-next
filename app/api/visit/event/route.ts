import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const KINDS = new Set(["view_item", "add_to_cart", "search", "checkout_start", "order_placed"]);
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|vercel/i;

// what a visitor does on the site (opens an item, adds to cart, searches, starts checkout, orders).
// Always answers 204: tracking must never show an error to a customer.
export async function POST(req: Request) {
  const done = () => new NextResponse(null, { status: 204 });
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || BOT.test(ua)) return done();

    const b = (await req.json().catch(() => ({}))) as { vid?: unknown; kind?: unknown; label?: unknown };
    const vid = typeof b.vid === "string" ? b.vid : "";
    const kind = typeof b.kind === "string" ? b.kind : "";
    const label = typeof b.label === "string" && b.label.trim() ? b.label.trim().slice(0, 120) : null;
    if (!/^[a-zA-Z0-9-]{8,64}$/.test(vid) || !KINDS.has(kind)) return done();

    let userId: string | null = null;
    const { data } = await (await supabaseServer()).auth.getUser();
    if (data.user?.user_metadata?.role === "customer") userId = data.user.id;

    const { error } = await supabaseAdmin().from("visit_events").insert({ visitor_id: vid, user_id: userId, kind, label });
    if (error) console.error("visit event insert failed (has supabase/page_views.sql been run?)", error.message);
  } catch (e) {
    console.error("visit event failed", e);
  }
  return done();
}
