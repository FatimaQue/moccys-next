"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import EyeToggle from "./EyeToggle";

export default function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Something went wrong. Please try again."); return; }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-card">
      <div className="login-form">
        <div className="login-form-in">
          <Link href="/" className="login-brand">
            <Image className="login-logo" src="/images/Logo-01.png" alt="McCoy's" width={180} height={40} priority />
          </Link>

          <div className="login-body">
            <h1 className="display">Hey!<br /><span className="rust">Up for a bite to eat?</span></h1>
            <p className="login-sub">Let&apos;s enjoy your food with mccoy&apos;s!</p>

            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="fEmail">Enter Email<i>*</i></label>
                <input
                  id="fEmail" type="email" placeholder="Email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field field-pass">
                <label htmlFor="fPassword">Enter Password<i>*</i></label>
                <input
                  id="fPassword" type={showPassword ? "text" : "password"} placeholder="Password" required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <EyeToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
              </div>
              <div className="forgot-row"><Link href="/forgot-password">Forgot password?</Link></div>

              {error && <p className="field-err" role="alert">{error}</p>}

              <button type="submit" className="btn btn-rust login-btn-full" disabled={busy}>{busy ? "Signing in…" : "Sign In"}</button>
            </form>

            <p className="login-switch">Don&apos;t have an account? <Link href="/signup">Sign Up</Link></p>

            <p className="login-fine">By continuing, you agree to mccoy&apos;s <a href="#">Terms</a> &amp; <a href="/privacy">Privacy Policy</a>.</p>
          </div>
        </div>
      </div>

      <div className="login-art">
        <Image className="login-art-img" src="/images/login-design.jpg" alt="McCoy's delivery rider on a red scooter" width={900} height={1200} priority />
      </div>
    </div>
  );
}
