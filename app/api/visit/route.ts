import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SKIP = ["/admin", "/driver", "/dashboard", "/api"];
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|vercel/i;

const deviceOf = (ua: string) => (/ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop");
const browserOf = (ua: string) =>
  /edg\//i.test(ua) ? "Edge" : /opr\/|opera/i.test(ua) ? "Opera" : /samsungbrowser/i.test(ua) ? "Samsung Internet"
    : /firefox|fxios/i.test(ua) ? "Firefox" : /chrome|crios/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "Other";
const osOf = (ua: string) =>
  /iphone|ipad|ipod/i.test(ua) ? "iOS" : /android/i.test(ua) ? "Android" : /windows/i.test(ua) ? "Windows"
    : /mac os x|macintosh/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Other";

const clip = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

// one row per page a visitor opens, written with the service-role key (the table is closed to the public).
// Always answers 204: tracking must never show an error to a customer.
export async function POST(req: Request) {
  const done = () => new NextResponse(null, { status: 204 });
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (!ua || BOT.test(ua)) return done();

    const b = (await req.json().catch(() => ({}))) as { vid?: unknown; path?: unknown; ref?: unknown; utm?: { source?: unknown; medium?: unknown; campaign?: unknown } };
    const vid = typeof b.vid === "string" ? b.vid : "";
    const path = typeof b.path === "string" ? b.path.split("?")[0].slice(0, 200) : "";
    if (!/^[a-zA-Z0-9-]{8,64}$/.test(vid) || !path.startsWith("/")) return done();
    if (SKIP.some((p) => path === p || path.startsWith(p + "/"))) return done();

    // where they came from, as a bare hostname, and only when it isn't this site
    let referrer: string | null = null;
    if (typeof b.ref === "string" && b.ref) {
      try {
        const host = new URL(b.ref).hostname;
        if (host && host !== new URL(req.url).hostname) referrer = host.slice(0, 100);
      } catch { /* not a URL */ }
    }

    // link the visit to the customer account when they're signed in (staff aren't counted as customers)
    let userId: string | null = null;
    const { data } = await (await supabaseServer()).auth.getUser();
    if (data.user?.user_metadata?.role === "customer") userId = data.user.id;

    // the visitor's IP as Vercel passes it on (first entry of x-forwarded-for is the real client)
    const raw = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
    const ip = /^[0-9a-fA-F:.]{3,45}$/.test(raw) ? raw : null;

    // Vercel adds the visitor's country and city to every request (the city arrives URL-encoded)
    const country = clip(req.headers.get("x-vercel-ip-country"), 2);
    let city: string | null = null;
    try { city = clip(decodeURIComponent(req.headers.get("x-vercel-ip-city") ?? ""), 80); } catch { /* malformed header */ }

    const row = { visitor_id: vid, path, referrer, device: deviceOf(ua), user_id: userId };
    const extra = {
      ip, country, city, browser: browserOf(ua), os: osOf(ua),
      utm_source: clip(b.utm?.source, 60), utm_medium: clip(b.utm?.medium, 60), utm_campaign: clip(b.utm?.campaign, 80),
    };
    const db = supabaseAdmin();
    const { error } = await db.from("page_views").insert({ ...row, ...extra });
    // the extra columns come from re-running supabase/page_views.sql; until then keep recording visits without them
    if (error && /column|schema cache/i.test(error.message)) await db.from("page_views").insert(row);
    else if (error) console.error("visit insert failed", error);
  } catch (e) {
    console.error("visit tracking failed", e);
  }
  return done();
}
