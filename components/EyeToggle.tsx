"use client";

// show/hide toggle for a password field, used on login, signup and reset-password
export default function EyeToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="field-eye" onClick={onToggle} aria-label={shown ? "Hide password" : "Show password"}>
      {shown ? (
        <svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a20.6 20.6 0 015.06-5.94M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a20.6 20.6 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" /><path d="M1 1l22 22" /></svg>
      ) : (
        <svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  );
}
