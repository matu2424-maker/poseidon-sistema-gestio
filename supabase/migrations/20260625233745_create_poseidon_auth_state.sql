create table if not exists public.poseidon_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('CAJERO', 'ENCARGADO', 'ADMINISTRADOR')),
  status text not null default 'ACTIVO' check (status in ('ACTIVO', 'INACTIVO')),
  local_ids text[] not null default array['local-poseidon'::text],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.poseidon_app_state (
  id text primary key,
  data jsonb not null,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.poseidon_profiles enable row level security;
alter table public.poseidon_app_state enable row level security;

create or replace function public.poseidon_profile_count()
returns integer
language sql
security definer
as $$
  select count(*)::integer from public.poseidon_profiles;
$$;

create or replace function public.poseidon_current_role()
returns text
language sql
security definer
as $$
  select role from public.poseidon_profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.poseidon_is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from public.poseidon_profiles
    where user_id = auth.uid()
      and role = 'ADMINISTRADOR'
      and status = 'ACTIVO'
  );
$$;

create or replace function public.poseidon_is_active()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from public.poseidon_profiles
    where user_id = auth.uid()
      and status = 'ACTIVO'
  );
$$;

create or replace function public.set_poseidon_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_poseidon_profiles_updated_at on public.poseidon_profiles;
create trigger set_poseidon_profiles_updated_at
before update on public.poseidon_profiles
for each row execute function public.set_poseidon_updated_at();

drop trigger if exists set_poseidon_app_state_updated_at on public.poseidon_app_state;
create trigger set_poseidon_app_state_updated_at
before update on public.poseidon_app_state
for each row execute function public.set_poseidon_updated_at();

create policy poseidon_profiles_select
on public.poseidon_profiles
for select
to authenticated
using (user_id = auth.uid() or public.poseidon_is_admin());

create policy poseidon_profiles_insert_bootstrap
on public.poseidon_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (public.poseidon_profile_count() = 0 and role = 'ADMINISTRADOR')
    or public.poseidon_is_admin()
  )
);

create policy poseidon_profiles_update_admin
on public.poseidon_profiles
for update
to authenticated
using (public.poseidon_is_admin())
with check (public.poseidon_is_admin());

create policy poseidon_app_state_select
on public.poseidon_app_state
for select
to authenticated
using (id = 'main' and public.poseidon_is_active());

create policy poseidon_app_state_insert
on public.poseidon_app_state
for insert
to authenticated
with check (id = 'main' and public.poseidon_is_active());

create policy poseidon_app_state_update
on public.poseidon_app_state
for update
to authenticated
using (id = 'main' and public.poseidon_is_active())
with check (id = 'main' and public.poseidon_is_active());
