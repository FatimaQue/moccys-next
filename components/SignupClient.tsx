"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
<<<<<<< HEAD
import { supabaseBrowser } from "@/lib/supabase/browser";
import EyeToggle from "./EyeToggle";

export default function SignupClient() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "code">("form");
=======
import EmailOtpStep from "./EmailOtpStep";
import EyeToggle from "./EyeToggle";

export default function SignupClient() {
  const [verifying, setVerifying] = useState(false);
>>>>>>> daff2e9732ded4d21fa7510f933945db5649b93a
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

  const [code, setCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [resendMsg, setResendMsg] = useState("");

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
<<<<<<< HEAD
      setStep("code");
=======
      setVerifying(true); // account exists but stays locked until the emailed code is entered
>>>>>>> daff2e9732ded4d21fa7510f933945db5649b93a
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeBusy || code.trim().length !== 6) return;
    setCodeBusy(true); setCodeError("");
    const { error } = await supabaseBrowser().auth.verifyOtp({ email, token: code.trim(), type: "signup" });
    setCodeBusy(false);
    if (error) { setCodeError("That code is wrong or has expired. Please check and try again."); return; }
    router.push("/account");
    router.refresh();
  };

  const resend = async () => {
    setCodeBusy(true); setResendMsg(""); setCodeError("");
    const { error } = await supabaseBrowser().auth.resend({ type: "signup", email });
    setCodeBusy(false);
    setResendMsg(error ? "Could not resend the code. Please try again." : "Code resent — check your email.");
  };

  return (
    <div className="login-card">
      <div className="login-form">
        <div className="login-form-in">
          <Link href="/" className="login-brand">
            <Image className="login-logo" src="/images/Logo-01.png" alt="McCoy's" width={180} height={40} priority />
          </Link>

          <div className="login-body">
<<<<<<< HEAD
            {step === "form" ? (
              <>
                <h1 className="display">Join<br /><span className="rust">mccoy&apos;s</span></h1>
                <p className="login-sub">Create an account to order faster next time.</p>
=======
            {verifying ? (
              <EmailOtpStep email={email.trim().toLowerCase()} onBack={() => setVerifying(false)} />
            ) : (<>
            <h1 className="display">Join<br /><span className="rust">mccoy&apos;s</span></h1>
            <p className="login-sub">Create an account to order faster next time.</p>
>>>>>>> daff2e9732ded4d21fa7510f933945db5649b93a

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

<<<<<<< HEAD
                <p className="login-switch">Already have an account? <Link href="/login">Login</Link></p>
              </>
            ) : (
              <>
                <h1 className="display">Check your<br /><span className="rust">email</span></h1>
                <p className="login-sub">We&apos;ve sent a 6-digit code to {email}. Enter it below to finish creating your account.</p>

                <form onSubmit={verifyCode}>
                  <div className="field">
                    <label htmlFor="fCode">Enter Code<i>*</i></label>
                    <input
                      id="fCode" type="text" placeholder="6-digit code" required inputMode="numeric" maxLength={6}
                      value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>

                  {codeError && <p className="field-err" role="alert">{codeError}</p>}
                  {resendMsg && <p className="field-ok">{resendMsg}</p>}

                  <button type="submit" className="btn btn-rust login-btn-full" disabled={codeBusy || code.length !== 6}>{codeBusy ? "Checking…" : "Verify & Continue"}</button>
                </form>

                <p className="login-switch">Didn&apos;t get it? <button type="button" className="link-btn" onClick={resend} disabled={codeBusy}>Resend code</button></p>
              </>
            )}
=======
            <p className="login-switch">Already have an account? <Link href="/login">Login</Link></p>
            </>)}
>>>>>>> daff2e9732ded4d21fa7510f933945db5649b93a
          </div>
        </div>
      </div>

      <div className="login-art">
        <Image className="login-art-img" src="/images/login-design.jpg" alt="McCoy's delivery rider on a red scooter" width={900} height={1200} priority />
      </div>
    </div>
  );
}
