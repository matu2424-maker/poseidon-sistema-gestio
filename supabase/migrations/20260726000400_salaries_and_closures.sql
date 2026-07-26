begin;

create table public.salary_closures (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  visible_id text not null unique,
  period_month date not null,
  start_date date not null,
  end_date date not null,
  period_label text not null,
  kind public.salary_closure_kind not null,
  revision integer not null default 0,
  parent_closure_id uuid references public.salary_closures(id) on delete restrict,
  snapshot_version integer not null default 1,
  employee_count integer not null default 0,
  total_base numeric(18,2) not null default 0,
  total_extras numeric(18,2) not null default 0,
  total_bonuses numeric(18,2) not null default 0,
  total_deductions numeric(18,2) not null default 0,
  total_salaries numeric(18,2) not null default 0,
  total_salary_paid numeric(18,2) not null default 0,
  total_advances numeric(18,2) not null default 0,
  total_base_covered numeric(18,2) not null default 0,
  total_liquidated numeric(18,2) not null default 0,
  total_pending numeric(18,2) not null default 0,
  status public.salary_closure_status not null,
  note text not null,
  created_by uuid references public.profiles(id) on delete restrict,
  created_by_legacy_id text not null,
  created_by_name_snapshot text not null,
  created_at timestamptz not null default statement_timestamp(),
  closed_by uuid references public.profiles(id) on delete restrict,
  closed_by_legacy_id text,
  closed_by_name_snapshot text,
  closed_at timestamptz,
  updated_at timestamptz not null default statement_timestamp(),
  constraint salary_closures_period_first_day check (
    period_month = date_trunc('month', period_month)::date
  ),
  constraint salary_closures_range_valid check (start_date <= end_date),
  constraint salary_closures_period_label_not_blank check (btrim(period_label) <> ''),
  constraint salary_closures_revision_nonnegative check (revision >= 0),
  constraint salary_closures_snapshot_version_positive check (snapshot_version > 0),
  constraint salary_closures_counts_nonnegative check (employee_count >= 0),
  constraint salary_closures_amounts_nonnegative check (
    total_base >= 0
    and total_extras >= 0
    and total_bonuses >= 0
    and total_deductions >= 0
    and total_salaries >= 0
    and total_salary_paid >= 0
    and total_advances >= 0
    and total_base_covered >= 0
    and total_liquidated >= 0
    and total_pending >= 0
  ),
  constraint salary_closures_kind_shape check (
    (kind = 'ORDINARIO' and revision = 0 and parent_closure_id is null)
    or (kind = 'CORRECTIVO' and revision > 0 and parent_closure_id is not null)
  ),
  constraint salary_closures_status_shape check (
    (status = 'CORRECCION_ABIERTA' and kind = 'CORRECTIVO' and closed_at is null)
    or (status in ('CERRADO', 'ANULADO') and closed_at is not null)
  ),
  constraint salary_closures_creator_not_blank check (
    btrim(created_by_legacy_id) <> '' and btrim(created_by_name_snapshot) <> ''
  ),
  constraint salary_closures_closer_shape check (
    closed_at is null
    or (
      closed_by_legacy_id is not null
      and closed_by_name_snapshot is not null
      and btrim(closed_by_name_snapshot) <> ''
    )
  ),
  unique (period_month, revision)
);

create index salary_closures_period_status_idx
  on public.salary_closures (period_month desc, status, revision desc);
create index salary_closures_parent_idx
  on public.salary_closures (parent_closure_id) where parent_closure_id is not null;

create table public.salary_closure_locals (
  closure_id uuid not null references public.salary_closures(id) on delete restrict,
  local_id uuid not null references public.locals(id) on delete restrict,
  primary key (closure_id, local_id)
);

create index salary_closure_locals_local_idx
  on public.salary_closure_locals (local_id, closure_id);

