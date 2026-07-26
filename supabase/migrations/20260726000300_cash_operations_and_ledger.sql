begin;

create function private.bump_row_version()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.row_version := old.row_version + 1;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke execute on function private.bump_row_version() from public;

create table public.cash_balances (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  visible_id text not null,
  local_id uuid not null references public.locals(id) on delete restrict,
  operating_date date not null,
  status public.balance_status not null default 'EN_PROCESO',
  initial_cash numeric(18,2) not null,
  initial_bank numeric(18,2) not null default 0,
  initial_note text not null default '',
  opened_by uuid references public.profiles(id) on delete restrict,
  opened_by_legacy_id text not null,
  opened_by_role public.app_role not null,
  opened_at timestamptz not null default statement_timestamp(),
  closed_by uuid references public.profiles(id) on delete restrict,
  closed_by_legacy_id text,
  closed_by_role public.app_role,
  closed_at timestamptz,
  declared_cash numeric(18,2),
  declared_bank numeric(18,2),
  next_cash_base numeric(18,2),
  next_bank_base numeric(18,2),
  final_transfer_to_principal_cash numeric(18,2) not null default 0,
  final_transfer_to_principal_bank numeric(18,2) not null default 0,
  cash_difference numeric(18,2),
  bank_difference numeric(18,2),
  difference_note text not null default '',
  difference_status public.difference_status,
  difference_reviewed_by uuid references public.profiles(id) on delete restrict,
  difference_reviewed_by_legacy_id text,
  difference_reviewed_at timestamptz,
  difference_review_note text not null default '',
  row_version bigint not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint cash_balances_visible_id_not_blank check (btrim(visible_id) <> ''),
  constraint cash_balances_opening_actor_not_blank check (btrim(opened_by_legacy_id) <> ''),
  constraint cash_balances_initial_nonnegative check (initial_cash >= 0 and initial_bank >= 0),
  constraint cash_balances_declared_nonnegative check (
    (declared_cash is null or declared_cash >= 0)
    and (declared_bank is null or declared_bank >= 0)
    and (next_cash_base is null or next_cash_base >= 0)
    and (next_bank_base is null or next_bank_base >= 0)
  ),
  constraint cash_balances_transfers_nonnegative check (
    final_transfer_to_principal_cash >= 0 and final_transfer_to_principal_bank >= 0
  ),
  constraint cash_balances_close_actor_shape check (
    (closed_at is null and closed_by is null and closed_by_legacy_id is null and closed_by_role is null)
    or (closed_at is not null and closed_by_legacy_id is not null and closed_by_role is not null)
  ),
  constraint cash_balances_difference_review_shape check (
    difference_reviewed_at is null
    or (difference_reviewed_by_legacy_id is not null and btrim(difference_review_note) <> '')
  ),
  constraint cash_balances_row_version_positive check (row_version > 0),
  unique (local_id, visible_id),
  unique (id, local_id)
);

create unique index cash_balances_one_open_per_local_uq
  on public.cash_balances (local_id) where status = 'EN_PROCESO';
create index cash_balances_local_date_idx
  on public.cash_balances (local_id, operating_date desc, opened_at desc);
create index cash_balances_difference_idx
  on public.cash_balances (local_id, difference_status, closed_at desc)
  where difference_status is not null;

create trigger cash_balances_bump_row_version
before update on public.cash_balances
for each row execute function private.bump_row_version();

