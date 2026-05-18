-- Manual migration: sync auth.users → public."UserProfile"
--
-- Run this ONCE after the first `prisma migrate deploy` (or after every
-- `prisma migrate reset`). Prisma cannot manage objects in the `auth` schema
-- because that schema is owned by Supabase. The SQL must be applied via the
-- Supabase SQL Editor or `psql` using DIRECT_URL (port 5432, not the pooler).
--
-- What it does: whenever Supabase Auth creates a row in auth.users (signup,
-- admin.createUser, magic link, etc.), this trigger creates the matching row
-- in public."UserProfile" so the application always has a domain-side mirror.
--
-- Default access is intentionally locked down. New users start as UNASSIGNED,
-- PENDING, and inactive until an admin approves them and grants tags.
-- The seed script (prisma/seed.ts) overrides this for the initial admin user.
--
-- This is idempotent: re-running drops and recreates both function and trigger.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public."UserProfile" (
    id, "authUserId", email, name, role, status, "isActive", "createdAt", "updatedAt"
  )
  values (
    gen_random_uuid(),
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    'UNASSIGNED',
    'PENDING',
    false,
    now(),
    now()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();
