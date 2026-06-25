drop policy if exists poseidon_profiles_insert_bootstrap on public.poseidon_profiles;

create policy poseidon_profiles_insert_bootstrap
on public.poseidon_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (public.poseidon_profile_count() = 0 and role = 'ADMINISTRADOR')
    or (public.poseidon_profile_count() > 0 and role = 'CAJERO')
    or public.poseidon_is_admin()
  )
);
