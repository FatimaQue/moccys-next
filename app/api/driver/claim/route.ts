import { NextResponse } from "next/server";
import {
  LOCK_MINUTES, PIN_RE, clearFailures, driverEmail, driverPassword, findDriver, hashPin, isLocked,
  normalizeName, normalizePhone, recordFailure, startDriverSession,
} from "@/lib/driverPin";
import { supabaseAdmin } from "@/lib/supabase/admin";

const NOT_FOUND = "We couldn't find a driver with that phone number and name. Please check them, or ask the manager to add you.";

// first-time setup: the manager registers the driver's name + phone, the driver then chooses their own PIN once
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { phone?: string; name?: string; pin?: string; confirm?: string };
  const phone = normalizePhone(body.phone);
  const pin = String(body.pin ?? "");
  if (!phone) return NextResponse.json({ error: "Enter a valid mobile number, like 03001234567." }, { status: 400 });
  if (!PIN_RE.test(pin)) return NextResponse.json({ error: "Your PIN must be exactly 6 digits." }, { status: 400 });
  if (pin !== body.confirm) return NextResponse.json({ error: "The two PINs don't match." }, { status: 400 });

  const driver = await findDriver(phone);
  if (!driver || driver.active === false) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  if (driver.pin_hash) {
    return NextResponse.json({ error: "This number already has a PIN. Sign in instead, or ask the manager to reset it." }, { status: 409 });
  }
  if (isLocked(driver)) {
    return NextResponse.json({ error: `Too many tries. Please wait ${LOCK_MINUTES} minutes and try again.` }, { status: 429 });
  }
  // the name is a second check, so knowing only a driver's phone number isn't enough to claim their account
  if (normalizeName(body.name) !== normalizeName(driver.name)) {
    await recordFailure(driver);
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }

  const db = supabaseAdmin();
  // make sure the hidden login exists (older drivers were created with a real email)
  const { error: authErr } = await db.auth.admin.updateUserById(driver.id, { email: driverEmail(phone), password: driverPassword(phone), email_confirm: true });
  if (authErr) {
    console.error("driver auth setup failed", authErr.message);
    return NextResponse.json({ error: "Could not finish setup. Please try again." }, { status: 500 });
  }

  // only succeeds while no PIN is set, so two people can't both claim the same account
  const { data } = await db.from("profiles").update({ pin_hash: hashPin(pin) }).eq("id", driver.id).is("pin_hash", null).select("id");
  if (!data?.length) return NextResponse.json({ error: "This number already has a PIN." }, { status: 409 });

  await clearFailures(driver.id);
  if (!(await startDriverSession(phone))) return NextResponse.json({ error: "PIN saved, but sign-in failed. Please sign in with your PIN." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
