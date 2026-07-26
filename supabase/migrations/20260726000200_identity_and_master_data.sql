begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  legacy_id text not null unique,
  username text not null,
  display_name text not null,
  role public.app_role not null,
  status public.user_status not null default 'ACTIVO',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint profiles_legacy_id_not_blank check (btrim(legacy_id) <> ''),
  constraint profiles_username_not_blank check (btrim(username) <> ''),
  constraint profiles_display_name_not_blank check (btrim(display_name) <> '')
);

create unique index profiles_username_ci_uq on public.profiles (lower(username));
create index profiles_role_status_idx on public.profiles (role, status);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create table public.locals (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  visible_id text not null unique,
  name text not null,
  tenant_name text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default 'Sin direccion',
  google_maps_url text not null default '',
  status public.local_status not null default 'ACTIVO',
  is_primary boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint locals_legacy_id_not_blank check (btrim(legacy_id) <> ''),
  constraint locals_visible_id_short_numeric check (visible_id ~ '^[0-9]{1,9}$'),
  constraint locals_name_not_blank check (btrim(name) <> ''),
  constraint locals_phone_numeric check (phone = '' or phone ~ '^[0-9]+$'),
  constraint locals_email_shape check (email = '' or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

create unique index locals_single_primary_uq on public.locals (is_primary) where is_primary;
create index locals_status_name_idx on public.locals (status, name);

create trigger locals_set_updated_at
before update on public.locals
for each row execute function private.set_updated_at();

create table public.user_locals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  local_id uuid not null references public.locals(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default statement_timestamp(),
  primary key (user_id, local_id)
);

create index user_locals_local_user_idx on public.user_locals (local_id, user_id);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  visible_id text not null,
  local_id uuid not null references public.locals(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  document_id text not null,
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  birth_date date,
  hire_date date not null,
  position public.staff_position not null,
  salary_type public.salary_type not null,
  nominal_salary numeric(18,2) not null default 0,
  salary_advance_balance numeric(18,2) not null default 0,
  vacation_days numeric(8,2) not null default 0,
  used_vacation_days numeric(8,2) not null default 0,
  estimated_aguinaldo numeric(18,2) not null default 0,
  estimated_vacation_salary numeric(18,2) not null default 0,
  emergency_contact text not null default '',
  bank_account text not null default '',
  notes text not null default '',
  status public.staff_status not null default 'ACTIVO',
  terminated_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint staff_visible_id_short_numeric check (visible_id ~ '^[0-9]{1,9}$'),
  constraint staff_first_name_not_blank check (btrim(first_name) <> ''),
  constraint staff_last_name_not_blank check (btrim(last_name) <> ''),
  constraint staff_document_not_blank check (btrim(document_id) <> ''),
  constraint staff_phone_numeric check (phone = '' or phone ~ '^[0-9]+$'),
  constraint staff_email_shape check (email = '' or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint staff_amounts_nonnegative check (
    nominal_salary >= 0
    and salary_advance_balance >= 0
    and vacation_days >= 0
    and used_vacation_days >= 0
    and estimated_aguinaldo >= 0
    and estimated_vacation_salary >= 0
  ),
  constraint staff_vacation_usage_valid check (used_vacation_days <= vacation_days),
  constraint staff_termination_state_valid check (
    (status = 'ACTIVO' and terminated_at is null and deleted_at is null)
    or status in ('BAJA', 'PAPELERA')
  ),
  unique (local_id, visible_id),
  unique (document_id),
  unique (id, local_id)
);

create index staff_local_status_name_idx on public.staff (local_id, status, last_name, first_name);
create index staff_hire_termination_idx on public.staff (hire_date, terminated_at);

create trigger staff_set_updated_at
before update on public.staff
for each row execute function private.set_updated_at();

create table public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null,
  local_id uuid not null,
  day public.week_day not null,
  start_time time,
  end_time time,
  rest boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint staff_schedules_staff_fk
    foreign key (staff_id, local_id) references public.staff(id, local_id) on delete cascade,
  constraint staff_schedules_time_valid check (
    (rest and start_time is null and end_time is null)
    or (not rest and start_time is not null and end_time is not null and start_time < end_time)
  ),
  unique (staff_id, day)
);

create index staff_schedules_local_staff_idx on public.staff_schedules (local_id, staff_id);

create trigger staff_schedules_set_updated_at
before update on public.staff_schedules
for each row execute function private.set_updated_at();

create table public.salary_history (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  staff_id uuid not null,
  local_id uuid not null,
  staff_name_snapshot text not null,
  previous_salary_type public.salary_type not null,
  new_salary_type public.salary_type not null,
  previous_nominal_salary numeric(18,2) not null,
  new_nominal_salary numeric(18,2) not null,
  effective_date date not null,
  reason text not null,
  changed_by uuid references public.profiles(id) on delete restrict,
  changed_by_legacy_id text not null,
  changed_by_name_snapshot text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint salary_history_staff_fk
    foreign key (staff_id, local_id) references public.staff(id, local_id) on delete restrict,
  constraint salary_history_amounts_nonnegative check (
    previous_nominal_salary >= 0 and new_nominal_salary >= 0
  ),
  constraint salary_history_reason_not_blank check (btrim(reason) <> ''),
  constraint salary_history_actor_not_blank check (
    btrim(changed_by_legacy_id) <> '' and btrim(changed_by_name_snapshot) <> ''
  )
);

create index salary_history_staff_effective_idx
  on public.salary_history (staff_id, effective_date desc, created_at desc);
create index salary_history_local_effective_idx
  on public.salary_history (local_id, effective_date desc);

create trigger salary_history_append_only
before update or delete on public.salary_history
for each row execute function private.reject_append_only_mutation();

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  visible_id text not null,
  local_id uuid not null references public.locals(id) on delete restrict,
  name text not null,
  document_type public.client_document_type not null,
  document_id text not null,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  birth_date date,
  category public.client_category not null default 'GENERAL',
  notes text not null default '',
  status public.client_status not null default 'ACTIVO',
  deleted_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint clients_visible_id_short_numeric check (visible_id ~ '^[0-9]{1,9}$'),
  constraint clients_name_not_blank check (btrim(name) <> ''),
  constraint clients_document_not_blank check (btrim(document_id) <> ''),
  constraint clients_phone_numeric check (phone = '' or phone ~ '^[0-9]+$'),
  constraint clients_email_shape check (email = '' or email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint clients_deleted_state_valid check (status <> 'PAPELERA' or deleted_at is not null),
  unique (local_id, visible_id),
  unique (document_type, document_id),
  unique (id, local_id)
);

create index clients_local_status_name_idx on public.clients (local_id, status, name);

create trigger clients_set_updated_at
before update on public.clients
for each row execute function private.set_updated_at();

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  name text not null,
  status public.expense_category_status not null default 'ACTIVA',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint expense_categories_name_not_blank check (btrim(name) <> '')
);

create unique index expense_categories_name_ci_uq on public.expense_categories (lower(name));

create trigger expense_categories_set_updated_at
before update on public.expense_categories
for each row execute function private.set_updated_at();

create table public.expense_subcategories (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  category_id uuid not null references public.expense_categories(id) on delete restrict,
  name text not null,
  status public.expense_category_status not null default 'ACTIVA',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint expense_subcategories_name_not_blank check (btrim(name) <> ''),
  unique (category_id, id)
);

create unique index expense_subcategories_category_name_ci_uq
  on public.expense_subcategories (category_id, lower(name));

create trigger expense_subcategories_set_updated_at
before update on public.expense_subcategories
for each row execute function private.set_updated_at();

create table public.machines (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  visible_id text not null unique,
  name text not null,
  current_location_kind public.machine_location_kind not null default 'TALLER',
  current_local_id uuid references public.locals(id) on delete restrict,
  location_label text not null default 'Taller',
  last_in numeric(18,2) not null default 0,
  last_out numeric(18,2) not null default 0,
  status public.machine_status not null default 'ACTIVA',
  notes text not null default '',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint machines_visible_id_short_numeric check (visible_id ~ '^[0-9]{1,9}$'),
  constraint machines_name_not_blank check (btrim(name) <> ''),
  constraint machines_counters_nonnegative check (last_in >= 0 and last_out >= 0),
  constraint machines_location_shape check (
    (current_location_kind = 'LOCAL' and current_local_id is not null)
    or (current_location_kind = 'TALLER' and current_local_id is null)
  ),
  constraint machines_disuse_only_in_workshop check (
    status <> 'DESUSO' or current_location_kind = 'TALLER'
  )
);

create index machines_local_status_name_idx on public.machines (current_local_id, status, name);
create index machines_workshop_status_idx
  on public.machines (status, name) where current_location_kind = 'TALLER';

create trigger machines_set_updated_at
before update on public.machines
for each row execute function private.set_updated_at();

create table public.machine_history (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  machine_id uuid references public.machines(id) on delete set null,
  machine_legacy_id text not null,
  machine_visible_id text not null,
  machine_name_snapshot text not null,
  location_kind public.machine_location_kind not null,
  local_id uuid references public.locals(id) on delete restrict,
  action public.machine_history_action not null,
  detail text not null,
  actor_id uuid references public.profiles(id) on delete restrict,
  actor_legacy_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint machine_history_machine_snapshot_not_blank check (
    btrim(machine_legacy_id) <> '' and btrim(machine_visible_id) <> '' and btrim(machine_name_snapshot) <> ''
  ),
  constraint machine_history_location_shape check (
    (location_kind = 'LOCAL' and local_id is not null)
    or (location_kind = 'TALLER' and local_id is null)
  ),
  constraint machine_history_actor_not_blank check (btrim(actor_legacy_id) <> '')
);

create index machine_history_machine_created_idx on public.machine_history (machine_id, created_at desc);
create index machine_history_local_created_idx on public.machine_history (local_id, created_at desc);

create trigger machine_history_append_only
before update or delete on public.machine_history
for each row execute function private.reject_append_only_mutation();

create table public.current_accounts (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  kind public.current_account_kind not null,
  local_id uuid references public.locals(id) on delete restrict,
  staff_id uuid,
  partner public.partner_code,
  name text not null,
  currency public.currency_code not null default 'UYU',
  status public.current_account_status not null default 'ACTIVA',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint current_accounts_name_not_blank check (btrim(name) <> ''),
  constraint current_accounts_staff_fk
    foreign key (staff_id, local_id) references public.staff(id, local_id) on delete restrict,
  constraint current_accounts_owner_shape check (
    (kind in ('LOCAL_EFECTIVO', 'LOCAL_BANCO') and local_id is not null and staff_id is null and partner is null)
    or (kind = 'PERSONAL' and local_id is not null and staff_id is not null and partner is null)
    or (kind = 'SOCIO' and local_id is null and staff_id is null and partner is not null)
    or (kind in ('TRANSFERENCIAS', 'PRINCIPAL_EFECTIVO', 'PRINCIPAL_BANCO') and local_id is null and staff_id is null and partner is null)
  )
);

create unique index current_accounts_local_kind_uq
  on public.current_accounts (local_id, kind)
  where kind in ('LOCAL_EFECTIVO', 'LOCAL_BANCO');
create unique index current_accounts_staff_uq
  on public.current_accounts (staff_id) where kind = 'PERSONAL';
create unique index current_accounts_partner_uq
  on public.current_accounts (partner) where kind = 'SOCIO';
create unique index current_accounts_singleton_kind_uq
  on public.current_accounts (kind)
  where kind in ('TRANSFERENCIAS', 'PRINCIPAL_EFECTIVO', 'PRINCIPAL_BANCO');
create index current_accounts_local_status_idx on public.current_accounts (local_id, status, kind);

create trigger current_accounts_set_updated_at
before update on public.current_accounts
for each row execute function private.set_updated_at();

create trigger current_accounts_no_delete
before delete on public.current_accounts
for each row execute function private.reject_append_only_mutation();

-- Reverse after later migrations: drop tables in reverse declaration order.

commit;
