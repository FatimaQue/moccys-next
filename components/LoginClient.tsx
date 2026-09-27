"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Stage = { step: "phone" } | { step: "waiting"; sid: string; url: string } | { step: "code"; sid: string; url: string };

export default function LoginClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const phoneRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) phoneRef.current?.focus();
  };

  const [stage, setStage] = useState<Stage>({ step: "phone" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // step 1: the customer messages us first (a normal WhatsApp message, not a typed code), which is what
  // proves the number and opens the free 24h reply window we text the code back through
  const start = async () => {
    if (!phone.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/wa/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong. Please try again."); return; }
      setStage({ step: "waiting", sid: data.sid, url: data.url });
      window.open(data.url, "_blank", "noopener");
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // step 2: poll only to know when our reply with the code has gone out, so the page can reveal the code box
  useEffect(() => {
    if (stage.step !== "waiting") return;
    const { sid, url } = stage;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch("/api/auth/wa/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid }) });
        const data = await res.json();
        if (stopped) return;
        if (data.status === "sent") { stopped = true; setStage({ step: "code", sid, url }); return; }
        if (data.status === "expired" || data.status === "invalid") {
          stopped = true; setStage({ step: "phone" });
          setError("That took too long. Please try again.");
          return;
        }
      } catch { /* keep polling */ }
      if (!stopped) timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 2000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [stage]);

  useEffect(() => {
    if (stage.step === "code") codeRef.current?.focus();
  }, [stage.step]);

  // step 3: the customer reads the code off WhatsApp and types it in here
  const verify = async () => {
    if (stage.step !== "code" || busy || code.trim().length !== 6) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/wa/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sid: stage.sid, code: code.trim() }) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        if (res.status === 410 || res.status === 429) setStage({ step: "phone" });
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setStage({ step: "phone" }); setCode(""); setError(""); };

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

            <button type="button" className="btn btn-rust login-btn-phone" onClick={toggle}>
              <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 2 .7 3a2 2 0 01-.5 2.1L8 10.1a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c1 .4 2 .6 3 .7a2 2 0 011.7 2z" /></svg>
              Continue with Phone
            </button>

            <div className={"phone-reveal" + (open ? " open" : "")}>
              <div className="phone-reveal-in">
                {stage.step === "phone" && (
                  <>
                    <input
                      ref={phoneRef} type="tel" className="phone-input" placeholder="03XX XXXXXXX"
                      aria-label="Phone number" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") start(); }}
                    />
                    <button type="button" className="btn btn-rust" onClick={start} disabled={busy}>
                      {busy ? "One moment…" : "Continue on WhatsApp →"}
                    </button>
                  </>
                )}

                {stage.step === "waiting" && (
                  <div className="wa-wait" aria-live="polite">
                    <p>Tap send on the WhatsApp message we&apos;ve opened for you. We&apos;ll text you back a code.</p>
                    <a className="btn btn-rust" href={stage.url} target="_blank" rel="noopener noreferrer">Open WhatsApp →</a>
                    <button type="button" className="wa-cancel" onClick={reset}>Use a different number</button>
                  </div>
                )}

                {stage.step === "code" && (
                  <div className="wa-wait" aria-live="polite">
                    <p>We&apos;ve texted you a 6-digit code on WhatsApp. Enter it below.</p>
                    <input
                      ref={codeRef} type="text" className="phone-input" placeholder="6-digit code" aria-label="WhatsApp code"
                      inputMode="numeric" maxLength={6} value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      onKeyDown={(e) => { if (e.key === "Enter") verify(); }}
                    />
                    <button type="button" className="btn btn-rust" onClick={verify} disabled={busy || code.length !== 6}>
                      {busy ? "Checking…" : "Verify & Log In"}
                    </button>
                    <button type="button" className="wa-cancel" onClick={reset}>Use a different number</button>
                  </div>
                )}

                {error && <p className="wa-error" role="alert">{error}</p>}
              </div>
            </div>

            <Link href="/" className="btn btn-out login-btn-guest">Continue as a Guest</Link>

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
