"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const RESEND_SECONDS = 60; // Supabase's default minimum gap between emails to one address

// "enter the 6-digit code we emailed you" step, shared by signup and by login for accounts that never
// finished verifying. Renders inside .login-body in place of the form.
export default function EmailOtpStep({ email, onBack, next = "/account" }: { email: string; onBack: () => void; next?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const post = async (url: string, body: object) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: (data.error as string) || "Something went wrong. Please try again." };
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await post("/api/auth/verify-email", { email, code });
      if (!r.ok) { setError(r.error); return; }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setError(""); setNotice("");
    try {
      const r = await post("/api/auth/resend-code", { email });
      if (!r.ok) { setError(r.error); return; }
      setCode("");
      setNotice("A new code is on its way. Only the newest code will work.");
      setCooldown(RESEND_SECONDS);
    } catch {
      setError("Network problem. Please try again.");
    }
  };

  return (
    <>
      <h1 className="display">Check your<br /><span className="rust">email</span></h1>
      <p className="login-sub">We sent a 6-digit code to <strong>{email}</strong>. Enter it below to finish.</p>

      <form onSubmit={verify}>
        <div className="field">
          <label htmlFor="fCode">Enter Code<i>*</i></label>
          <input
            id="fCode" className="otp-input" type="text" placeholder="000000" required autoFocus
            inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>

        {error && <p className="field-err" role="alert">{error}</p>}
        {notice && !error && <p className="field-ok" role="status">{notice}</p>}

        <button type="submit" className="btn btn-rust login-btn-full" disabled={busy || code.length !== 6}>
          {busy ? "Verifying…" : "Verify Email"}
        </button>
      </form>

      <p className="login-switch">
        Didn&apos;t get it?{" "}
        <button type="button" className="link-btn" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
      <p className="login-switch">
        <button type="button" className="link-btn" onClick={onBack}>Use a different email</button>
      </p>
    </>
  );
}
