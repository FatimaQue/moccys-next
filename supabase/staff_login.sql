-- Run this once in Supabase -> SQL Editor. Generalises driver PIN sign-in into one phone + password
-- sign-in shared by admins and riders (the "driver" role name is unchanged in the database — only the
-- sign-in page and copy now call them Riders).

alter table profiles rename column pin_hash to password_hash;
-- failed_attempts / locked_until / the unique phone constraint already exist from driver_pin.sql and are reused as-is.