create table public.salary_settlements (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  period_month date not null,
  balance_id uuid,
  staff_id uuid not null,
  staff_name_snapshot text not null,
  local_id uuid not null,
  payment_account_id uuid references public.current_accounts(id) on delete restrict,
  currency public.currency_code not null default 'UYU',
  base_salary numeric(18,2) not null default 0,
  advances numeric(18,2) not null default 0,
  extra_amount numeric(18,2) not null default 0,
  extra_concept text not null default '',
  aguinaldo numeric(18,2) not null default 0,
  vacation_salary numeric(18,2) not null default 0,
  other_deductions numeric(18,2) not null default 0,
  total_to_pay numeric(18,2) not null default 0,
  concept public.salary_concept not null,
  notes text not null default '',
  status public.salary_settlement_status not null default 'CONFIRMADA',
  origin public.salary_settlement_origin not null,
  created_by uuid references public.profiles(id) on delete restrict,
  created_by_legacy_id text not null,
  created_by_name_snapshot text not null,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_by_legacy_id text,
  approved_by_name_snapshot text,
  approved_at timestamptz,
  annulled_by uuid references public.profiles(id) on delete restrict,
  annulled_by_legacy_id text,
  annulled_by_name_snapshot text,
  annulled_at timestamptz,
  correction_closure_id uuid references public.salary_closures(id) on delete restrict,
  annulled_in_correction_closure_id uuid references public.salary_closures(id) on delete restrict,
  replaces_settlement_id uuid references public.salary_settlements(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint salary_settlements_balance_fk
    foreign key (balance_id, local_id) references public.cash_balances(id, local_id) on delete restrict,
  constraint salary_settlements_staff_fk
    foreign key (staff_id, local_id) references public.staff(id, local_id) on delete restrict,
  constraint salary_settlements_period_first_day check (
    period_month = date_trunc('month', period_month)::date
  ),
  constraint salary_settlements_amounts_nonnegative check (
    base_salary >= 0
    and advances >= 0
    and extra_amount >= 0
    and aguinaldo >= 0
    and vacation_salary >= 0
    and other_deductions >= 0
    and total_to_pay >= 0
  ),
  constraint salary_settlements_origin_shape check (
    (origin = 'CAJA' and balance_id is not null)
    or (origin = 'LIQUIDACION' and balance_id is null)
  ),
  constraint salary_settlements_staff_snapshot_not_blank check (btrim(staff_name_snapshot) <> ''),
  constraint salary_settlements_creator_not_blank check (
    btrim(created_by_legacy_id) <> '' and btrim(created_by_name_snapshot) <> ''
  ),
  constraint salary_settlements_approval_shape check (
    approved_at is null
    or (
      approved_by_legacy_id is not null
      and approved_by_name_snapshot is not null
      and btrim(approved_by_name_snapshot) <> ''
    )
  ),
  constraint salary_settlements_annulment_shape check (
    status <> 'ANULADA'
    or (
      annulled_at is not null
      and annulled_by_legacy_id is not null
      and annulled_by_name_snapshot is not null
    )
  ),
  constraint salary_settlements_correction_links_distinct check (
    correction_closure_id is null
    or annulled_in_correction_closure_id is null
    or correction_closure_id <> annulled_in_correction_closure_id
  ),
  unique (id, local_id)
);

create index salary_settlements_staff_period_idx
  on public.salary_settlements (staff_id, period_month desc, status);
create index salary_settlements_local_period_idx
  on public.salary_settlements (local_id, period_month desc, status);
create index salary_settlements_balance_idx
  on public.salary_settlements (balance_id, status) where balance_id is not null;
create index salary_settlements_payment_account_idx
  on public.salary_settlements (payment_account_id, created_at desc);
create index salary_settlements_correction_idx
  on public.salary_settlements (correction_closure_id)
  where correction_closure_id is not null;

create trigger salary_settlements_set_updated_at
before update on public.salary_settlements
for each row execute function private.set_updated_at();

create table public.salary_closure_employee_snapshots (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.salary_closures(id) on delete restrict,
  staff_id uuid not null,
  staff_name_snapshot text not null,
  position_snapshot text not null,
  local_id uuid not null,
  salary_type public.salary_type not null,
  base_salary numeric(18,2) not null,
  salary_paid numeric(18,2) not null,
  advances numeric(18,2) not null,
  extra_amount numeric(18,2) not null,
  bonuses numeric(18,2) not null,
  deductions numeric(18,2) not null,
  total_amount numeric(18,2) not null,
  base_covered_amount numeric(18,2) not null,
  liquidated_amount numeric(18,2) not null,
  pending_amount numeric(18,2) not null,
  settlement_count integer not null default 0,
  created_at timestamptz not null default statement_timestamp(),
  constraint salary_closure_employee_staff_fk
    foreign key (staff_id, local_id) references public.staff(id, local_id) on delete restrict,
  constraint salary_closure_employee_local_fk
    foreign key (closure_id, local_id)
    references public.salary_closure_locals(closure_id, local_id) on delete restrict,
  constraint salary_closure_employee_names_not_blank check (
    btrim(staff_name_snapshot) <> '' and btrim(position_snapshot) <> ''
  ),
  constraint salary_closure_employee_amounts_nonnegative check (
    base_salary >= 0
    and salary_paid >= 0
    and advances >= 0
    and extra_amount >= 0
    and bonuses >= 0
    and deductions >= 0
    and total_amount >= 0
    and base_covered_amount >= 0
    and liquidated_amount >= 0
    and pending_amount >= 0
    and settlement_count >= 0
  ),
  unique (closure_id, staff_id),
  unique (id, closure_id)
);

create index salary_closure_employee_local_idx
  on public.salary_closure_employee_snapshots (local_id, closure_id);

create trigger salary_closure_employee_snapshots_append_only
before update or delete on public.salary_closure_employee_snapshots
for each row execute function private.reject_append_only_mutation();

create table public.salary_closure_settlement_snapshots (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null,
  employee_snapshot_id uuid not null,
  source_settlement_id uuid references public.salary_settlements(id) on delete restrict,
  source_settlement_legacy_id text not null,
  concept public.salary_concept not null,
  amount numeric(18,2) not null,
  notes text not null default '',
  origin public.salary_settlement_origin not null,
  created_by_name_snapshot text not null,
  approved_by_name_snapshot text not null,
  source_created_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint salary_closure_settlement_employee_fk
    foreign key (employee_snapshot_id, closure_id)
    references public.salary_closure_employee_snapshots(id, closure_id) on delete restrict,
  constraint salary_closure_settlement_amount_nonnegative check (amount >= 0),
  constraint salary_closure_settlement_source_not_blank check (
    btrim(source_settlement_legacy_id) <> ''
    and btrim(created_by_name_snapshot) <> ''
    and btrim(approved_by_name_snapshot) <> ''
  ),
  unique (employee_snapshot_id, source_settlement_legacy_id)
);

create index salary_closure_settlement_closure_idx
  on public.salary_closure_settlement_snapshots (closure_id, source_created_at);

create trigger salary_closure_settlement_snapshots_append_only
before update or delete on public.salary_closure_settlement_snapshots
for each row execute function private.reject_append_only_mutation();

create function private.guard_salary_closure_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'salary closures are never deleted';
  end if;
  if old.status <> 'CORRECCION_ABIERTA' then
    raise exception using errcode = '55000', message = 'closed salary snapshots are immutable';
  end if;
  if new.status not in ('CERRADO', 'ANULADO') then
    raise exception using errcode = '23514', message = 'an open correction can only close or be annulled';
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke execute on function private.guard_salary_closure_mutation() from public;

create trigger salary_closures_guard_mutation
before update or delete on public.salary_closures
for each row execute function private.guard_salary_closure_mutation();

create trigger salary_closure_locals_append_only
before update or delete on public.salary_closure_locals
for each row execute function private.reject_append_only_mutation();

create table public.periodic_closures (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  visible_id text not null unique,
  local_id uuid not null references public.locals(id) on delete restrict,
  type public.periodic_closure_type not null,
  start_date date not null,
  end_date date not null,
  result_machines numeric(18,2) not null default 0,
  total_expenses numeric(18,2) not null default 0,
  total_salaries numeric(18,2) not null default 0,
  total_gifts numeric(18,2) not null default 0,
  total_outflows numeric(18,2) not null default 0,
  commercial_result numeric(18,2) not null default 0,
  total_transfers numeric(18,2) not null default 0,
  total_withdrawals numeric(18,2) not null default 0,
  total_contributions numeric(18,2) not null default 0,
  total_caja_to_principal numeric(18,2) not null default 0,
  total_principal_to_caja numeric(18,2) not null default 0,
  total_partner_contributions numeric(18,2) not null default 0,
  total_partner_withdrawals numeric(18,2) not null default 0,
  cash_difference numeric(18,2) not null default 0,
  bank_difference numeric(18,2) not null default 0,
  pending_differences integer not null default 0,
  status public.periodic_closure_status not null default 'GENERADO',
  note text not null default '',
  created_by uuid references public.profiles(id) on delete restrict,
  created_by_legacy_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint periodic_closures_range_valid check (start_date <= end_date),
  constraint periodic_closures_totals_nonnegative check (
    total_expenses >= 0
    and total_salaries >= 0
    and total_gifts >= 0
    and total_outflows >= 0
    and total_transfers >= 0
    and total_withdrawals >= 0
    and total_contributions >= 0
    and total_caja_to_principal >= 0
    and total_principal_to_caja >= 0
    and total_partner_contributions >= 0
    and total_partner_withdrawals >= 0
    and pending_differences >= 0
  ),
  constraint periodic_closures_actor_not_blank check (btrim(created_by_legacy_id) <> ''),
  unique (id, local_id)
);

create index periodic_closures_local_range_idx
  on public.periodic_closures (local_id, start_date desc, end_date desc);

create trigger periodic_closures_set_updated_at
before update on public.periodic_closures
for each row execute function private.set_updated_at();

create table public.periodic_closure_balances (
  closure_id uuid not null,
  balance_id uuid not null,
  local_id uuid not null,
  constraint periodic_closure_balances_closure_fk
    foreign key (closure_id, local_id) references public.periodic_closures(id, local_id) on delete restrict,
  constraint periodic_closure_balances_balance_fk
    foreign key (balance_id, local_id) references public.cash_balances(id, local_id) on delete restrict,
  primary key (closure_id, balance_id)
);

create table public.periodic_closure_expenses (
  closure_id uuid not null,
  expense_id uuid not null,
  local_id uuid not null,
  constraint periodic_closure_expenses_closure_fk
    foreign key (closure_id, local_id) references public.periodic_closures(id, local_id) on delete restrict,
  constraint periodic_closure_expenses_expense_fk
    foreign key (expense_id, local_id) references public.expenses(id, local_id) on delete restrict,
  primary key (closure_id, expense_id)
);

create table public.periodic_closure_salary_settlements (
  closure_id uuid not null,
  settlement_id uuid not null,
  local_id uuid not null,
  constraint periodic_closure_salaries_closure_fk
    foreign key (closure_id, local_id) references public.periodic_closures(id, local_id) on delete restrict,
  constraint periodic_closure_salaries_settlement_fk
    foreign key (settlement_id, local_id) references public.salary_settlements(id, local_id) on delete restrict,
  primary key (closure_id, settlement_id)
);

create table public.periodic_closure_treasury_transfers (
  closure_id uuid not null,
  treasury_transfer_id uuid not null,
  local_id uuid not null,
  constraint periodic_closure_treasury_closure_fk
    foreign key (closure_id, local_id) references public.periodic_closures(id, local_id) on delete restrict,
  constraint periodic_closure_treasury_transfer_fk
    foreign key (treasury_transfer_id, local_id) references public.treasury_transfers(id, local_id) on delete restrict,
  primary key (closure_id, treasury_transfer_id)
);

create table public.periodic_closure_partner_movements (
  closure_id uuid not null,
  partner_movement_id uuid not null,
  local_id uuid not null,
  constraint periodic_closure_partner_closure_fk
    foreign key (closure_id, local_id) references public.periodic_closures(id, local_id) on delete restrict,
  constraint periodic_closure_partner_movement_fk
    foreign key (partner_movement_id, local_id) references public.partner_movements(id, local_id) on delete restrict,
  primary key (closure_id, partner_movement_id)
);

create index periodic_closure_balances_local_idx
  on public.periodic_closure_balances (local_id, balance_id);
create index periodic_closure_expenses_local_idx
  on public.periodic_closure_expenses (local_id, expense_id);
create index periodic_closure_salaries_local_idx
  on public.periodic_closure_salary_settlements (local_id, settlement_id);
create index periodic_closure_treasury_local_idx
  on public.periodic_closure_treasury_transfers (local_id, treasury_transfer_id);
create index periodic_closure_partner_local_idx
  on public.periodic_closure_partner_movements (local_id, partner_movement_id);

create trigger periodic_closure_balances_append_only
before update or delete on public.periodic_closure_balances
for each row execute function private.reject_append_only_mutation();
create trigger periodic_closure_expenses_append_only
before update or delete on public.periodic_closure_expenses
for each row execute function private.reject_append_only_mutation();
create trigger periodic_closure_salaries_append_only
before update or delete on public.periodic_closure_salary_settlements
for each row execute function private.reject_append_only_mutation();
create trigger periodic_closure_treasury_append_only
before update or delete on public.periodic_closure_treasury_transfers
for each row execute function private.reject_append_only_mutation();
create trigger periodic_closure_partner_append_only
before update or delete on public.periodic_closure_partner_movements
for each row execute function private.reject_append_only_mutation();

-- Reverse after later migrations: drop periodic closure links, periodic
-- closures, salary snapshots, settlements, closure scopes, and closures.

commit;
