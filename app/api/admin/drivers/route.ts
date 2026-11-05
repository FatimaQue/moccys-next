import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { createStaff } from "@/lib/staffAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// every rider, for the Riders page and the "send out" dropdown (which only offers the active ones)
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, name, phone, username, active, password_hash")
    .eq("role", "driver")
    .order("name");
  if (error) {
    console.error("riders fetch failed", error);
    return NextResponse.json({ error: "Could not load riders" }, { status: 500 });
  }
  const drivers = data.map((d) => ({
    id: d.id, name: d.name, phone: d.phone, username: d.username, active: d.active !== false, passwordSet: !!d.password_hash,
  }));
  return NextResponse.json({ drivers });
}

// register a rider by username + phone; they choose their own password the first time they sign in
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { username?: string; phone?: string };
  const r = await createStaff("driver", body.username, body.phone);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
