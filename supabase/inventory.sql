-- Run this once in Supabase -> SQL Editor. It creates the two tables the admin Inventory page uses.

-- items switched off ("unavailable"); a row here means the item can't be ordered
create table if not exists menu_unavailable (
  name text primary key
);

-- menu items added from the Inventory page (the built-in menu stays in the code)
create table if not exists menu_custom_items (
  id bigint generated always as identity primary key,
  category_id text not null,             -- deals | burgers | pizza | quick | desserts | golden-guardian | mccoys-lunch | drinks
  name text unique not null,
  price int not null,                    -- base price, or the first size's price
  description text,
  img text,
  options jsonb,                         -- optional sizes: [{"label":"Large","price":900}, ...]
  created_at timestamptz default now()
);

-- like orders: locked to the public; only the server (service_role key) reads and writes them
alter table menu_unavailable enable row level security;
alter table menu_custom_items enable row level security;
