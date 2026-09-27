-- Run this once in Supabase -> SQL Editor. Adds Safepay (online payment) tracking to the orders table.
-- A 'safepay' order stays payment_status 'unpaid' until Safepay's signed redirect or webhook confirms
-- it; the admin board only shows it once it's 'paid', so an abandoned checkout never reaches the kitchen.
-- payment_status / paid_at come from jazzcash_payments.sql — repeated here so this file works on its own.

alter table orders add column if not exists payment_status text not null default 'unpaid'; -- unpaid | paid | failed
alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists safepay_tracker text;

create index if not exists orders_safepay_tracker_idx on orders (safepay_tracker);

-- If orders.pay_method has a check constraint listing the allowed methods, it must also allow 'safepay':
--   select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'orders'::regclass and contype = 'c';
