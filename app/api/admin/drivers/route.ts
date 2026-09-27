import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { normalizePhone, staffEmail, staffPassword } from "@/lib/staffAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// every rider, for the Riders page and the "send out" dropdown (which only offers the active ones)
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, name, phone, active, password_hash")
    .eq("role", "driver")
    .order("name");
  if (error) {
    console.error("riders fetch failed", error);
    return NextResponse.json({ error: "Could not load riders" }, { status: 500 });
  }
  const drivers = data.map((d) => ({ id: d.id, name: d.name, phone: d.phone, active: d.active !== false, passwordSet: !!d.password_hash }));
  return NextResponse.json({ drivers });
}

// register a rider; they choose their own password the first time they sign in
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { name?: string; phone?: string };
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
  const phone = normalizePhone(body.phone);
  if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Enter the rider's full name." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Enter a valid mobile number, like 03001234567." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: taken } = await db.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (taken) return NextResponse.json({ error: "A rider with that phone number already exists." }, { status: 409 });

  const { data: created, error: authErr } = await db.auth.admin.createUser({ email: staffEmail("driver", phone), password: staffPassword("driver", phone), email_confirm: true });
  if (authErr || !created.user) {
    console.error("rider auth user failed", authErr?.message);
    return NextResponse.json({ error: "Could not create the rider." }, { status: 500 });
  }
  const { error } = await db.from("profiles").insert({ id: created.user.id, role: "driver", name, phone, active: true });
  if (error) {
    console.error("rider profile failed", error);
    await db.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Could not create the rider." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
