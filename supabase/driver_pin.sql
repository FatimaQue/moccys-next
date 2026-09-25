-- Run this once in Supabase -> SQL Editor. It adds phone + PIN sign-in for drivers.
-- Drivers no longer need an email or password: the server checks the PIN itself (only a salted hash is stored).

alter table profiles
  add column if not exists pin_hash text,                          -- null = the driver hasn't set a PIN yet
  add column if not exists failed_attempts int not null default 0, -- wrong PINs in a row
  add column if not exists locked_until timestamptz;               -- set for 15 minutes after 5 wrong PINs

-- one driver per phone number (admin rows may leave phone empty)
do $$ begin
  alter table profiles add constraint profiles_phone_key unique (phone);
exception when duplicate_table or duplicate_object then null; end $$;
