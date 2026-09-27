"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    // Supabase already returns "success" here regardless of whether the email has an account, so
    // an error at this point is a real problem (rate limit, bad address), not "no such account"
    if (error) { setError("Something went wrong. Please try again."); return; }
    setSent(true);
  };

  return (
    <div className="login-card">
      <div className="login-form">
        <div className="login-form-in">
          <Link href="/" className="login-brand">
            <Image className="login-logo" src="/images/Logo-01.png" alt="McCoy's" width={180} height={40} priority />
          </Link>

          <div className="login-body">
            <h1 className="display">Forgot your<br /><span className="rust">password?</span></h1>
            <p className="login-sub">Enter your email and we&apos;ll send you a reset link.</p>

            {sent ? (
              <p className="field-ok">If an account exists for that email, a reset link is on its way — check your inbox.</p>
            ) : (
              <form onSubmit={submit}>
                <div className="field">
                  <label htmlFor="fEmail">Enter Email<i>*</i></label>
                  <input id="fEmail" type="email" placeholder="Email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {error && <p className="field-err" role="alert">{error}</p>}
                <button type="submit" className="btn btn-rust login-btn-full" disabled={busy}>{busy ? "Sending…" : "Send Reset Link"}</button>
              </form>
            )}

            <p className="login-switch">Remembered it? <Link href="/login">Login</Link></p>
          </div>
        </div>
      </div>

      <div className="login-art">
        <Image className="login-art-img" src="/images/login-design.jpg" alt="McCoy's delivery rider on a red scooter" width={900} height={1200} priority />
      </div>
    </div>
  );
}
