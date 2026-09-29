-- Run this once in Supabase -> SQL Editor. Stores what Safepay actually deducted per payment, so
-- reports can show net revenue (what really lands in the account) alongside the gross order total.
-- Non-Safepay orders (cod/bank/easypaisa) just leave this null.

alter table orders add column if not exists safepay_fee numeric;
