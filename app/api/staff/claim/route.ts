import { NextResponse } from "next/server";
import {
  findStaffByPhone, hashPassword, isLocked, LOCK_MINUTES, normalizeName, normalizePhone, recordFailure,
  clearFailures, staffEmail, staffPassword, startStaffSession, validPassword,
} from "@/lib/staffAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const NOT_FOUND = "We couldn't find that phone number and name. Please check them, or ask the manager to add you.";

// first-time setup: whoever registered this phone (name + number only, no password yet) hands it to the
// admin or rider, who then chooses their own password once. The name is a second check, so knowing only
// someone's phone number isn't enough to claim their account.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { phone?: string; name?: string; password?: string; confirm?: string };
  const phone = normalizePhone(body.phone);
  const password = String(body.password ?? "");
  if (!phone) return NextResponse.json({ error: "Enter a valid mobile number, like 03001234567." }, { status: 400 });
  if (!validPassword(password)) return NextResponse.json({ error: "Your password must be 4-40 characters." }, { status: 400 });
  if (password !== body.confirm) return NextResponse.json({ error: "The two passwords don't match." }, { status: 400 });

  const staff = await findStaffByPhone(phone);
  if (!staff || staff.active === false) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  if (staff.password_hash) {
    return NextResponse.json({ error: "This number already has a password. Sign in instead, or ask the manager to reset it." }, { status: 409 });
  }
  if (isLocked(staff)) {
    return NextResponse.json({ error: `Too many tries. Please wait ${LOCK_MINUTES} minutes and try again.` }, { status: 429 });
  }
  if (normalizeName(body.name) !== normalizeName(staff.name)) {
    await recordFailure(staff);
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }

  const db = supabaseAdmin();
  // make sure the hidden login exists with the right derived credentials (older accounts may have been
  // created with a real email, e.g. an admin set up before phone sign-in existed)
  const { error: authErr } = await db.auth.admin.updateUserById(staff.id, {
    email: staffEmail(staff.role, phone), password: staffPassword(staff.role, phone), email_confirm: true,
  });
  if (authErr) {
    console.error("staff auth setup failed", authErr.message);
    return NextResponse.json({ error: "Could not finish setup. Please try again." }, { status: 500 });
  }

  // only succeeds while no password is set, so two people can't both claim the same account
  const { data } = await db.from("profiles").update({ password_hash: hashPassword(password) }).eq("id", staff.id).is("password_hash", null).select("id");
  if (!data?.length) return NextResponse.json({ error: "This number already has a password." }, { status: 409 });

  await clearFailures(staff.id);
  if (!(await startStaffSession(staff.role, phone))) {
    return NextResponse.json({ error: "Password saved, but sign-in failed. Please sign in with your password." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, role: staff.role });
}
