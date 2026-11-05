-- Run this once in Supabase -> SQL Editor. Adds a "cashier" staff role (admin panel access, registered by
-- the admin with a username + phone; the cashier sets their own password on the staff sign-in page).
-- If profiles.role has a check constraint listing allowed roles, drop it so 'cashier' is allowed.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c);
  end loop;
end $$;
