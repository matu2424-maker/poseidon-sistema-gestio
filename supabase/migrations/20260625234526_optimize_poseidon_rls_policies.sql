create index if not exists poseidon_app_state_created_by_idx on public.poseidon_app_state(created_by);
create index if not exists poseidon_app_state_updated_by_idx on public.poseidon_app_state(updated_by);

drop policy if exists poseidon_profiles_select on public.poseidon_profiles;
drop policy if exists poseidon_profiles_insert_bootstrap on public.poseidon_profiles;
drop policy if exists poseidon_profiles_update_admin on public.poseidon_profiles;

create policy poseidon_profiles_select
on public.poseidon_profiles
for select
to authenticated
using (user_id = (select auth.uid()) or (select poseidon_private.is_admin()));

create policy poseidon_profiles_insert_bootstrap
on public.poseidon_profiles
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    ((select poseidon_private.profile_count()) = 0 and role = 'ADMINISTRADOR')
    or ((select poseidon_private.profile_count()) > 0 and role = 'CAJERO')
    or (select poseidon_private.is_admin())
  )
);

create policy poseidon_profiles_update_admin
on public.poseidon_profiles
for update
to authenticated
using ((select poseidon_private.is_admin()))
with check ((select poseidon_private.is_admin()));
