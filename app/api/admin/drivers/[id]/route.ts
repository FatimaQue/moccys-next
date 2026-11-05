import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { deleteStaff, updateStaff } from "@/lib/staffAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

// disable / enable: a disabled rider can't sign in or be sent orders (existing sessions stop working too)
// edit: change the username and phone number
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; username?: string; phone?: string };
  if (!validId(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (body.action === "edit") {
    const r = await updateStaff(id, "driver", body.username, body.phone);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ ok: true });
  }

  const patch =
    body.action === "disable" ? { active: false }
    : body.action === "enable" ? { active: true, failed_attempts: 0, locked_until: null }
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const r = await deleteStaff(id, "driver");
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
