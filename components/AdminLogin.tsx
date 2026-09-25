"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Role = "admin" | "driver";

export default function AdminLogin() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("admin");
  const [firstTime, setFirstTime] = useState(false); // driver setting a PIN for the first time
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);
  const switchRole = (r: Role) => { setRole(r); setFirstTime(false); setError(null); };

  const done = () => {
    // /dashboard looks up the role and forwards admins to /admin and drivers to /driver
    router.replace("/dashboard");
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (role === "admin") {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
      if (error) { setError("Wrong email or password."); setBusy(false); return; }
      return done();
    }

    const res = await fetch(firstTime ? "/api/driver/claim" : "/api/driver/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(firstTime ? { phone, name, pin, confirm } : { phone, pin }),
    }).catch(() => null);
    if (res?.ok) return done();
    setError(res ? ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Something went wrong." : "Couldn't reach the server. Check your connection.");
    setBusy(false);
  };

  return (
    <div className="signin">
      <form className="signin-card" onSubmit={submit}>
        <Image className="brand-logo" src="/images/Logo-01.png" alt="McCoy's" width={160} height={32} />
        <h1 className="display">{role === "admin" ? "Admin sign in" : firstTime ? "Set your PIN" : "Driver sign in"}</h1>

        <div className="role-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={role === "admin"} className={role === "admin" ? "on" : ""} onClick={() => switchRole("admin")}>Admin</button>
          <button type="button" role="tab" aria-selected={role === "driver"} className={role === "driver" ? "on" : ""} onClick={() => switchRole("driver")}>Driver</button>
        </div>

        {role === "admin" ? (
          <>
            <p>Sign in to manage incoming orders.</p>
            <label htmlFor="aEmail">Email</label>
            <input id="aEmail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="aPass">Password</label>
            <input id="aPass" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </>
        ) : (
          <>
            <p>{firstTime ? "Enter the name and number the manager registered, then choose a 6-digit PIN." : "Sign in with your phone number and PIN."}</p>
            {firstTime && (
              <>
                <label htmlFor="dName">Full name</label>
                <input id="dName" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
              </>
            )}
            <label htmlFor="dPhone">Phone number</label>
            <input id="dPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="03001234567" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            <label htmlFor="dPin">{firstTime ? "Choose a PIN (6 digits)" : "PIN"}</label>
            <input id="dPin" type="password" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete={firstTime ? "new-password" : "current-password"} required value={pin} onChange={(e) => setPin(digits(e.target.value))} />
            {firstTime && (
              <>
                <label htmlFor="dPin2">Retype PIN</label>
                <input id="dPin2" type="password" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} />
              </>
            )}
          </>
        )}

        {error && <p className="signin-err" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Please wait…" : role === "driver" && firstTime ? "Save PIN & sign in" : "Sign in"}</button>

        {role === "driver" && (
          <button type="button" className="signin-link" onClick={() => { setFirstTime((f) => !f); setError(null); setPin(""); setConfirm(""); }}>
            {firstTime ? "Already have a PIN? Sign in" : "First time? Set your PIN"}
          </button>
        )}
      </form>
    </div>
  );
}
