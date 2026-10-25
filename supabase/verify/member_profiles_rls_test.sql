-- Behaviour test for the member_profiles migration. Run it AFTER the migration, in the Supabase SQL
-- editor of the project. Everything happens inside one transaction that is rolled back at the end:
-- the throw-away accounts and their profiles never persist. It prints one row per check; every
-- "ok" column must be true, and the LAST row states that the exact number of checks ran with none
-- false or null (so a check that silently disappeared, or returned null, cannot go unnoticed).
--
-- It needs the privileges of the SQL editor (it switches role with SET LOCAL ROLE). It never
-- commits: there is no COMMIT anywhere in this file.
--
-- Cleanup after an error. If a statement fails, nothing was committed, but the editor may keep the
-- aborted transaction open ("current transaction is aborted"). Run `rollback;` on its own, then
-- confirm that nothing was left behind (both counts must be 0):
--   select count(*) from auth.users where email like '%@example.invalid';
--   select count(*) from public.profiles where id::text like '00000000-0000-4000-8000-0000000000__';
-- The temporary table `checks` disappears with the session. Fix the cause before running again;
-- a leftover test account would stop the script at its first statement, with a clear message.
--
-- A failure is reported by its SQLSTATE: each "refused" check waits for ONE precise code
-- (42501 insufficient_privilege, 23514 check_violation, 23505 unique_violation), never "any error",
-- so that for instance a foreign-key error (23503) can not pass for a permission refusal.

begin;

-- Stop at once, with a clear message, if a previous run left test rows behind.
do $$
begin
  if exists (select 1 from auth.users where id::text like '00000000-0000-4000-8000-0000000000__')
     or exists (select 1 from public.profiles where id::text like '00000000-0000-4000-8000-0000000000__') then
    raise exception 'Leftover test rows (ids 00000000-0000-4000-8000-0000000000a1 b2 c3 d4 e5): delete them first, see the header of this file';
  end if;
end $$;

-- Throw-away accounts. The trigger must create a profile for each.
--   a1 Alice, b2 Bob: isolation and updates.
--   c3 Carl: exists but will have NO profile, the target of "Alice creates a profile for someone else".
--   e5 Carol: timestamps.
insert into auth.users (id, email)
values ('00000000-0000-4000-8000-0000000000a1', 'alice.test@example.invalid'),
       ('00000000-0000-4000-8000-0000000000b2', 'bob.test@example.invalid'),
       ('00000000-0000-4000-8000-0000000000c3', 'carl.test@example.invalid'),
       ('00000000-0000-4000-8000-0000000000e5', 'carol.test@example.invalid');

create temporary table checks (n serial, name text, ok boolean) on commit drop;
grant all on checks to public;
grant usage, select on sequence checks_n_seq to public;

insert into checks (name, ok)
select 'trigger created both profiles', count(*) = 2
from public.profiles where id in ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b2');

insert into checks (name, ok)
select 'starting name comes from the address, not from metadata',
       (select display_name from public.profiles where id = '00000000-0000-4000-8000-0000000000a1') = 'alice.test';

-- Carl is a real account whose profile row is absent (the trigger made one; the table owner removes it).
delete from public.profiles where id = '00000000-0000-4000-8000-0000000000c3';
insert into checks (name, ok)
select 'precondition: the target account exists and has no profile',
       exists (select 1 from auth.users where id = '00000000-0000-4000-8000-0000000000c3')
       and not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-0000000000c3');

-- ---- as an anonymous visitor ---------------------------------------------------------------
set local role anon;
do $$
declare got text := 'no error';
begin
  begin
    perform 1 from public.profiles;
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok) values ('anon cannot read profiles at all (SQLSTATE 42501)', got = '42501');
end $$;
reset role;

-- ---- as Alice --------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

insert into checks (name, ok)
select 'alice sees exactly one profile (her own)',
       count(*) = 1 and bool_and(id = '00000000-0000-4000-8000-0000000000a1') from public.profiles;

update public.profiles set display_name = 'Alice', handle = 'alice_1', creator_roles = '{artist}'
where id = '00000000-0000-4000-8000-0000000000a1';
insert into checks (name, ok)
select 'alice can update her own profile', display_name = 'Alice' and handle = 'alice_1' and creator_roles = '{artist}'
from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';

with changed as (
  update public.profiles set display_name = 'Hacked'
  where id = '00000000-0000-4000-8000-0000000000b2' returning 1
)
insert into checks (name, ok) select 'alice cannot update bob (0 rows touched)', count(*) = 0 from changed;

-- The target (Carl) exists, so a foreign-key error is impossible: only the row-level security
-- policy can refuse, and it must do so with exactly 42501.
do $$
declare got text := 'no error';
begin
  begin
    insert into public.profiles (id, display_name) values ('00000000-0000-4000-8000-0000000000c3', 'Forged');
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok) values ('alice cannot create the profile of an existing account that has none (SQLSTATE 42501)', got = '42501');
end $$;
reset role;