create table public.machine_readings (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  balance_id uuid not null,
  local_id uuid not null,
  machine_id uuid not null references public.machines(id) on delete restrict,
  in_previous numeric(18,2) not null,
  in_actual numeric(18,2),
  out_previous numeric(18,2) not null,
  out_actual numeric(18,2),
  result numeric(18,2) not null default 0,
  status public.reading_status not null default 'PENDIENTE',
  observation text not null default '',
  updated_by uuid references public.profiles(id) on delete restrict,
  updated_by_legacy_id text not null,
  row_version bigint not null default 1,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint machine_readings_balance_fk
    foreign key (balance_id, local_id) references public.cash_balances(id, local_id) on delete restrict,
  constraint machine_readings_counters_nonnegative check (
    in_previous >= 0
    and out_previous >= 0
    and (in_actual is null or in_actual >= 0)
    and (out_actual is null or out_actual >= 0)
  ),
  constraint machine_readings_monotonic check (
    (in_actual is null or in_actual >= in_previous)
    and (out_actual is null or out_actual >= out_previous)
  ),
  constraint machine_readings_result_consistent check (
    in_actual is null
    or out_actual is null
    or result = (in_actual - in_previous) - (out_actual - out_previous)
  ),
  constraint machine_readings_loaded_shape check (
    status <> 'CARGADA' or (in_actual is not null and out_actual is not null)
  ),
  constraint machine_readings_actor_not_blank check (btrim(updated_by_legacy_id) <> ''),
  constraint machine_readings_row_version_positive check (row_version > 0),
  unique (balance_id, machine_id)
);

create index machine_readings_local_balance_status_idx
  on public.machine_readings (local_id, balance_id, status);
create index machine_readings_machine_created_idx
  on public.machine_readings (machine_id, created_at desc);

create trigger machine_readings_bump_row_version
before update on public.machine_readings
for each row execute function private.bump_row_version();

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  balance_id uuid,
  local_id uuid not null references public.locals(id) on delete restrict,
  payment_account_id uuid not null references public.current_accounts(id) on delete restrict,
  category_id uuid not null references public.expense_categories(id) on delete restrict,
  subcategory_id uuid not null,
  category_name_snapshot text not null,
  subcategory_name_snapshot text not null,
  currency public.currency_code not null default 'UYU',
  amount numeric(18,2) not null,
  description text not null default '',
  receipt_reference text not null default '',
  status public.movement_status not null default 'ACTIVO',
  review_status public.expense_review_status,
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_by_legacy_id text,
  reviewed_at timestamptz,
  review_note text not null default '',
  created_by uuid references public.profiles(id) on delete restrict,
  created_by_legacy_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint expenses_balance_fk
    foreign key (balance_id, local_id) references public.cash_balances(id, local_id) on delete restrict,
  constraint expenses_subcategory_fk
    foreign key (category_id, subcategory_id)
    references public.expense_subcategories(category_id, id) on delete restrict,
  constraint expenses_amount_positive check (amount > 0),
  constraint expenses_category_snapshots_not_blank check (
    btrim(category_name_snapshot) <> '' and btrim(subcategory_name_snapshot) <> ''
  ),
  constraint expenses_actor_not_blank check (btrim(created_by_legacy_id) <> ''),
  constraint expenses_review_shape check (
    reviewed_at is null or reviewed_by_legacy_id is not null
  ),
  unique (id, local_id)
);

create index expenses_local_created_idx on public.expenses (local_id, created_at desc);
create index expenses_balance_status_idx on public.expenses (balance_id, status);
create index expenses_review_idx on public.expenses (local_id, review_status, created_at desc);
create index expenses_payment_account_idx on public.expenses (payment_account_id, created_at desc);

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function private.set_updated_at();

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  balance_id uuid not null,
  local_id uuid not null,
  client_id uuid,
  receipt text not null,
  beneficiary_name text not null,
  amount numeric(18,2) not null,
  destination_account text not null,
  status public.movement_status not null default 'ACTIVO',
  created_by uuid references public.profiles(id) on delete restrict,
  created_by_legacy_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint transfers_balance_fk
    foreign key (balance_id, local_id) references public.cash_balances(id, local_id) on delete restrict,
  constraint transfers_client_fk
    foreign key (client_id, local_id) references public.clients(id, local_id) on delete restrict,
  constraint transfers_receipt_not_blank check (btrim(receipt) <> ''),
  constraint transfers_beneficiary_not_blank check (btrim(beneficiary_name) <> ''),
  constraint transfers_account_not_blank check (btrim(destination_account) <> ''),
  constraint transfers_amount_positive check (amount > 0),
  constraint transfers_actor_not_blank check (btrim(created_by_legacy_id) <> '')
);

create index transfers_local_created_idx on public.transfers (local_id, created_at desc);
create index transfers_balance_status_idx on public.transfers (balance_id, status);
create index transfers_client_idx on public.transfers (client_id, created_at desc);

