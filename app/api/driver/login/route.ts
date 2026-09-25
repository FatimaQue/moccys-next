import { NextResponse } from "next/server";
import { PIN_RE, clearFailures, findDriver, isLocked, normalizePhone, recordFailure, startDriverSession, verifyPin, LOCK_MINUTES } from "@/lib/driverPin";

// same answer for an unknown number, a driver without a PIN and a wrong PIN, so numbers can't be probed
const WRONG = "Wrong phone number or PIN. First time here? Choose “Set your PIN”.";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { phone?: string; pin?: string };
  const phone = normalizePhone(body.phone);
  const pin = String(body.pin ?? "");
  if (!phone || !PIN_RE.test(pin)) return NextResponse.json({ error: WRONG }, { status: 401 });

  const driver = await findDriver(phone);
  if (!driver || driver.active === false || !driver.pin_hash) return NextResponse.json({ error: WRONG }, { status: 401 });
  if (isLocked(driver)) {
    return NextResponse.json({ error: `Too many wrong tries. Please wait ${LOCK_MINUTES} minutes and try again.` }, { status: 429 });
  }

  if (!verifyPin(pin, driver.pin_hash)) {
    await recordFailure(driver);
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }

  await clearFailures(driver.id);
  if (!(await startDriverSession(phone))) return NextResponse.json({ error: "Could not sign you in. Please ask the manager." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
