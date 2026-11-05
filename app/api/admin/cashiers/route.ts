import { NextResponse } from "next/server";
import { getOwner } from "@/lib/adminAuth";
import { createStaff } from "@/lib/staffAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// every cashier, for the Cashiers page
export async function GET() {
  if (!(await getOwner())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, name, phone, username, active, password_hash")
    .eq("role", "cashier")
    .order("name");
  if (error) {
    console.error("cashiers fetch failed", error);
    return NextResponse.json({ error: "Could not load cashiers" }, { status: 500 });
  }
  const cashiers = data.map((d) => ({
    id: d.id, name: d.name, phone: d.phone, username: d.username, active: d.active !== false, passwordSet: !!d.password_hash,
  }));
  return NextResponse.json({ cashiers });
}

// register a cashier by username + phone; they choose their own password the first time they sign in
export async function POST(req: Request) {
  if (!(await getOwner())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { username?: string; phone?: string };
  const r = await createStaff("cashier", body.username, body.phone);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
