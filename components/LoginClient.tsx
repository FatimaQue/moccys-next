"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function LoginClient() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const phoneRef = useRef<HTMLInputElement>(null);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) phoneRef.current?.focus();
  };
  const sendCode = () => {
    if (phone.trim()) router.push("/");
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

            <button type="button" className="btn btn-rust login-btn-phone" onClick={toggle}>
              <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3.1-8.7A2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 2 .7 3a2 2 0 01-.5 2.1L8 10.1a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c1 .4 2 .6 3 .7a2 2 0 011.7 2z" /></svg>
              Continue with Phone
            </button>

            <div className={"phone-reveal" + (open ? " open" : "")}>
              <div className="phone-reveal-in">
                <input
                  ref={phoneRef} type="tel" className="phone-input" placeholder="03XX XXXXXXX"
                  aria-label="Phone number" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                />
                <button type="button" className="btn btn-rust" onClick={sendCode}>Send Code →</button>
              </div>
            </div>

            <Link href="/" className="btn btn-out login-btn-guest">Continue as a Guest</Link>

            <p className="login-fine">By continuing, you agree to mccoy&apos;s <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>.</p>
          </div>
        </div>
      </div>

      <div className="login-art">
        <Image className="login-art-img" src="/images/login-design.jpg" alt="McCoy's delivery rider on a red scooter" width={900} height={1200} priority />
      </div>
    </div>
  );
}
