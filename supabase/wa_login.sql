-- Run this once in Supabase -> SQL Editor. It adds "log in by sending a WhatsApp message" for customers.
-- The browser asks for a session, the customer sends the code to our WhatsApp number, and the webhook marks it verified.

create table if not exists wa_login_sessions (
  id uuid primary key default gen_random_uuid(),   -- secret held only by the browser that asked (used to poll)
  phone text not null,                             -- 03XXXXXXXXX, the number the customer typed
  code text not null,                              -- short code the customer sends us on WhatsApp
  status text not null default 'pending',          -- pending -> verified -> used
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists wa_login_sessions_phone_idx on wa_login_sessions (phone, created_at desc);
create index if not exists wa_login_sessions_code_idx on wa_login_sessions (code) where status = 'pending';

-- only the server (service-role key) touches this table
alter table wa_login_sessions enable row level security;
