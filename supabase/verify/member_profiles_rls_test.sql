-- Behaviour test for the member_profiles migration. Run it AFTER the migration, in the Supabase SQL
-- editor of the project. Everything happens inside one transaction that is rolled back at the end:
-- the two test accounts and their profiles never persist. It prints one row per check; every
-- "ok" column must be true.
--
-- It needs the privileges of the SQL editor (it switches role with SET LOCAL ROLE).

begin;

-- Two throw-away accounts. The trigger must create a profile for each.
insert into auth.users (id, email)
values ('00000000-0000-4000-8000-0000000000a1', 'alice.test@example.invalid'),
       ('00000000-0000-4000-8000-0000000000b2', 'bob.test@example.invalid');

create temporary table checks (n serial, name text, ok boolean) on commit drop;
grant all on checks to public;
grant usage, select on sequence checks_n_seq to public;

insert into checks (name, ok)
select 'trigger created both profiles', count(*) = 2
from public.profiles where id in ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b2');

insert into checks (name, ok)
select 'starting name comes from the address, not from metadata',
       (select display_name from public.profiles where id = '00000000-0000-4000-8000-0000000000a1') = 'alice.test';

-- ---- as an anonymous visitor ---------------------------------------------------------------
set local role anon;
do $$
declare denied boolean := false;
begin
  begin
    perform 1 from public.profiles;
  exception when insufficient_privilege then denied := true;
  end;
  insert into checks (name, ok) values ('anon cannot read profiles at all', denied);
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

do $$
declare denied boolean := false;
begin
  begin
    insert into public.profiles (id, display_name) values ('00000000-0000-4000-8000-0000000000c3', 'Forged');
  exception when others then denied := true;
  end;
  insert into checks (name, ok) values ('alice cannot create a profile for someone else', denied);
end $$;

do $$
declare denied boolean := false;
begin
  begin
    update public.profiles set id = '00000000-0000-4000-8000-0000000000d4'
    where id = '00000000-0000-4000-8000-0000000000a1';
  exception when insufficient_privilege then denied := true;
  end;
  insert into checks (name, ok) values ('alice cannot change her id (column privilege)', denied);
end $$;

do $$
declare denied boolean := false;
begin
  begin
    update public.profiles set creator_roles = '{admin}' where id = '00000000-0000-4000-8000-0000000000a1';
  exception when check_violation then denied := true;
  end;
  insert into checks (name, ok) values ('only artist / label are accepted as roles', denied);
end $$;

do $$
declare denied boolean := false;
begin
  begin
    update public.profiles set handle = 'A B' where id = '00000000-0000-4000-8000-0000000000a1';
  exception when check_violation then denied := true;
  end;
  insert into checks (name, ok) values ('a malformed handle is refused', denied);
end $$;

do $$
declare denied boolean := false;
begin
  begin
    delete from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';
  exception when insufficient_privilege then denied := true;
  end;
  insert into checks (name, ok) values ('a member cannot delete a profile', denied);
end $$;
reset role;

-- ---- as Bob: handle uniqueness and isolation --------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);

do $$
declare denied boolean := false;
begin
  begin
    update public.profiles set handle = 'alice_1' where id = '00000000-0000-4000-8000-0000000000b2';
  exception when unique_violation then denied := true;
  end;
  insert into checks (name, ok) values ('a handle already used is refused (unique)', denied);
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
declare denied boolean := true; u text;
begin
  foreach u in array array['javascript:alert(1)', 'http://example.invalid/a.png', 'data:text/html;base64,AAAA'] loop
    begin
      update public.profiles set avatar_url = u where id = '00000000-0000-4000-8000-0000000000a1';
      denied := false;
    exception when check_violation then null;
    end;
  end loop;
  insert into checks (name, ok) values ('avatar addresses other than https are refused', denied);
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
declare denied boolean := false;
begin
  begin
    insert into public.profiles (id, display_name) values ('00000000-0000-4000-8000-0000000000a1', 'Alice')
    on conflict (id) do update set id = excluded.id, display_name = excluded.display_name;
  exception when insufficient_privilege then denied := true;
  end;
  insert into checks (name, ok) values ('an upsert is refused (the app uses update, then insert)', denied);
end $$;
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

select n, name, ok from checks order by n;

rollback;
