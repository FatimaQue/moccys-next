-- Run this once in Supabase -> SQL Editor. Replaces the "customer sends us the code" flow with
-- "customer messages us first, we text back a code, they type it into the site".
-- The old wa_login_sessions table is no longer used and can be dropped once this is live:
--   drop table if exists wa_login_sessions;

create table if not exists wa_otp_sessions (
  id uuid primary key default gen_random_uuid(),   -- secret held only by the browser that asked (used to poll/verify)
  phone text not null,                             -- 03XXXXXXXXX, the number the customer typed on the site
  code_hash text,                                  -- set once we've texted them a code; null while still waiting for their first message
  status text not null default 'pending',          -- pending (waiting for their WhatsApp message) -> sent (code texted, waiting for entry) -> used
  attempts int not null default 0,                 -- wrong codes entered on this session
  send_count int not null default 0,                -- codes we've texted out for this session (capped, so one session can't be used to spam)
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,                 -- whole session dies after this, regardless of stage
  code_sent_at timestamptz
);
create index if not exists wa_otp_sessions_phone_idx on wa_otp_sessions (phone, created_at desc);

-- only the server (service-role key) touches this table
alter table wa_otp_sessions enable row level security;