create trigger transfers_set_updated_at
before update on public.transfers
for each row execute function private.set_updated_at();

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  balance_id uuid not null,
  local_id uuid not null,
  primary_client_id uuid,
  type public.gift_type not null default 'EFECTIVO',
  cash_amount numeric(18,2) not null default 0,
  credit_amount numeric(18,2) not null default 0,
  reference text not null,
  description text not null default '',
  status public.movement_status not null default 'ACTIVO',
  created_by uuid references public.profiles(id) on delete restrict,
  created_by_legacy_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint gifts_balance_fk
    foreign key (balance_id, local_id) references public.cash_balances(id, local_id) on delete restrict,
  constraint gifts_primary_client_fk
    foreign key (primary_client_id, local_id) references public.clients(id, local_id) on delete restrict,
  constraint gifts_amounts_valid check (
    cash_amount >= 0 and credit_amount >= 0 and cash_amount + credit_amount > 0
  ),
  constraint gifts_type_amounts_consistent check (
    (type = 'EFECTIVO' and cash_amount > 0 and credit_amount = 0)
    or (type = 'CREDITO' and credit_amount > 0 and cash_amount = 0)
    or (type = 'MIXTO' and cash_amount > 0 and credit_amount > 0)
  ),
  constraint gifts_reference_not_blank check (btrim(reference) <> ''),
  constraint gifts_actor_not_blank check (btrim(created_by_legacy_id) <> ''),
  unique (id, local_id)
);

create index gifts_local_created_idx on public.gifts (local_id, created_at desc);
create index gifts_balance_status_idx on public.gifts (balance_id, status);

create trigger gifts_set_updated_at
before update on public.gifts
for each row execute function private.set_updated_at();

create table public.gift_clients (
  gift_id uuid not null,
  client_id uuid not null,
  local_id uuid not null,
  linked_at timestamptz not null default statement_timestamp(),
  constraint gift_clients_gift_fk
    foreign key (gift_id, local_id) references public.gifts(id, local_id) on delete restrict,
  constraint gift_clients_client_fk
    foreign key (client_id, local_id) references public.clients(id, local_id) on delete restrict,
  primary key (gift_id, client_id)
);

create index gift_clients_client_created_idx on public.gift_clients (client_id, linked_at desc);
create index gift_clients_local_gift_idx on public.gift_clients (local_id, gift_id);

create table public.capital_movements (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  balance_id uuid not null,
  local_id uuid not null,
  type public.capital_movement_type not null,
  medium public.capital_movement_medium not null,
  timing public.capital_movement_timing not null,
  person public.partner_code not null,
  amount numeric(18,2) not null,
  note text not null default '',
  status public.movement_status not null default 'ACTIVO',
  created_by uuid references public.profiles(id) on delete restrict,
  created_by_legacy_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint capital_movements_balance_fk
    foreign key (balance_id, local_id) references public.cash_balances(id, local_id) on delete restrict,
  constraint capital_movements_amount_positive check (amount > 0),
  constraint capital_movements_actor_not_blank check (btrim(created_by_legacy_id) <> '')
);

comment on table public.capital_movements is
  'Legacy compatibility only. New capital operations use treasury_transfers or partner_movements.';

create index capital_movements_local_created_idx
  on public.capital_movements (local_id, created_at desc);
create index capital_movements_balance_status_idx
  on public.capital_movements (balance_id, status);

create trigger capital_movements_set_updated_at
before update on public.capital_movements
for each row execute function private.set_updated_at();

create table public.treasury_transfers (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  balance_id uuid,
  local_id uuid not null references public.locals(id) on delete restrict,
  type public.treasury_transfer_type not null,
  medium public.financial_medium not null,
  timing public.treasury_transfer_timing not null default 'OPERATIVO',
  amount numeric(18,2) not null,
  currency public.currency_code not null default 'UYU',
  note text not null default '',
  status public.movement_status not null default 'ACTIVO',
  created_by uuid references public.profiles(id) on delete restrict,
  created_by_legacy_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint treasury_transfers_balance_fk
    foreign key (balance_id, local_id) references public.cash_balances(id, local_id) on delete restrict,
  constraint treasury_transfers_amount_positive check (amount > 0),
  constraint treasury_transfers_automatic_requires_balance check (
    timing = 'OPERATIVO' or balance_id is not null
  ),
  constraint treasury_transfers_actor_not_blank check (btrim(created_by_legacy_id) <> ''),
  unique (id, local_id)
);

