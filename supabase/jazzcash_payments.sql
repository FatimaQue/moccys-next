-- Run this once in Supabase -> SQL Editor. Adds JazzCash payment tracking to the orders table.
-- payment_status stays 'unpaid' for a JazzCash order until the return callback confirms it; the
-- admin board only shows an order once it's 'paid' (or wasn't a JazzCash order to begin with),
-- so an abandoned JazzCash checkout never reaches the kitchen.

alter table orders add column if not exists payment_status text not null default 'unpaid'; -- unpaid | paid | failed
alter table orders add column if not exists jazzcash_txn_ref text;
alter table orders add column if not exists jazzcash_response_code text;
alter table orders add column if not exists paid_at timestamptz;

create index if not exists orders_jazzcash_txn_ref_idx on orders (jazzcash_txn_ref);
