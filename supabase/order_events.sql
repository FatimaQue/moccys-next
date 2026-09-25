-- Run this once in Supabase -> SQL Editor. It creates the log behind the admin notification bell.
-- Every new order and every status change writes one row; the bell reads the latest ones.

create table if not exists order_events (
  id bigint generated always as identity primary key,
  order_id bigint references orders(id) on delete cascade,
  order_no text not null,
  kind text not null,        -- new_order | accepted | ready | out | delivered | rejected
  message text not null,     -- "Order #123456 delivered by Luna"
  actor text,                -- who did it: Customer, Admin or the driver's name
  created_at timestamptz default now()
);

create index if not exists order_events_created_idx on order_events (id desc);

-- like orders: locked to the public; only the server (service_role key) reads and writes it
alter table order_events enable row level security;
