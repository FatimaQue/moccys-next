"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { withNext } from "@/lib/nextPath";
import EmailOtpStep from "./EmailOtpStep";
import EyeToggle from "./EyeToggle";

// next: where to go once the email is verified (the checkout, when someone was sent here from it)
export default function SignupClient({ next = "/account" }: { next?: string }) {
  const [verifying, setVerifying] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone, password, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Something went wrong. Please try again."); return; }
      setVerifying(true); // account exists but stays locked until the emailed code is entered
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
            {verifying ? (
              <EmailOtpStep email={email.trim().toLowerCase()} next={next} onBack={() => setVerifying(false)} />
            ) : (<>
            <h1 className="display">Join<br /><span className="rust">mccoy&apos;s</span></h1>
            <p className="login-sub">Create an account to order faster next time.</p>

            <form onSubmit={submit}>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="fFirst">Enter First Name<i>*</i></label>
                  <input id="fFirst" type="text" placeholder="First Name" required maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="fLast">Enter Last Name<i>*</i></label>
                  <input id="fLast" type="text" placeholder="Last Name" required maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="fEmail">Enter Email<i>*</i></label>
                <input id="fEmail" type="email" placeholder="Email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="field">
                <label htmlFor="fPhone">Enter Phone number<i>*</i></label>
                <input
                  id="fPhone" type="tel" placeholder="03XXXXXXXXX" required inputMode="tel"
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="field field-pass">
                <label htmlFor="fPassword">Enter Password<i>*</i></label>
                <input
                  id="fPassword" type={showPassword ? "text" : "password"} placeholder="Password" required minLength={8}
                  autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <EyeToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
              </div>

              <div className="field field-pass">
                <label htmlFor="fConfirm">Confirm Password<i>*</i></label>
                <input
                  id="fConfirm" type={showConfirm ? "text" : "password"} placeholder="Confirm Password" required minLength={8}
                  autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <EyeToggle shown={showConfirm} onToggle={() => setShowConfirm((s) => !s)} />
              </div>

              {error && <p className="field-err" role="alert">{error}</p>}

              <button type="submit" className="btn btn-rust login-btn-full" disabled={busy}>{busy ? "Creating account…" : "Create Account"}</button>
            </form>

            <p className="login-switch">Already have an account? <Link href={withNext("/login", next)}>Login</Link></p>
            </>)}
          </div>
        </div>
      </div>

      <div className="login-art">
        <Image className="login-art-img" src="/images/login-design.jpg" alt="McCoy's delivery rider on a red scooter" width={900} height={1200} priority />
      </div>
    </div>
  );
}
