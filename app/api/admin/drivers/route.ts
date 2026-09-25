import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/adminAuth";
import { driverEmail, driverPassword, normalizePhone } from "@/lib/driverPin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// every driver, for the Drivers page and the "send out" dropdown (which only offers the active ones)
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, name, phone, active, pin_hash")
    .eq("role", "driver")
    .order("name");
  if (error) {
    console.error("drivers fetch failed", error);
    return NextResponse.json({ error: "Could not load drivers" }, { status: 500 });
  }
  const drivers = data.map((d) => ({ id: d.id, name: d.name, phone: d.phone, active: d.active !== false, pinSet: !!d.pin_hash }));
  return NextResponse.json({ drivers });
}

// register a driver; they choose their own PIN the first time they sign in
export async function POST(req: Request) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { name?: string; phone?: string };
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
  const phone = normalizePhone(body.phone);
  if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Enter the driver's full name." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Enter a valid mobile number, like 03001234567." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: taken } = await db.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (taken) return NextResponse.json({ error: "A driver with that phone number already exists." }, { status: 409 });

  const { data: created, error: authErr } = await db.auth.admin.createUser({ email: driverEmail(phone), password: driverPassword(phone), email_confirm: true });
  if (authErr || !created.user) {
    console.error("driver auth user failed", authErr?.message);
    return NextResponse.json({ error: "Could not create the driver." }, { status: 500 });
  }
  const { error } = await db.from("profiles").insert({ id: created.user.id, role: "driver", name, phone, active: true });
  if (error) {
    console.error("driver profile failed", error);
    await db.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Could not create the driver." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
