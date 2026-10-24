-- Member profiles for Ai Music Factory (Supabase project aimf-dev).
--
-- NOT APPLIED by anyone yet. Review it, then run it once in the Supabase SQL editor (or with the
-- CLI against the linked project). It only creates objects in `public` plus one trigger on
-- `auth.users`; it never alters or deletes existing data.
--
-- What it gives:
--   * one private profile per member, created automatically at sign-up;
--   * row-level security: a member reads and writes only their own row, nobody else (not even
--     anonymous visitors) sees any profile;
--   * artist / label status and avatar are optional; the status is a label the member declares,
--     never a permission (nothing in this schema reads it to decide access);
--   * deleting an account (Authentication → Users) deletes its profile with it (ON DELETE CASCADE).
--     Members cannot delete their own account from the app yet: that needs a server-side function
--     and belongs to a later lot.
--
-- Rollback (kept here so it travels with the migration):
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user();
--   drop table if exists public.profiles;
--   drop function if exists public.touch_updated_at();

create table public.profiles (
  -- The primary key of auth.users is the only column Supabase promises never to change.
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 60),
  -- Optional public handle: lower-case letters, digits, underscore. Unique across members.
  handle text unique
    check (handle is null or handle ~ '^[a-z0-9_]{3,24}$'),
  -- Optional avatar location: an https:// address only (never javascript:, data: or http:).
  -- No upload feature yet; a later lot may point it at Supabase Storage.
  avatar_url text
    check (avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url ~* '^https://')),
  -- Optional creator status chosen by the member. Empty means "listener"; artist and label can be
  -- combined. It is only a label: it grants no right, and no policy or function may rely on it.
  creator_roles text[] not null default '{}'
    check (creator_roles <@ array['artist', 'label']::text[]),
  preferred_language text
    check (preferred_language is null or preferred_language in ('fr', 'en', 'es', 'zh', 'pt', 'ar')),
  -- Set when the member finishes (or skips) the welcome page.
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Private member profile, one row per auth user. Readable and writable only by its owner (RLS).';

-- ---------------------------------------------------------------------------------------------
-- Access: start from nothing, then grant only what members need.
-- (New tables in `public` are granted to anon and authenticated by default on Supabase.)
-- ---------------------------------------------------------------------------------------------
alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Column-level grants: a member can never write id, created_at or updated_at.
grant insert (id, display_name, handle, avatar_url, creator_roles, preferred_language, onboarding_completed_at)
  on public.profiles to authenticated;
grant update (display_name, handle, avatar_url, creator_roles, preferred_language, onboarding_completed_at)
  on public.profiles to authenticated;
-- No delete grant: the row goes away with the account (on delete cascade).

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------------------------
-- Keep updated_at honest.
-- ---------------------------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- A profile is created with every new account. The starting name is the part of the address
-- before "@"; it is never read from user-editable metadata. If this function failed it would
-- block sign-ups, so it does as little as possible and ignores a row that already exists.
-- ---------------------------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''), 'member'), 60)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Only the trigger runs it: nobody can call it through the API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that already exist get their profile too (safe to run again).
insert into public.profiles (id, display_name)
select u.id,
       left(coalesce(nullif(btrim(split_part(coalesce(u.email, ''), '@', 1)), ''), 'member'), 60)
from auth.users u
on conflict (id) do nothing;
