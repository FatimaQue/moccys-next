"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

// One phone + password field for everyone — admin or rider. The server looks the phone number up and
// decides the role itself, so nobody has to pick a tab first. If that phone hasn't set a password yet
// (a rider the admin just added, or an admin migrating off the old email sign-in), the server says so
// and this switches itself into "choose a password" mode instead of showing an error.
export default function AdminLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [firstTime, setFirstTime] = useState(false);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    // /dashboard looks up the role and forwards admins to /admin and riders to /driver
    router.replace("/dashboard");
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (!firstTime) {
      const res = await fetch("/api/staff/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, password }),
      }).catch(() => null);
      const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; firstTime?: boolean; error?: string }) : null;
      setBusy(false);
      if (data?.ok) return done();
      if (data?.firstTime) { setFirstTime(true); setPassword(""); return; }
      setError(data ? data.error ?? "Something went wrong." : "Couldn't reach the server. Check your connection.");
      return;
    }

    const res = await fetch("/api/staff/claim", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, name, password, confirm }),
    }).catch(() => null);
    if (res?.ok) return done();
    setError(res ? ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Something went wrong." : "Couldn't reach the server. Check your connection.");
    setBusy(false);
  };

  return (
    <div className="signin">
      <form className="signin-card" onSubmit={submit}>
        <Image className="brand-logo" src="/images/Logo-01.png" alt="McCoy's" width={160} height={32} />
        <h1 className="display">{firstTime ? "Set your password" : "Staff sign in"}</h1>
        <p>{firstTime ? "Enter the name the manager registered, then choose a password." : "Sign in with your phone number and password."}</p>

        {firstTime && (
          <>
            <label htmlFor="sName">Full name</label>
            <input id="sName" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </>
        )}

        <label htmlFor="sPhone">Phone number</label>
        <input
          id="sPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="03001234567" required
          value={phone} onChange={(e) => { setPhone(e.target.value); setError(null); }}
        />

        <label htmlFor="sPass">{firstTime ? "Choose a password" : "Password"}</label>
        <input
          id="sPass" type="password" minLength={firstTime ? 4 : undefined} maxLength={40}
          autoComplete={firstTime ? "new-password" : "current-password"} required
          value={password} onChange={(e) => setPassword(e.target.value)}
        />

        {firstTime && (
          <>
            <label htmlFor="sPass2">Retype password</label>
            <input id="sPass2" type="password" minLength={4} maxLength={40} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </>
        )}

        {error && <p className="signin-err" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Please wait…" : firstTime ? "Save password & sign in" : "Sign in"}</button>

        <button
          type="button" className="signin-link"
          onClick={() => { setFirstTime((f) => !f); setError(null); setPassword(""); setConfirm(""); }}
        >
          {firstTime ? "Already have a password? Sign in" : "First time? Set your password"}
        </button>
      </form>
    </div>
  );
}