-- Control: the very same statement, written by Carl for himself, is accepted. The refusal above
-- therefore comes from ownership, not from the data.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c3","role":"authenticated"}', true);
do $$
declare got text := 'no error';
begin
  begin
    insert into public.profiles (id, display_name) values ('00000000-0000-4000-8000-0000000000c3', 'Forged');
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok)
  select 'control: the same insert is accepted when the owner makes it',
         got = 'no error'
         and exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-0000000000c3' and display_name = 'Forged');
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

do $$
declare got text := 'no error';
begin
  begin
    update public.profiles set id = '00000000-0000-4000-8000-0000000000d4'
    where id = '00000000-0000-4000-8000-0000000000a1';
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok) values ('alice cannot change her id (column privilege, SQLSTATE 42501)', got = '42501');
end $$;

do $$
declare got text := 'no error';
begin
  begin
    update public.profiles set creator_roles = '{admin}' where id = '00000000-0000-4000-8000-0000000000a1';
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok) values ('only artist / label are accepted as roles (SQLSTATE 23514)', got = '23514');
end $$;

do $$
declare got text := 'no error';
begin
  begin
    update public.profiles set handle = 'A B' where id = '00000000-0000-4000-8000-0000000000a1';
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok) values ('a malformed handle is refused (SQLSTATE 23514)', got = '23514');
end $$;

do $$
declare got text := 'no error';
begin
  begin
    delete from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok) values ('a member cannot delete a profile (SQLSTATE 42501)', got = '42501');
end $$;
reset role;

-- ---- as Bob: handle uniqueness and isolation --------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

do $$
declare got text := 'no error';
begin
  begin
    update public.profiles set handle = 'alice_1' where id = '00000000-0000-4000-8000-0000000000b2';
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok) values ('a handle already used is refused (unique, SQLSTATE 23505)', got = '23505');
end $$;

insert into checks (name, ok)
select 'bob sees only his own profile', count(*) = 1 and bool_and(id = '00000000-0000-4000-8000-0000000000b2')
from public.profiles;
reset role;

-- ---- statuses and avatar are optional, can be combined, and grant nothing ----------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);

update public.profiles set creator_roles = '{artist,label}' where id = '00000000-0000-4000-8000-0000000000a1';
insert into checks (name, ok)
select 'artist and label can be held together', creator_roles = '{artist,label}'
from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';

update public.profiles set creator_roles = '{}' where id = '00000000-0000-4000-8000-0000000000a1';
insert into checks (name, ok)
select 'no status at all is a valid (listener) profile', creator_roles = '{}' and avatar_url is null
from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';

update public.profiles set avatar_url = 'https://example.invalid/a.png' where id = '00000000-0000-4000-8000-0000000000a1';
insert into checks (name, ok)
select 'an https avatar address is accepted', avatar_url = 'https://example.invalid/a.png'
from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';

do $$
declare
  u text;
  got text;
  refused int := 0;
begin
  foreach u in array array['javascript:alert(1)', 'http://example.invalid/a.png', 'data:text/html;base64,AAAA'] loop
    got := 'no error';
    begin
      update public.profiles set avatar_url = u where id = '00000000-0000-4000-8000-0000000000a1';
    exception when others then got := sqlstate;
    end;
    if got = '23514' then refused := refused + 1; end if;
  end loop;
  insert into checks (name, ok) values ('avatar addresses other than https are refused (3 of 3, SQLSTATE 23514)', refused = 3);
end $$;
reset role;

insert into checks (name, ok)
select 'the profile table has no admin / role / permission column',
       not exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles'
           and column_name in ('role', 'roles', 'is_admin', 'admin', 'is_staff', 'is_superuser', 'permissions', 'user_role')
       );

insert into checks (name, ok)
select 'no policy reads the creator status to decide access',
       not exists (
         select 1 from pg_policies
         where schemaname = 'public' and tablename = 'profiles'
           and (coalesce(qual, '') || coalesce(with_check, '')) like '%creator_roles%'
       );

-- ---- a profile row that is missing can be created by its owner (and only for themselves) -------
delete from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
insert into public.profiles (id, display_name, onboarding_completed_at)
values ('00000000-0000-4000-8000-0000000000a1', 'alice.test', now());
insert into checks (name, ok)
select 'the owner can recreate a missing profile with a plain insert', count(*) = 1
from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';
update public.profiles set onboarding_completed_at = now() where id = '00000000-0000-4000-8000-0000000000a1';
insert into checks (name, ok)
select 'a partial update (onboarding stamp only) works', onboarding_completed_at is not null
from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';
reset role;

-- An upsert (what supabase-js .upsert() sends) writes the id, which members may not: the app updates.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
do $$
declare got text := 'no error';
begin
  begin
    insert into public.profiles (id, display_name) values ('00000000-0000-4000-8000-0000000000a1', 'Alice')
    on conflict (id) do update set id = excluded.id, display_name = excluded.display_name;
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok) values ('an upsert is refused (the app updates, then inserts; SQLSTATE 42501)', got = '42501');
end $$;
reset role;

