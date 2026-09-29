"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

// One username + password field for everyone — admin or rider. The server looks the username up and
// decides the role itself, so nobody has to pick a tab first. First-time setup goes the other way: the
// admin only registers a phone number and name, so that step asks for phone + name (to find the account
// and prove it's really them) plus a username the person chooses for themselves, and a password.
export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstTime, setFirstTime] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }),
      }).catch(() => null);
      const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; firstTime?: boolean; error?: string }) : null;
      setBusy(false);
      if (data?.ok) return done();
      if (data?.firstTime) { setFirstTime(true); setPassword(""); return; }
      setError(data ? data.error ?? "Something went wrong." : "Couldn't reach the server. Check your connection.");
      return;
    }

    const res = await fetch("/api/staff/claim", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, name, username, password, confirm }),
    }).catch(() => null);
    if (res?.ok) return done();
    setError(res ? ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Something went wrong." : "Couldn't reach the server. Check your connection.");
    setBusy(false);
  };

  return (
    <div className="signin">
      <form className="signin-card" onSubmit={submit}>
        <Image className="brand-logo" src="/images/Logo-01.png" alt="McCoy's" width={160} height={32} />
        <h1 className="display">{firstTime ? "Set up your account" : "Staff sign in"}</h1>
        <p>{firstTime ? "Enter the phone number and name the manager registered, then choose a username and password." : "Sign in with your username and password."}</p>

        {firstTime ? (
          <>
            <label htmlFor="sName">Full name</label>
            <input id="sName" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />

            <label htmlFor="sPhone">Phone number</label>
            <input
              id="sPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="03001234567" required
              value={phone} onChange={(e) => setPhone(e.target.value)}
            />

            <label htmlFor="sUser">Choose a username</label>
            <input
              id="sUser" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="yourusername" minLength={3} maxLength={20} required
              value={username} onChange={(e) => { setUsername(e.target.value); setError(null); }}
            />
          </>
        ) : (
          <>
            <label htmlFor="sUser">Username</label>
            <input
              id="sUser" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="yourusername" required
              value={username} onChange={(e) => { setUsername(e.target.value); setError(null); }}
            />
          </>
        )}

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
        <button type="submit" disabled={busy}>{busy ? "Please wait…" : firstTime ? "Save & sign in" : "Sign in"}</button>

        <button
          type="button" className="signin-link"
          onClick={() => { setFirstTime((f) => !f); setError(null); setPassword(""); setConfirm(""); }}
        >
          {firstTime ? "Already have a username? Sign in" : "First time? Set up your account"}
        </button>
      </form>
    </div>
  );
}
