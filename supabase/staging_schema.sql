-- Full schema for a fresh (staging) Supabase project. Structure only, no data.
-- Run ONCE in the STAGING project -> SQL Editor. Re-running is safe (if not exists everywhere).
-- Built from the production column list + the supabase/*.sql files, so it replaces running those.

create extension if not exists pg_trgm;

-- ───────────── profiles (staff + customers; id = the auth user id) ─────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null,                          -- customer | admin | driver | cashier (no check constraint, like production)
  name text not null,
  phone text,
  active boolean default true,
  password_hash text,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  username text
);
do $$ begin
  alter table profiles add constraint profiles_phone_key unique (phone);
exception when duplicate_table or duplicate_object then null; end $$;
create unique index if not exists profiles_username_lower_key on profiles (lower(username)) where username is not null;

-- ───────────── orders ─────────────
create table if not exists orders (
  id bigint generated always as identity primary key,
  order_no text not null,
  status text not null default 'pending',
  order_type text not null,
  customer_name text not null,
  email text,
  mobile text not null,
  city text,
  address text,
  notes text,
  pay_method text not null,
  easypaisa_number text,
  subtotal int not null,
  delivery_fee int not null,
  total int not null,
  created_at timestamptz default now(),
  driver_id uuid references profiles(id) on delete set null,
  out_at timestamptz,
  delivered_at timestamptz,
  payment_status text not null default 'unpaid',   -- unpaid | paid | failed
  jazzcash_txn_ref text,
  jazzcash_response_code text,
  paid_at timestamptz,
  safepay_tracker text,
  safepay_fee numeric
);
create index if not exists orders_jazzcash_txn_ref_idx on orders (jazzcash_txn_ref);
create index if not exists orders_safepay_tracker_idx on orders (safepay_tracker);
create index if not exists orders_order_no_trgm on orders using gin (order_no gin_trgm_ops);
create index if not exists orders_customer_name_trgm on orders using gin (customer_name gin_trgm_ops);

create table if not exists order_items (
  id bigint generated always as identity primary key,
  order_id bigint references orders(id) on delete cascade,
  name text not null,
  price int not null,
  qty int not null,
  is_addon boolean default false
);

create table if not exists order_events (
  id bigint generated always as identity primary key,
  order_id bigint references orders(id) on delete cascade,
  order_no text not null,
  kind text not null,
  message text not null,
  actor text,
  created_at timestamptz default now()
);
create index if not exists order_events_created_idx on order_events (id desc);

-- ───────────── menu ─────────────
create table if not exists menu_unavailable (
  name text primary key
);
create table if not exists menu_custom_items (
  id bigint generated always as identity primary key,
  category_id text not null,
  name text unique not null,
  price int not null,
  description text,
  img text,
  options jsonb,
  created_at timestamptz default now()
);
create table if not exists menu_overrides (
  name text primary key,
  price int,
  option_prices jsonb,
  img text,
  description text,
  hidden boolean not null default false
);

-- ───────────── newsletter ─────────────
create table if not exists newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz default now()
);
create unique index if not exists newsletter_subscribers_email_lower_key on newsletter_subscribers (lower(email));

-- ───────────── analytics ─────────────
create table if not exists page_views (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  path text not null,
  referrer text,
  device text,
  user_id uuid,
  created_at timestamptz not null default now(),
  ip text,
  country text,
  city text,
  browser text,
  os text,
  utm_source text,
  utm_medium text,
  utm_campaign text
);
create index if not exists page_views_created_at_idx on page_views (created_at desc);
create index if not exists page_views_visitor_idx on page_views (visitor_id, created_at desc);

create table if not exists visit_events (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  user_id uuid,
  kind text not null,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists visit_events_created_at_idx on visit_events (created_at desc);
create index if not exists visit_events_kind_idx on visit_events (kind, created_at desc);

-- ───────────── WhatsApp login ─────────────
create table if not exists wa_login_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists wa_login_sessions_phone_idx on wa_login_sessions (phone, created_at desc);
create index if not exists wa_login_sessions_code_idx on wa_login_sessions (code) where status = 'pending';

create table if not exists wa_otp_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text,
  status text not null default 'pending',
  attempts int not null default 0,
  send_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  code_sent_at timestamptz            -- in wa_login_v2.sql; missing from your production column list, harmless if unused
);
create index if not exists wa_otp_sessions_phone_idx on wa_otp_sessions (phone, created_at desc);

-- ───────────── lock everything down (the app only uses the service-role key) ─────────────
alter table profiles enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_events enable row level security;
alter table menu_unavailable enable row level security;
alter table menu_custom_items enable row level security;
alter table menu_overrides enable row level security;
alter table newsletter_subscribers enable row level security;
alter table page_views enable row level security;
alter table visit_events enable row level security;
alter table wa_login_sessions enable row level security;
alter table wa_otp_sessions enable row level security;

-- ───────────── visit_stats() — copied from supabase/page_views.sql ─────────────
-- After this file succeeds, run the `create or replace function visit_stats ...` block through the
-- grant line from supabase/page_views.sql (lines 40 to the end) so the admin visitor stats work.
