# Signup email code (OTP) — Supabase setup

Do this once in the Supabase dashboard. No SQL migration is needed. Until it's done, signup still works
but no code email is sent and the "Check your email" step can't be completed.

1. **Authentication → Sign In / Providers → Email**
   - Turn **Confirm email** ON.
   - **Email OTP length**: `6`
   - **Email OTP expiration**: `600` seconds (10 minutes)

2. **Authentication → Email Templates → Confirm signup**
   - Subject: `Your McCoy's signup code`
   - Body: paste [email_templates/confirm_signup.html](email_templates/confirm_signup.html). It uses
     `{{ .Token }}` (the 6-digit code) instead of the default `{{ .ConfirmationURL }}` link.

3. **Authentication → SMTP Settings** — required before going live.
   Supabase's built-in mailer only sends a few emails per hour and only to your Supabase team members'
   addresses, so real customers won't get codes without a custom SMTP provider (e.g. Resend, Brevo).
   Enter the provider's host, port, username, password and a sender like `no-reply@<your domain>`.

Existing accounts (customers, staff, WhatsApp logins) are already confirmed and aren't affected.
