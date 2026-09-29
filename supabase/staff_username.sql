-- Run this once in Supabase -> SQL Editor. Adds a username as the sign-in identifier for admins and
-- riders. Phone stays on the profile as real contact info for delivery — it just stops being what
-- staff type to log in. Customers never get a username, so the uniqueness rule below only applies to
-- rows that actually have one; customer rows are unaffected.

alter table profiles
  add column if not exists username text; -- null = no username yet (customers, or a staff row pending backfill)

-- case-insensitive uniqueness, enforced only where a username is set; app code always stores it
-- already-lowercased (see normalizeUsername), so this is a safety net against writes that bypass it
create unique index if not exists profiles_username_lower_key on profiles (lower(username)) where username is not null;