create index treasury_transfers_local_created_idx
  on public.treasury_transfers (local_id, created_at desc);
create index treasury_transfers_balance_timing_idx
  on public.treasury_transfers (balance_id, timing, status);

create trigger treasury_transfers_set_updated_at
before update on public.treasury_transfers
for each row execute function private.set_updated_at();

create table public.partner_movements (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  balance_id uuid,
  local_id uuid not null references public.locals(id) on delete restrict,
  partner public.partner_code not null,
  type public.partner_movement_type not null,
  medium public.financial_medium not null,
  amount numeric(18,2) not null,
  currency public.currency_code not null default 'UYU',
  note text not null default '',
  status public.movement_status not null default 'ACTIVO',
  created_by uuid references public.profiles(id) on delete restrict,
  created_by_legacy_id text not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint partner_movements_balance_fk
    foreign key (balance_id, local_id) references public.cash_balances(id, local_id) on delete restrict,
  constraint partner_movements_amount_positive check (amount > 0),
  constraint partner_movements_actor_not_blank check (btrim(created_by_legacy_id) <> ''),
  unique (id, local_id)
);

create index partner_movements_local_created_idx
  on public.partner_movements (local_id, created_at desc);
create index partner_movements_partner_created_idx
  on public.partner_movements (partner, created_at desc);

create trigger partner_movements_set_updated_at
before update on public.partner_movements
for each row execute function private.set_updated_at();

create table public.account_movements (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  account_id uuid not null references public.current_accounts(id) on delete restrict,
  local_id uuid references public.locals(id) on delete restrict,
  balance_id uuid,
  source_type public.account_movement_source not null,
  source_id text not null,
  direction public.account_movement_direction not null,
  concept text not null,
  amount numeric(18,2) not null,
  currency public.currency_code not null default 'UYU',
  detail text not null,
  status public.movement_status not null default 'ACTIVO',
  actor_id uuid references public.profiles(id) on delete restrict,
  actor_legacy_id text not null,
  reversal_of uuid references public.account_movements(id) on delete restrict,
  previous_adjustment_id uuid references public.account_movements(id) on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  constraint account_movements_balance_fk
    foreign key (balance_id, local_id) references public.cash_balances(id, local_id) on delete restrict,
  constraint account_movements_source_not_blank check (btrim(source_id) <> ''),
  constraint account_movements_concept_not_blank check (btrim(concept) <> ''),
  constraint account_movements_detail_not_blank check (btrim(detail) <> ''),
  constraint account_movements_amount_positive check (amount > 0),
  constraint account_movements_actor_not_blank check (btrim(actor_legacy_id) <> ''),
  constraint account_movements_balance_local_shape check (balance_id is null or local_id is not null),
  constraint account_movements_reversal_not_self check (
    reversal_of is null or reversal_of <> id
  ),
  constraint account_movements_adjustment_not_self check (
    previous_adjustment_id is null or previous_adjustment_id <> id
  )
);

create unique index account_movements_single_reversal_uq
  on public.account_movements (reversal_of) where reversal_of is not null;
create index account_movements_account_created_idx
  on public.account_movements (account_id, created_at, id);
create index account_movements_local_created_idx
  on public.account_movements (local_id, created_at desc);
create index account_movements_balance_created_idx
  on public.account_movements (balance_id, created_at, id);
create index account_movements_source_idx
  on public.account_movements (source_type, source_id, created_at);
create index account_movements_previous_adjustment_idx
  on public.account_movements (previous_adjustment_id)
  where previous_adjustment_id is not null;

create trigger account_movements_append_only
before update or delete on public.account_movements
for each row execute function private.reject_append_only_mutation();

comment on table public.account_movements is
  'Append-only ledger. Corrections and annulments are new rows linked through reversal_of or previous_adjustment_id.';

-- Reverse after later migrations: remove account_movements first and then the
-- operational tables in reverse declaration order.

commit;
