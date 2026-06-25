create schema if not exists poseidon_private;

revoke all on schema poseidon_private from public;
revoke all on schema poseidon_private from anon;
grant usage on schema poseidon_private to authenticated;

create or replace function poseidon_private.profile_count()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer from public.poseidon_profiles;
$$;

create or replace function poseidon_private.current_role()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select role from public.poseidon_profiles where user_id = auth.uid() limit 1;
$$;

create or replace function poseidon_private.is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.poseidon_profiles
    where user_id = auth.uid()
      and role = 'ADMINISTRADOR'
      and status = 'ACTIVO'
  );
$$;

create or replace function poseidon_private.is_active()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.poseidon_profiles
    where user_id = auth.uid()
      and status = 'ACTIVO'
  );
$$;

revoke execute on function poseidon_private.profile_count() from public, anon;
revoke execute on function poseidon_private.current_role() from public, anon;
revoke execute on function poseidon_private.is_admin() from public, anon;
revoke execute on function poseidon_private.is_active() from public, anon;
grant execute on function poseidon_private.profile_count() to authenticated;
grant execute on function poseidon_private.current_role() to authenticated;
grant execute on function poseidon_private.is_admin() to authenticated;
grant execute on function poseidon_private.is_active() to authenticated;

create or replace function public.set_poseidon_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_poseidon_updated_at() from public, anon, authenticated;

drop policy if exists poseidon_profiles_select on public.poseidon_profiles;
drop policy if exists poseidon_profiles_insert_bootstrap on public.poseidon_profiles;
drop policy if exists poseidon_profiles_update_admin on public.poseidon_profiles;
drop policy if exists poseidon_app_state_select on public.poseidon_app_state;
drop policy if exists poseidon_app_state_insert on public.poseidon_app_state;
drop policy if exists poseidon_app_state_update on public.poseidon_app_state;

create policy poseidon_profiles_select
on public.poseidon_profiles
for select
to authenticated
using (user_id = auth.uid() or poseidon_private.is_admin());

create policy poseidon_profiles_insert_bootstrap
on public.poseidon_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (poseidon_private.profile_count() = 0 and role = 'ADMINISTRADOR')
    or (poseidon_private.profile_count() > 0 and role = 'CAJERO')
    or poseidon_private.is_admin()
  )
);

create policy poseidon_profiles_update_admin
on public.poseidon_profiles
for update
to authenticated
using (poseidon_private.is_admin())
with check (poseidon_private.is_admin());

create policy poseidon_app_state_select
on public.poseidon_app_state
for select
to authenticated
using (id = 'main' and poseidon_private.is_active());

create policy poseidon_app_state_insert
on public.poseidon_app_state
for insert
to authenticated
with check (id = 'main' and poseidon_private.is_active());

create policy poseidon_app_state_update
on public.poseidon_app_state
for update
to authenticated
using (id = 'main' and poseidon_private.is_active())
with check (id = 'main' and poseidon_private.is_active());

drop function if exists public.poseidon_profile_count();
drop function if exists public.poseidon_current_role();
drop function if exists public.poseidon_is_admin();
drop function if exists public.poseidon_is_active();
