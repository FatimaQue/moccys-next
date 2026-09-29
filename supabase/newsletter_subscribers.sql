-- Run this once in Supabase -> SQL Editor. Stores newsletter signups from the home page's
-- "Special Offers & News" form.

create table if not exists newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz default now()
);

create unique index if not exists newsletter_subscribers_email_lower_key on newsletter_subscribers (lower(email));

-- like orders/order_events: locked to the public; only the server (service_role key) reads and writes it
alter table newsletter_subscribers enable row level security;
