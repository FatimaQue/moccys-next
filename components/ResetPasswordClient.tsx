"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import EyeToggle from "./EyeToggle";

export default function ResetPasswordClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // the reset-password link redirects here with the recovery session in the URL; the browser client
  // picks it up on its own and fires this event once it has
  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setBusy(true); setError("");
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      // Supabase's own reasons (e.g. "same_password" — reusing the current password) are more useful
      // than a generic failure message, so show them instead of guessing
      setError(error.code === "same_password" ? "Please choose a password different from your current one." : error.message);
      return;
    }
    router.push("/account");
    router.refresh();
  };

  return (
    <div className="login-card">
      <div className="login-form">
        <div className="login-form-in">
          <Link href="/" className="login-brand">
            <Image className="login-logo" src="/images/Logo-01.png" alt="McCoy's" width={180} height={40} priority />
          </Link>

          <div className="login-body">
            <h1 className="display">Set a new<br /><span className="rust">password</span></h1>

            {!ready ? (
              <p className="login-sub">Checking your reset link…</p>
            ) : (
              <form onSubmit={submit}>
                <div className="field field-pass">
                  <label htmlFor="fPassword">New Password<i>*</i></label>
                  <input
                    id="fPassword" type={showPassword ? "text" : "password"} placeholder="Password" required minLength={8}
                    autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <EyeToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
                </div>
                <div className="field field-pass">
                  <label htmlFor="fConfirm">Confirm Password<i>*</i></label>
                  <input
                    id="fConfirm" type={showPassword ? "text" : "password"} placeholder="Confirm Password" required minLength={8}
                    autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                {error && <p className="field-err" role="alert">{error}</p>}
                <button type="submit" className="btn btn-rust login-btn-full" disabled={busy}>{busy ? "Saving…" : "Reset Password"}</button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="login-art">
        <Image className="login-art-img" src="/images/login-design.jpg" alt="McCoy's delivery rider on a red scooter" width={900} height={1200} priority />
      </div>
    </div>
  );
}
