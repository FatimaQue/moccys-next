import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

// reset-password: the rider picks a new password next time they choose "Set your password"
// disable / enable: a disabled rider can't sign in or be sent orders (existing sessions stop working too)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const patch =
    action === "reset-password" ? { password_hash: null, failed_attempts: 0, locked_until: null }
    : action === "disable" ? { active: false }
    : action === "enable" ? { active: true, failed_attempts: 0, locked_until: null }
    : null;
  if (!patch) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data, error } = await supabaseAdmin().from("profiles").update(patch).eq("id", id).eq("role", "driver").select("id");
  if (error) {
    console.error("rider update failed", error);
    return NextResponse.json({ error: "Could not update the rider." }, { status: 500 });
  }
  if (!data?.length) return NextResponse.json({ error: "Rider not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