-- ---- created_at and updated_at: members never write them, the trigger keeps updated_at honest ----
-- now() is constant inside a transaction, so the row gets an OLD date first: only a real refresh by
-- the trigger can move updated_at away from it. The table owner writes the old row with an INSERT
-- (the trigger runs on UPDATE only); Carol's profile is first removed.
delete from public.profiles where id = '00000000-0000-4000-8000-0000000000e5';

-- As Carol, with no row yet: writing a timestamp in an INSERT is refused by the column privileges
-- alone (the row is hers, so the row-level policy would allow it), with exactly 42501.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e5","role":"authenticated"}', true);
do $$
declare
  col text;
  got text;
  refused int := 0;
begin
  foreach col in array array['created_at', 'updated_at'] loop
    got := 'no error';
    begin
      execute format(
        'insert into public.profiles (id, display_name, %I) values (%L, %L, %L)',
        col, '00000000-0000-4000-8000-0000000000e5', 'carol.test', '2000-01-01 00:00:00+00');
    exception when others then got := sqlstate;
    end;
    if got = '42501' then refused := refused + 1; end if;
  end loop;
  insert into checks (name, ok) values ('a member cannot insert created_at or updated_at (2 of 2, SQLSTATE 42501)', refused = 2);
end $$;
reset role;

delete from public.profiles where id = '00000000-0000-4000-8000-0000000000e5';
insert into public.profiles (id, display_name, created_at, updated_at)
values ('00000000-0000-4000-8000-0000000000e5', 'carol.test', timestamptz '2020-01-01 00:00:00+00', timestamptz '2020-01-01 00:00:00+00');
insert into checks (name, ok)
select 'precondition: the test row carries an old creation and update date',
       created_at = timestamptz '2020-01-01 00:00:00+00' and updated_at = timestamptz '2020-01-01 00:00:00+00'
from public.profiles where id = '00000000-0000-4000-8000-0000000000e5';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e5","role":"authenticated"}', true);

update public.profiles set display_name = 'Carol' where id = '00000000-0000-4000-8000-0000000000e5';
insert into checks (name, ok)
select 'the trigger refreshes updated_at on an allowed change (old date replaced by now())',
       updated_at = now() and updated_at > timestamptz '2020-01-01 00:00:00+00'
from public.profiles where id = '00000000-0000-4000-8000-0000000000e5';
insert into checks (name, ok)
select 'an allowed change leaves created_at alone',
       created_at = timestamptz '2020-01-01 00:00:00+00'
from public.profiles where id = '00000000-0000-4000-8000-0000000000e5';

do $$
declare got text := 'no error';
begin
  begin
    update public.profiles set created_at = now() where id = '00000000-0000-4000-8000-0000000000e5';
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok) values ('a member cannot update created_at (column privilege, SQLSTATE 42501)', got = '42501');
end $$;

do $$
declare got text := 'no error';
begin
  begin
    update public.profiles set updated_at = timestamptz '2000-01-01 00:00:00+00' where id = '00000000-0000-4000-8000-0000000000e5';
  exception when others then got := sqlstate;
  end;
  insert into checks (name, ok) values ('a member cannot update updated_at (column privilege, SQLSTATE 42501)', got = '42501');
end $$;

insert into checks (name, ok)
select 'the refused attempts left both dates as they were',
       created_at = timestamptz '2020-01-01 00:00:00+00' and updated_at = now()
from public.profiles where id = '00000000-0000-4000-8000-0000000000e5';
reset role;

-- ---- deleting the account deletes its profile, and only its own ---------------------------------
delete from auth.users where id = '00000000-0000-4000-8000-0000000000a1';
insert into checks (name, ok)
select 'deleting an account removes its profile and leaves the others',
       not exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-0000000000a1')
       and exists (select 1 from public.profiles where id = '00000000-0000-4000-8000-0000000000b2');

-- ---- the helper functions are not callable through the API -----------------------------------
insert into checks (name, ok)
select 'handle_new_user is not executable by anon / authenticated',
       not has_function_privilege('anon', 'public.handle_new_user()', 'execute')
       and not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute');

insert into checks (name, ok)
select 'row level security is enabled', relrowsecurity from pg_class where oid = 'public.profiles'::regclass;

-- ---- the harness itself: exact number of checks, none false or null -----------------------------
-- Update `expected` whenever a check is added or removed (it counts the checks above this block).
do $$
declare
  expected constant int := 34;
  total int;
  bad int;
begin
  select count(*), count(*) filter (where ok is distinct from true) into total, bad from checks;
  insert into checks (name, ok)
  values (format('exactly %s checks ran and none is false or null (ran %s, not true %s)', expected, total, bad),
          total = expected and bad = 0);
end $$;

select n, name, ok from checks order by n;

rollback;
