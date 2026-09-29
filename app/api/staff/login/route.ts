import { NextResponse } from "next/server";
import {
  findStaffByUsername, isLocked, LOCK_MINUTES, normalizeUsername, recordFailure, clearFailures,
  startStaffSession, verifyPassword,
} from "@/lib/staffAuth";

// same answer for an unknown username and a wrong password, so usernames can't be probed
const WRONG = "Wrong username or password.";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { username?: string; password?: string };
  const username = normalizeUsername(body.username);
  const password = String(body.password ?? "");
  if (!username) return NextResponse.json({ error: WRONG }, { status: 401 });

  const staff = await findStaffByUsername(username);
  if (!staff || staff.active === false) return NextResponse.json({ error: WRONG }, { status: 401 });

  // nobody has claimed this username yet — the admin added them (name + phone + username) but they
  // haven't set a password; the sign-in page switches itself to the "set your password" step instead
  // of showing an error
  if (!staff.password_hash) return NextResponse.json({ firstTime: true });

  if (isLocked(staff)) {
    return NextResponse.json({ error: `Too many wrong tries. Please wait ${LOCK_MINUTES} minutes and try again.` }, { status: 429 });
  }
  if (!password || !verifyPassword(password, staff.password_hash)) {
    await recordFailure(staff);
    return NextResponse.json({ error: WRONG }, { status: 401 });
  }

  await clearFailures(staff.id);
  if (!staff.phone || !(await startStaffSession(staff.role, staff.phone))) {
    return NextResponse.json({ error: "Could not sign you in. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, role: staff.role });
}
