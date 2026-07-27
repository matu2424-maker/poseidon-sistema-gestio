begin;

create function private.command_request_hash(
  p_command_name text,
  p_requested_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        'poseidon-command-v1'
          || pg_catalog.chr(31)
          || coalesce(p_command_name, '')
          || pg_catalog.chr(31)
          || coalesce(p_requested_function::text, '')
          || pg_catalog.chr(31)
          || coalesce(p_local_id::text, '')
          || pg_catalog.chr(31)
          || coalesce(p_payload, '{}'::jsonb)::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function private.claim_command(
  p_requested_function public.app_role,
  p_local_id uuid,
  p_command_name text,
  p_idempotency_key text,
  p_request_hash text
)
returns public.command_requests
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor record;
  v_request public.command_requests%rowtype;
begin
  select *
  into v_actor
  from private.assert_command_context(p_requested_function, p_local_id);

  if p_command_name is null
     or p_command_name !~ '^[a-z][a-z0-9_.-]{2,99}$' then
    raise exception using
      errcode = '22023',
      message = 'invalid command name';
  end if;

  if p_idempotency_key is null
     or p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$' then
    raise exception using
      errcode = '22023',
      message = 'invalid idempotency key';
  end if;

  if p_request_hash is null
     or p_request_hash !~ '^[0-9A-Fa-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'invalid command request hash';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_actor.actor_id::text
        || pg_catalog.chr(31)
        || p_command_name
        || pg_catalog.chr(31)
        || p_idempotency_key,
      0
    )
  );

  insert into public.command_requests (
    actor_id,
    actual_role,
    requested_function,
    command_name,
    local_id,
    idempotency_key,
    request_hash
  )
  values (
    v_actor.actor_id,
    v_actor.actual_role,
    p_requested_function,
    p_command_name,
    p_local_id,
    p_idempotency_key,
    pg_catalog.lower(p_request_hash)
  )
  on conflict (actor_id, command_name, idempotency_key) do nothing
  returning * into v_request;

  if v_request.id is null then
    select *
    into v_request
    from public.command_requests cr
    where cr.actor_id = v_actor.actor_id
      and cr.command_name = p_command_name
      and cr.idempotency_key = p_idempotency_key
    for update;

    if v_request.request_hash <> pg_catalog.lower(p_request_hash)
       or v_request.requested_function <> p_requested_function
       or v_request.local_id is distinct from p_local_id then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with a different request';
    end if;
  end if;

  return v_request;
end;
$$;

create function private.assert_active_command_local(p_local_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_local_id is null then
    raise exception using errcode = '22023', message = 'local is required';
  end if;

  if not exists (
    select 1
    from public.locals l
    where l.id = p_local_id
      and l.status = 'ACTIVO'
  ) then
    raise exception using
      errcode = '55000',
      message = 'the command local is not active';
  end if;
end;
$$;

create function private.positive_payload_amount(
  p_payload jsonb,
  p_field text default 'amount'
)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_amount numeric;
begin
  begin
    v_amount := nullif(pg_catalog.btrim(p_payload ->> p_field), '')::numeric;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception using
        errcode = '22023',
        message = pg_catalog.format('%s must be a valid amount', p_field);
  end;

  if v_amount is null
     or v_amount <= 0
     or v_amount::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using
      errcode = '22023',
      message = pg_catalog.format('%s must be finite and greater than zero', p_field);
  end if;

  return v_amount;
end;
$$;

create function private.require_current_account(
  p_kind public.current_account_kind,
  p_local_id uuid,
  p_partner public.partner_code
)
returns public.current_accounts
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.current_accounts%rowtype;
begin
  if p_kind in ('LOCAL_EFECTIVO', 'LOCAL_BANCO') then
    select *
    into v_account
    from public.current_accounts ca
    where ca.kind = p_kind
      and ca.local_id = p_local_id
      and ca.status = 'ACTIVA'
      and ca.currency = 'UYU';
  elsif p_kind = 'SOCIO' then
    select *
    into v_account
    from public.current_accounts ca
    where ca.kind = 'SOCIO'
      and ca.partner = p_partner
      and ca.status = 'ACTIVA'
      and ca.currency = 'UYU';
  elsif p_kind in ('PRINCIPAL_EFECTIVO', 'PRINCIPAL_BANCO', 'TRANSFERENCIAS') then
    select *
    into v_account
    from public.current_accounts ca
    where ca.kind = p_kind
      and ca.status = 'ACTIVA'
      and ca.currency = 'UYU';
  else
    raise exception using
      errcode = '22023',
      message = 'unsupported current account lookup';
  end if;

  if not found then
    raise exception using
      errcode = '23503',
      message = pg_catalog.format('active %s account not found', p_kind::text);
  end if;

  return v_account;
end;
$$;

create function private.resolve_expense_classification(p_payload jsonb)
returns table (
  category_id uuid,
  subcategory_id uuid,
  category_name text,
  subcategory_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_category_reference text := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'categoryId', p_payload ->> 'category_id', '')),
    ''
  );
  v_subcategory_reference text := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'subcategoryId', p_payload ->> 'subcategory_id', '')),
    ''
  );
  v_category_name text := pg_catalog.btrim(coalesce(p_payload ->> 'category', ''));
  v_subcategory_name text := pg_catalog.btrim(coalesce(p_payload ->> 'subcategory', ''));
begin
  select ec.id, esc.id, ec.name, esc.name
  into category_id, subcategory_id, category_name, subcategory_name
  from public.expense_categories ec
  join public.expense_subcategories esc on esc.category_id = ec.id
  where ec.status = 'ACTIVA'
    and esc.status = 'ACTIVA'
    and (
      (
        v_category_reference is not null
        and (
          ec.id::text = v_category_reference
          or ec.legacy_id = v_category_reference
        )
      )
      or (
        v_category_reference is null
        and v_category_name <> ''
        and pg_catalog.lower(ec.name) = pg_catalog.lower(v_category_name)
      )
    )
    and (
      (
        v_subcategory_reference is not null
        and (
          esc.id::text = v_subcategory_reference
          or esc.legacy_id = v_subcategory_reference
        )
      )
      or (
        v_subcategory_reference is null
        and v_subcategory_name <> ''
        and pg_catalog.lower(esc.name) = pg_catalog.lower(v_subcategory_name)
      )
    )
    and (
      v_category_name = ''
      or pg_catalog.lower(ec.name) = pg_catalog.lower(v_category_name)
    )
    and (
      v_subcategory_name = ''
      or pg_catalog.lower(esc.name) = pg_catalog.lower(v_subcategory_name)
    );

  if not found then
    raise exception using
      errcode = '23503',
      message = 'active expense category and subcategory not found';
  end if;

  return next;
end;
$$;

create function private.lock_current_accounts(p_account_ids uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_account_ids uuid[];
  v_locked_count integer;
begin
  select pg_catalog.array_agg(distinct requested.account_id order by requested.account_id)
  into v_account_ids
  from pg_catalog.unnest(p_account_ids) requested(account_id)
  where requested.account_id is not null;

  if coalesce(pg_catalog.cardinality(v_account_ids), 0) = 0 then
    raise exception using errcode = '22023', message = 'at least one account is required';
  end if;

  select pg_catalog.count(*)::integer
  into v_locked_count
  from (
    select ca.id
    from public.current_accounts ca
    where ca.id = any(v_account_ids)
      and ca.status = 'ACTIVA'
      and ca.currency = 'UYU'
    order by ca.id
    for update
  ) locked;

  if v_locked_count <> pg_catalog.cardinality(v_account_ids) then
    raise exception using
      errcode = '23503',
      message = 'one or more active UYU accounts were not found';
  end if;
end;
$$;

create function private.append_account_movement(
  p_command_request_id uuid,
  p_account_id uuid,
  p_local_id uuid,
  p_balance_id uuid,
  p_source_type public.account_movement_source,
  p_source_id text,
  p_direction public.account_movement_direction,
  p_concept text,
  p_amount numeric,
  p_detail text,
  p_reversal_of uuid default null,
  p_created_at timestamptz default statement_timestamp()
)
returns public.account_movements
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor_legacy_id text;
  v_movement_id uuid := extensions.gen_random_uuid();
  v_movement public.account_movements%rowtype;
begin
  select cr.actor_id, p.legacy_id
  into v_actor_id, v_actor_legacy_id
  from public.command_requests cr
  join public.profiles p on p.id = cr.actor_id
  where cr.id = p_command_request_id
    and cr.actor_id = auth.uid()
    and cr.status = 'PENDIENTE';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'pending authenticated command not found for ledger append';
  end if;

  if p_amount is null
     or p_amount <= 0
     or p_amount::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using
      errcode = '22023',
      message = 'ledger amount must be finite and greater than zero';
  end if;

  insert into public.account_movements (
    id,
    legacy_id,
    account_id,
    local_id,
    balance_id,
    source_type,
    source_id,
    direction,
    concept,
    amount,
    currency,
    detail,
    status,
    actor_id,
    actor_legacy_id,
    reversal_of,
    created_at
  )
  values (
    v_movement_id,
    'account-movement-' || v_movement_id::text,
    p_account_id,
    p_local_id,
    p_balance_id,
    p_source_type,
    pg_catalog.btrim(p_source_id),
    p_direction,
    pg_catalog.btrim(p_concept),
    p_amount,
    'UYU',
    pg_catalog.btrim(p_detail),
    'ACTIVO',
    v_actor_id,
    v_actor_legacy_id,
    p_reversal_of,
    coalesce(p_created_at, statement_timestamp())
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

create function private.reverse_account_movements(
  p_command_request_id uuid,
  p_local_id uuid,
  p_source_types public.account_movement_source[],
  p_source_ids text[],
  p_expected_count integer,
  p_reason text
)
returns uuid[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_account_ids uuid[];
  v_original_count integer;
  v_original public.account_movements%rowtype;
  v_reversal public.account_movements%rowtype;
  v_reversal_ids uuid[] := array[]::uuid[];
  v_outflow record;
  v_created_at timestamptz := statement_timestamp();
begin
  if pg_catalog.btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '22023', message = 'a reversal reason is required';
  end if;

  select
    pg_catalog.count(*)::integer,
    pg_catalog.array_agg(distinct am.account_id order by am.account_id)
  into v_original_count, v_account_ids
  from public.account_movements am
  where am.local_id = p_local_id
    and am.source_type = any(p_source_types)
    and am.source_id = any(p_source_ids)
    and am.status = 'ACTIVO'
    and am.reversal_of is null;

  if v_original_count <> p_expected_count then
    raise exception using
      errcode = '55000',
      message = pg_catalog.format(
        'expected %s active original ledger rows, found %s',
        p_expected_count,
        v_original_count
      );
  end if;

  if exists (
    select 1
    from public.account_movements original
    join public.account_movements reversal on reversal.reversal_of = original.id
    where original.local_id = p_local_id
      and original.source_type = any(p_source_types)
      and original.source_id = any(p_source_ids)
      and original.status = 'ACTIVO'
      and original.reversal_of is null
  ) then
    raise exception using
      errcode = '55000',
      message = 'one or more original ledger rows already have a reversal';
  end if;

  perform private.lock_current_accounts(v_account_ids);

  for v_outflow in
    select am.account_id, pg_catalog.sum(am.amount)::numeric as amount
    from public.account_movements am
    join public.current_accounts ca on ca.id = am.account_id
    where am.local_id = p_local_id
      and am.source_type = any(p_source_types)
      and am.source_id = any(p_source_ids)
      and am.status = 'ACTIVO'
      and am.reversal_of is null
      and am.direction = 'ENTRADA'
      and ca.kind in (
        'LOCAL_EFECTIVO',
        'LOCAL_BANCO',
        'PRINCIPAL_EFECTIVO',
        'PRINCIPAL_BANCO'
      )
    group by am.account_id
  loop
    perform private.assert_available_funds(v_outflow.account_id, v_outflow.amount);
  end loop;

  for v_original in
    select am.*
    from public.account_movements am
    where am.local_id = p_local_id
      and am.source_type = any(p_source_types)
      and am.source_id = any(p_source_ids)
      and am.status = 'ACTIVO'
      and am.reversal_of is null
    order by am.created_at, am.id
  loop
    select *
    into v_reversal
    from private.append_account_movement(
      p_command_request_id,
      v_original.account_id,
      v_original.local_id,
      v_original.balance_id,
      'AJUSTE',
      v_original.source_id,
      case
        when v_original.direction = 'ENTRADA' then 'SALIDA'::public.account_movement_direction
        else 'ENTRADA'::public.account_movement_direction
      end,
      'REVERSO_' || v_original.concept,
      v_original.amount,
      pg_catalog.btrim(p_reason) || ' - reverso de ' || v_original.detail,
      v_original.id,
      v_created_at
    );
    v_reversal_ids := pg_catalog.array_append(v_reversal_ids, v_reversal.id);
  end loop;

  return v_reversal_ids;
end;
$$;

create function private.account_movements_json(p_movement_ids uuid[])
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  select coalesce(
    pg_catalog.jsonb_agg(pg_catalog.to_jsonb(am) order by am.created_at, am.id),
    '[]'::jsonb
  )
  from public.account_movements am
  where am.id = any(coalesce(p_movement_ids, array[]::uuid[]));
$$;

create function private.append_command_audit(
  p_command_request_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_local_id uuid,
  p_previous_value jsonb,
  p_new_value jsonb,
  p_reason text default ''
)
returns public.audit_events
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_profile public.profiles%rowtype;
  v_event_id uuid := extensions.gen_random_uuid();
  v_event public.audit_events%rowtype;
begin
  select *
  into v_request
  from public.command_requests cr
  where cr.id = p_command_request_id
    and cr.actor_id = auth.uid()
    and cr.status = 'PENDIENTE';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'pending authenticated command not found for audit append';
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'active authenticated audit actor not found';
  end if;

  insert into public.audit_events (
    id,
    legacy_id,
    actor_id,
    actor_legacy_id,
    actor_name_snapshot,
    actual_role,
    requested_function,
    action,
    entity_type,
    entity_id,
    primary_local_id,
    previous_value,
    new_value,
    reason,
    command_request_id
  )
  values (
    v_event_id,
    'audit-' || v_event_id::text,
    v_profile.id,
    v_profile.legacy_id,
    v_profile.display_name,
    v_request.actual_role,
    v_request.requested_function,
    pg_catalog.btrim(p_action),
    pg_catalog.btrim(p_entity_type),
    pg_catalog.btrim(p_entity_id),
    p_local_id,
    coalesce(p_previous_value, '{}'::jsonb),
    coalesce(p_new_value, '{}'::jsonb),
    pg_catalog.btrim(coalesce(p_reason, '')),
    v_request.id
  )
  returning * into v_event;

  insert into public.audit_event_locals (audit_event_id, local_id)
  values (v_event.id, p_local_id);

  return v_event;
end;
$$;

create function private.assert_open_cash_reconciled(
  p_balance_id uuid,
  p_local_id uuid
)
returns numeric
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_balance public.cash_balances%rowtype;
  v_cash_account public.current_accounts%rowtype;
  v_expected numeric;
  v_actual numeric;
begin
  select *
  into v_balance
  from public.cash_balances cb
  where cb.id = p_balance_id
    and cb.local_id = p_local_id
    and cb.status = 'EN_PROCESO';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'an open cash balance is required';
  end if;

  v_cash_account := private.require_current_account('LOCAL_EFECTIVO', p_local_id, null);

  select
    v_balance.initial_cash
      + coalesce(
          pg_catalog.sum(
            case
              when am.direction = 'ENTRADA' then am.amount
              else -am.amount
            end
          ),
          0
        )
  into v_expected
  from public.account_movements am
  where am.account_id = v_cash_account.id
    and am.balance_id = v_balance.id
    and am.status = 'ACTIVO'
    and not (
      am.source_type = 'TRASPASO_CAJA'
      and exists (
        select 1
        from public.treasury_transfers tt
        where tt.balance_id = v_balance.id
          and tt.timing = 'APERTURA'
          and (
            tt.id::text = am.source_id
            or tt.legacy_id = am.source_id
          )
      )
    );

  v_actual := private.account_balance(v_cash_account.id);

  if v_actual <> v_expected then
    raise exception using
      errcode = '23514',
      message = 'cash balance and account ledger are not reconciled',
      detail = pg_catalog.format(
        'balance_id=%s expected=%s ledger=%s',
        v_balance.id,
        v_expected,
        v_actual
      );
  end if;

  return v_actual;
end;
$$;

create function public.poseidon_create_expense(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_balance public.cash_balances%rowtype;
  v_account public.current_accounts%rowtype;
  v_expense public.expenses%rowtype;
  v_movement public.account_movements%rowtype;
  v_category record;
  v_actor_legacy_id text;
  v_amount numeric;
  v_balance_reference text;
  v_description text;
  v_receipt_reference text;
  v_expense_id uuid := extensions.gen_random_uuid();
  v_movement_ids uuid[];
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'create_expense',
    p_idempotency_key,
    private.command_request_hash('create_expense', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  if p_actor_function <> 'CAJERO' then
    raise exception using
      errcode = '42501',
      message = 'cash expenses require the cashier function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_balance_reference := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')),
    ''
  );
  if v_balance_reference is null then
    raise exception using errcode = '22023', message = 'balanceId is required';
  end if;

  select *
  into v_balance
  from public.cash_balances cb
  where cb.local_id = p_local_id
    and (
      cb.id::text = v_balance_reference
      or cb.legacy_id = v_balance_reference
    )
  for update;

  if not found or v_balance.status <> 'EN_PROCESO' then
    raise exception using
      errcode = '55000',
      message = 'cash expenses require the active balance for the local';
  end if;

  select *
  into v_category
  from private.resolve_expense_classification(p_payload);

  v_amount := private.positive_payload_amount(p_payload);
  v_description := pg_catalog.btrim(coalesce(p_payload ->> 'description', ''));
  v_receipt_reference := pg_catalog.btrim(
    coalesce(
      p_payload ->> 'receiptReference',
      p_payload ->> 'receipt_reference',
      p_payload ->> 'receiptFileName',
      p_payload ->> 'receipt',
      ''
    )
  );
  v_account := private.require_current_account('LOCAL_EFECTIVO', p_local_id, null);

  perform private.lock_current_accounts(array[v_account.id]);
  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  perform private.assert_available_funds(v_account.id, v_amount);

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  insert into public.expenses (
    id,
    legacy_id,
    balance_id,
    local_id,
    payment_account_id,
    category_id,
    subcategory_id,
    category_name_snapshot,
    subcategory_name_snapshot,
    currency,
    amount,
    description,
    receipt_reference,
    status,
    created_by,
    created_by_legacy_id
  )
  values (
    v_expense_id,
    'expense-' || v_expense_id::text,
    v_balance.id,
    p_local_id,
    v_account.id,
    v_category.category_id,
    v_category.subcategory_id,
    v_category.category_name,
    v_category.subcategory_name,
    'UYU',
    v_amount,
    v_description,
    v_receipt_reference,
    'ACTIVO',
    v_request.actor_id,
    v_actor_legacy_id
  )
  returning * into v_expense;

  select *
  into v_movement
  from private.append_account_movement(
    v_request.id,
    v_account.id,
    p_local_id,
    v_balance.id,
    'GASTO',
    v_expense.id::text,
    'SALIDA',
    'GASTO',
    v_expense.amount,
    v_expense.category_name_snapshot
      || ' / '
      || v_expense.subcategory_name_snapshot
      || case
           when v_expense.description = '' then ''
           else ' - ' || v_expense.description
         end
  );
  v_movement_ids := array[v_movement.id];

  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  perform private.append_command_audit(
    v_request.id,
    'Crear gasto',
    'Gasto',
    v_expense.id::text,
    p_local_id,
    '{}'::jsonb,
    pg_catalog.to_jsonb(v_expense)
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_expense),
    'ledger', private.account_movements_json(v_movement_ids),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_create_principal_expense(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_account public.current_accounts%rowtype;
  v_expense public.expenses%rowtype;
  v_movement public.account_movements%rowtype;
  v_category record;
  v_actor_legacy_id text;
  v_amount numeric;
  v_payment_reference text;
  v_medium text;
  v_balance_reference text;
  v_expense_id uuid := extensions.gen_random_uuid();
  v_movement_ids uuid[];
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'create_principal_expense',
    p_idempotency_key,
    private.command_request_hash('create_principal_expense', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'principal expenses require a control function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_balance_reference := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')),
    ''
  );
  if v_balance_reference is not null then
    raise exception using
      errcode = '22023',
      message = 'principal expenses must not include balanceId';
  end if;

  select *
  into v_category
  from private.resolve_expense_classification(p_payload);

  v_amount := private.positive_payload_amount(p_payload);
  v_payment_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'paymentAccountId', p_payload ->> 'payment_account_id', '')
    ),
    ''
  );
  v_medium := pg_catalog.upper(pg_catalog.btrim(coalesce(p_payload ->> 'medium', '')));

  if v_medium not in ('', 'EFECTIVO', 'BANCO') then
    raise exception using errcode = '22023', message = 'medium must be EFECTIVO or BANCO';
  end if;

  if v_payment_reference is not null then
    select *
    into v_account
    from public.current_accounts ca
    where (
        ca.id::text = v_payment_reference
        or ca.legacy_id = v_payment_reference
      )
      and ca.kind in ('PRINCIPAL_EFECTIVO', 'PRINCIPAL_BANCO')
      and ca.status = 'ACTIVA'
      and ca.currency = 'UYU';

    if not found then
      raise exception using
        errcode = '23503',
        message = 'active Principal payment account not found';
    end if;
  elsif v_medium = 'EFECTIVO' then
    v_account := private.require_current_account('PRINCIPAL_EFECTIVO', null, null);
  elsif v_medium = 'BANCO' then
    v_account := private.require_current_account('PRINCIPAL_BANCO', null, null);
  else
    raise exception using
      errcode = '22023',
      message = 'paymentAccountId or medium is required';
  end if;

  if (v_medium = 'EFECTIVO' and v_account.kind <> 'PRINCIPAL_EFECTIVO')
     or (v_medium = 'BANCO' and v_account.kind <> 'PRINCIPAL_BANCO') then
    raise exception using
      errcode = '22023',
      message = 'payment account and medium do not match';
  end if;

  perform private.lock_current_accounts(array[v_account.id]);
  perform private.assert_available_funds(v_account.id, v_amount);

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  insert into public.expenses (
    id,
    legacy_id,
    balance_id,
    local_id,
    payment_account_id,
    category_id,
    subcategory_id,
    category_name_snapshot,
    subcategory_name_snapshot,
    currency,
    amount,
    description,
    receipt_reference,
    status,
    review_status,
    created_by,
    created_by_legacy_id
  )
  values (
    v_expense_id,
    'principal-expense-' || v_expense_id::text,
    null,
    p_local_id,
    v_account.id,
    v_category.category_id,
    v_category.subcategory_id,
    v_category.category_name,
    v_category.subcategory_name,
    'UYU',
    v_amount,
    pg_catalog.btrim(coalesce(p_payload ->> 'description', '')),
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'receiptReference',
        p_payload ->> 'receipt_reference',
        p_payload ->> 'receiptFileName',
        p_payload ->> 'receipt',
        ''
      )
    ),
    'ACTIVO',
    'PENDIENTE',
    v_request.actor_id,
    v_actor_legacy_id
  )
  returning * into v_expense;

  select *
  into v_movement
  from private.append_account_movement(
    v_request.id,
    v_account.id,
    p_local_id,
    null,
    'GASTO',
    v_expense.id::text,
    'SALIDA',
    'GASTO',
    v_expense.amount,
    v_expense.category_name_snapshot
      || ' / '
      || v_expense.subcategory_name_snapshot
      || case
           when v_expense.description = '' then ''
           else ' - ' || v_expense.description
         end
  );
  v_movement_ids := array[v_movement.id];

  perform private.append_command_audit(
    v_request.id,
    'Crear gasto desde Principal',
    'Gasto',
    v_expense.id::text,
    p_local_id,
    '{}'::jsonb,
    pg_catalog.to_jsonb(v_expense)
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_expense),
    'ledger', private.account_movements_json(v_movement_ids),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_annul_expense(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_previous public.expenses%rowtype;
  v_expense public.expenses%rowtype;
  v_balance public.cash_balances%rowtype;
  v_account public.current_accounts%rowtype;
  v_actor_legacy_id text;
  v_expense_reference text;
  v_balance_reference text;
  v_reason text;
  v_reversal_ids uuid[];
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'annul_expense',
    p_idempotency_key,
    private.command_request_hash('annul_expense', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_expense_reference := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'expenseId', p_payload ->> 'expense_id', '')),
    ''
  );
  if v_expense_reference is null then
    raise exception using errcode = '22023', message = 'expenseId is required';
  end if;

  select *
  into v_previous
  from public.expenses e
  where e.local_id = p_local_id
    and (
      e.id::text = v_expense_reference
      or e.legacy_id = v_expense_reference
    )
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'expense not found in command local';
  end if;

  if v_previous.status = 'ANULADO' then
    raise exception using errcode = '55000', message = 'expense is already annulled';
  end if;

  select *
  into v_account
  from public.current_accounts ca
  where ca.id = v_previous.payment_account_id
    and ca.status = 'ACTIVA'
    and ca.currency = 'UYU';

  if not found then
    raise exception using errcode = '23503', message = 'expense payment account is not active';
  end if;

  v_balance_reference := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')),
    ''
  );
  v_reason := pg_catalog.btrim(coalesce(p_payload ->> 'reason', p_payload ->> 'note', ''));

  if v_previous.balance_id is not null then
    if p_actor_function not in ('CAJERO', 'ENCARGADO', 'ADMINISTRADOR') then
      raise exception using errcode = '42501', message = 'function cannot annul cash expenses';
    end if;
    if v_account.kind <> 'LOCAL_EFECTIVO'
       or v_account.local_id <> p_local_id then
      raise exception using
        errcode = '55000',
        message = 'cash expense payment account is inconsistent';
    end if;

    select *
    into v_balance
    from public.cash_balances cb
    where cb.id = v_previous.balance_id
      and cb.local_id = p_local_id
    for update;

    if not found or v_balance.status <> 'EN_PROCESO' then
      raise exception using
        errcode = '55000',
        message = 'cash expenses can only be annulled while their balance is open';
    end if;

    if v_balance_reference is not null
       and v_balance_reference not in (v_balance.id::text, v_balance.legacy_id) then
      raise exception using
        errcode = '22023',
        message = 'balanceId does not match the expense balance';
    end if;

    if v_reason = '' and p_actor_function = 'CAJERO' then
      v_reason := 'Anulacion operativa antes del cierre';
    end if;
  else
    if p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
      raise exception using
        errcode = '42501',
        message = 'Principal expenses require a control function';
    end if;
    if v_account.kind not in ('PRINCIPAL_EFECTIVO', 'PRINCIPAL_BANCO') then
      raise exception using
        errcode = '55000',
        message = 'Principal expense payment account is inconsistent';
    end if;
    if v_balance_reference is not null then
      raise exception using
        errcode = '22023',
        message = 'Principal expenses must not include balanceId';
    end if;
  end if;

  if v_reason = '' then
    raise exception using errcode = '22023', message = 'annulment reason is required';
  end if;

  perform private.lock_current_accounts(array[v_account.id]);
  if v_previous.balance_id is not null then
    perform private.assert_open_cash_reconciled(v_previous.balance_id, p_local_id);
  end if;

  v_reversal_ids := private.reverse_account_movements(
    v_request.id,
    p_local_id,
    array['GASTO'::public.account_movement_source],
    array[v_previous.id::text, v_previous.legacy_id],
    1,
    v_reason
  );

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  update public.expenses e
  set
    status = 'ANULADO',
    review_status = 'OBSERVADO',
    reviewed_by = v_request.actor_id,
    reviewed_by_legacy_id = v_actor_legacy_id,
    reviewed_at = statement_timestamp(),
    review_note = v_reason
  where e.id = v_previous.id
  returning * into v_expense;

  if v_previous.balance_id is not null then
    perform private.assert_open_cash_reconciled(v_previous.balance_id, p_local_id);
  end if;

  perform private.append_command_audit(
    v_request.id,
    case
      when v_previous.balance_id is null then 'Anular gasto desde Principal'
      else 'Anular gasto'
    end,
    'Gasto',
    v_expense.id::text,
    p_local_id,
    pg_catalog.to_jsonb(v_previous),
    pg_catalog.to_jsonb(v_expense),
    v_reason
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_expense),
    'ledger', private.account_movements_json(v_reversal_ids),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_review_expense(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_previous public.expenses%rowtype;
  v_expense public.expenses%rowtype;
  v_expense_reference text;
  v_review_status text;
  v_note text;
  v_actor_legacy_id text;
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'review_expense',
    p_idempotency_key,
    private.command_request_hash('review_expense', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'expense review requires a control function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_expense_reference := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'expenseId', p_payload ->> 'expense_id', '')),
    ''
  );
  v_review_status := pg_catalog.upper(
    pg_catalog.btrim(coalesce(p_payload ->> 'status', p_payload ->> 'reviewStatus', ''))
  );
  v_note := pg_catalog.btrim(coalesce(p_payload ->> 'note', ''));

  if v_expense_reference is null then
    raise exception using errcode = '22023', message = 'expenseId is required';
  end if;
  if v_review_status not in ('PENDIENTE', 'REVISADO', 'OBSERVADO') then
    raise exception using errcode = '22023', message = 'invalid expense review status';
  end if;
  if v_review_status = 'OBSERVADO' and v_note = '' then
    raise exception using
      errcode = '22023',
      message = 'observed expenses require a review note';
  end if;

  select *
  into v_previous
  from public.expenses e
  where e.local_id = p_local_id
    and (
      e.id::text = v_expense_reference
      or e.legacy_id = v_expense_reference
    )
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'expense not found in command local';
  end if;

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  update public.expenses e
  set
    review_status = v_review_status::public.expense_review_status,
    reviewed_by = v_request.actor_id,
    reviewed_by_legacy_id = v_actor_legacy_id,
    reviewed_at = statement_timestamp(),
    review_note = v_note
  where e.id = v_previous.id
  returning * into v_expense;

  perform private.append_command_audit(
    v_request.id,
    'Revisar gasto',
    'Gasto',
    v_expense.id::text,
    p_local_id,
    pg_catalog.to_jsonb(v_previous),
    pg_catalog.to_jsonb(v_expense),
    v_note
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_expense),
    'ledger', '[]'::jsonb,
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_create_treasury_transfer(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_open_balance public.cash_balances%rowtype;
  v_local_account public.current_accounts%rowtype;
  v_principal_account public.current_accounts%rowtype;
  v_source_account_id uuid;
  v_transfer public.treasury_transfers%rowtype;
  v_source_movement public.account_movements%rowtype;
  v_destination_movement public.account_movements%rowtype;
  v_actor_legacy_id text;
  v_balance_reference text;
  v_type text;
  v_medium text;
  v_timing text;
  v_amount numeric;
  v_note text;
  v_transfer_id uuid := extensions.gen_random_uuid();
  v_movement_ids uuid[];
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'create_treasury_transfer',
    p_idempotency_key,
    private.command_request_hash('create_treasury_transfer', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('CAJERO', 'ENCARGADO', 'ADMINISTRADOR') then
    raise exception using errcode = '42501', message = 'function cannot operate treasury';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_balance_reference := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')),
    ''
  );
  v_type := pg_catalog.upper(pg_catalog.btrim(coalesce(p_payload ->> 'type', '')));
  v_medium := pg_catalog.upper(pg_catalog.btrim(coalesce(p_payload ->> 'medium', '')));
  v_timing := pg_catalog.upper(pg_catalog.btrim(coalesce(p_payload ->> 'timing', 'OPERATIVO')));
  v_amount := private.positive_payload_amount(p_payload);
  v_note := pg_catalog.btrim(coalesce(p_payload ->> 'note', ''));

  if v_type not in ('RETIRO_CAJA', 'APORTE_CAJA') then
    raise exception using errcode = '22023', message = 'invalid treasury transfer type';
  end if;
  if v_medium not in ('EFECTIVO', 'BANCO') then
    raise exception using errcode = '22023', message = 'invalid financial medium';
  end if;
  if v_timing <> 'OPERATIVO' then
    raise exception using
      errcode = '42501',
      message = 'opening and closing transfers are reserved for cash commands';
  end if;

  select *
  into v_open_balance
  from public.cash_balances cb
  where cb.local_id = p_local_id
    and cb.status = 'EN_PROCESO'
  for update;

  if found then
    if v_balance_reference is null
       or v_balance_reference not in (v_open_balance.id::text, v_open_balance.legacy_id) then
      raise exception using
        errcode = '55000',
        message = 'the transfer must reference the active balance';
    end if;
  else
    if v_balance_reference is not null then
      raise exception using
        errcode = '55000',
        message = 'balanceId does not reference an active balance';
    end if;
    if p_actor_function = 'CAJERO' then
      raise exception using
        errcode = '55000',
        message = 'cashier treasury transfers require an open balance';
    end if;
  end if;

  if v_medium = 'EFECTIVO' then
    v_local_account := private.require_current_account('LOCAL_EFECTIVO', p_local_id, null);
    v_principal_account := private.require_current_account('PRINCIPAL_EFECTIVO', null, null);
  else
    v_local_account := private.require_current_account('LOCAL_BANCO', p_local_id, null);
    v_principal_account := private.require_current_account('PRINCIPAL_BANCO', null, null);
  end if;

  perform private.lock_current_accounts(array[v_local_account.id, v_principal_account.id]);

  if v_open_balance.id is not null and v_medium = 'EFECTIVO' then
    perform private.assert_open_cash_reconciled(v_open_balance.id, p_local_id);
  end if;

  if v_type = 'RETIRO_CAJA' then
    v_source_account_id := v_local_account.id;
  else
    v_source_account_id := v_principal_account.id;
  end if;
  perform private.assert_available_funds(v_source_account_id, v_amount);

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  insert into public.treasury_transfers (
    id,
    legacy_id,
    balance_id,
    local_id,
    type,
    medium,
    timing,
    amount,
    currency,
    note,
    status,
    created_by,
    created_by_legacy_id
  )
  values (
    v_transfer_id,
    'treasury-transfer-' || v_transfer_id::text,
    v_open_balance.id,
    p_local_id,
    v_type::public.treasury_transfer_type,
    v_medium::public.financial_medium,
    'OPERATIVO',
    v_amount,
    'UYU',
    v_note,
    'ACTIVO',
    v_request.actor_id,
    v_actor_legacy_id
  )
  returning * into v_transfer;

  select *
  into v_source_movement
  from private.append_account_movement(
    v_request.id,
    case
      when v_transfer.type = 'RETIRO_CAJA' then v_local_account.id
      else v_principal_account.id
    end,
    p_local_id,
    v_transfer.balance_id,
    'TRASPASO_CAJA',
    v_transfer.id::text,
    'SALIDA',
    v_transfer.type::text,
    v_transfer.amount,
    case
      when v_transfer.type = 'RETIRO_CAJA' then 'Retiro de caja a Principal'
      else 'Aporte desde Principal a caja'
    end
      || ' - '
      || v_transfer.medium::text
      || case when v_transfer.note = '' then '' else ' - ' || v_transfer.note end
  );

  select *
  into v_destination_movement
  from private.append_account_movement(
    v_request.id,
    case
      when v_transfer.type = 'RETIRO_CAJA' then v_principal_account.id
      else v_local_account.id
    end,
    p_local_id,
    v_transfer.balance_id,
    'TRASPASO_CAJA',
    v_transfer.id::text,
    'ENTRADA',
    v_transfer.type::text,
    v_transfer.amount,
    case
      when v_transfer.type = 'RETIRO_CAJA' then 'Retiro de caja a Principal'
      else 'Aporte desde Principal a caja'
    end
      || ' - '
      || v_transfer.medium::text
      || case when v_transfer.note = '' then '' else ' - ' || v_transfer.note end
  );
  v_movement_ids := array[v_source_movement.id, v_destination_movement.id];

  if v_open_balance.id is not null and v_medium = 'EFECTIVO' then
    perform private.assert_open_cash_reconciled(v_open_balance.id, p_local_id);
  end if;

  perform private.append_command_audit(
    v_request.id,
    case
      when v_transfer.type = 'RETIRO_CAJA' then 'Retirar fondos de caja a Principal'
      else 'Aportar fondos desde Principal a caja'
    end,
    'TraspasoTesoreria',
    v_transfer.id::text,
    p_local_id,
    '{}'::jsonb,
    pg_catalog.to_jsonb(v_transfer),
    v_transfer.note
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_transfer),
    'ledger', private.account_movements_json(v_movement_ids),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_annul_treasury_transfer(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_previous public.treasury_transfers%rowtype;
  v_transfer public.treasury_transfers%rowtype;
  v_linked_balance public.cash_balances%rowtype;
  v_open_balance public.cash_balances%rowtype;
  v_local_account public.current_accounts%rowtype;
  v_principal_account public.current_accounts%rowtype;
  v_transfer_reference text;
  v_balance_reference text;
  v_reason text;
  v_reversal_ids uuid[];
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'annul_treasury_transfer',
    p_idempotency_key,
    private.command_request_hash('annul_treasury_transfer', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('CAJERO', 'ENCARGADO', 'ADMINISTRADOR') then
    raise exception using errcode = '42501', message = 'function cannot operate treasury';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_transfer_reference := nullif(
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'transferId',
        p_payload ->> 'treasuryTransferId',
        p_payload ->> 'transfer_id',
        ''
      )
    ),
    ''
  );
  v_balance_reference := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')),
    ''
  );
  v_reason := pg_catalog.btrim(coalesce(p_payload ->> 'reason', p_payload ->> 'note', ''));

  if v_transfer_reference is null then
    raise exception using errcode = '22023', message = 'transferId is required';
  end if;
  if v_reason = '' then
    raise exception using errcode = '22023', message = 'annulment reason is required';
  end if;

  select *
  into v_previous
  from public.treasury_transfers tt
  where tt.local_id = p_local_id
    and (
      tt.id::text = v_transfer_reference
      or tt.legacy_id = v_transfer_reference
    )
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'treasury transfer not found in command local';
  end if;
  if v_previous.status = 'ANULADO' then
    raise exception using errcode = '55000', message = 'treasury transfer is already annulled';
  end if;
  if v_previous.timing <> 'OPERATIVO' then
    raise exception using
      errcode = '55000',
      message = 'opening and closing transfers are immutable';
  end if;

  if v_previous.balance_id is not null then
    select *
    into v_linked_balance
    from public.cash_balances cb
    where cb.id = v_previous.balance_id
      and cb.local_id = p_local_id
    for update;

    if not found or v_linked_balance.status <> 'EN_PROCESO' then
      raise exception using
        errcode = '55000',
        message = 'a transfer linked to a closed balance cannot be annulled';
    end if;
    if v_balance_reference is not null
       and v_balance_reference not in (v_linked_balance.id::text, v_linked_balance.legacy_id) then
      raise exception using
        errcode = '22023',
        message = 'balanceId does not match the transfer balance';
    end if;
  else
    if v_balance_reference is not null then
      raise exception using
        errcode = '22023',
        message = 'the transfer is not linked to a balance';
    end if;

    select *
    into v_open_balance
    from public.cash_balances cb
    where cb.local_id = p_local_id
      and cb.status = 'EN_PROCESO'
    for update;

    if found then
      raise exception using
        errcode = '55000',
        message = 'an unlinked historical transfer cannot be annulled while another balance is open';
    end if;
    if p_actor_function = 'CAJERO' then
      raise exception using
        errcode = '55000',
        message = 'cashier treasury annulments require an open linked balance';
    end if;
  end if;

  if v_previous.medium = 'EFECTIVO' then
    v_local_account := private.require_current_account('LOCAL_EFECTIVO', p_local_id, null);
    v_principal_account := private.require_current_account('PRINCIPAL_EFECTIVO', null, null);
  else
    v_local_account := private.require_current_account('LOCAL_BANCO', p_local_id, null);
    v_principal_account := private.require_current_account('PRINCIPAL_BANCO', null, null);
  end if;

  perform private.lock_current_accounts(array[v_local_account.id, v_principal_account.id]);
  if v_previous.balance_id is not null and v_previous.medium = 'EFECTIVO' then
    perform private.assert_open_cash_reconciled(v_previous.balance_id, p_local_id);
  end if;

  v_reversal_ids := private.reverse_account_movements(
    v_request.id,
    p_local_id,
    array['TRASPASO_CAJA'::public.account_movement_source],
    array[v_previous.id::text, v_previous.legacy_id],
    2,
    v_reason
  );

  update public.treasury_transfers tt
  set status = 'ANULADO'
  where tt.id = v_previous.id
  returning * into v_transfer;

  if v_previous.balance_id is not null and v_previous.medium = 'EFECTIVO' then
    perform private.assert_open_cash_reconciled(v_previous.balance_id, p_local_id);
  end if;

  perform private.append_command_audit(
    v_request.id,
    'Anular traspaso de tesoreria',
    'TraspasoTesoreria',
    v_transfer.id::text,
    p_local_id,
    pg_catalog.to_jsonb(v_previous),
    pg_catalog.to_jsonb(v_transfer),
    v_reason
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_transfer),
    'ledger', private.account_movements_json(v_reversal_ids),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_create_partner_movement(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_balance public.cash_balances%rowtype;
  v_principal_account public.current_accounts%rowtype;
  v_partner_account public.current_accounts%rowtype;
  v_movement public.partner_movements%rowtype;
  v_principal_ledger public.account_movements%rowtype;
  v_partner_ledger public.account_movements%rowtype;
  v_actor_legacy_id text;
  v_balance_reference text;
  v_partner text;
  v_type text;
  v_medium text;
  v_amount numeric;
  v_note text;
  v_movement_id uuid := extensions.gen_random_uuid();
  v_ledger_ids uuid[];
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'create_partner_movement',
    p_idempotency_key,
    private.command_request_hash('create_partner_movement', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'partner movements require a control function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_balance_reference := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')),
    ''
  );
  v_partner := pg_catalog.upper(pg_catalog.btrim(coalesce(p_payload ->> 'partner', '')));
  v_type := pg_catalog.upper(pg_catalog.btrim(coalesce(p_payload ->> 'type', '')));
  v_medium := pg_catalog.upper(pg_catalog.btrim(coalesce(p_payload ->> 'medium', '')));
  v_amount := private.positive_payload_amount(p_payload);
  v_note := pg_catalog.btrim(coalesce(p_payload ->> 'note', ''));

  if v_partner not in ('MATHIAS', 'RICARDO') then
    raise exception using errcode = '22023', message = 'invalid partner';
  end if;
  if v_type not in ('APORTE_SOCIO', 'RETIRO_SOCIO') then
    raise exception using errcode = '22023', message = 'invalid partner movement type';
  end if;
  if v_medium not in ('EFECTIVO', 'BANCO') then
    raise exception using errcode = '22023', message = 'invalid financial medium';
  end if;

  if v_balance_reference is not null then
    select *
    into v_balance
    from public.cash_balances cb
    where cb.local_id = p_local_id
      and (
        cb.id::text = v_balance_reference
        or cb.legacy_id = v_balance_reference
      )
    for update;

    if not found or v_balance.status <> 'EN_PROCESO' then
      raise exception using
        errcode = '55000',
        message = 'balanceId must reference the active balance';
    end if;
  end if;

  if v_medium = 'EFECTIVO' then
    v_principal_account := private.require_current_account('PRINCIPAL_EFECTIVO', null, null);
  else
    v_principal_account := private.require_current_account('PRINCIPAL_BANCO', null, null);
  end if;
  v_partner_account := private.require_current_account(
    'SOCIO',
    null,
    v_partner::public.partner_code
  );

  perform private.lock_current_accounts(array[v_principal_account.id, v_partner_account.id]);
  if v_type = 'RETIRO_SOCIO' then
    perform private.assert_available_funds(v_principal_account.id, v_amount);
  end if;

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  insert into public.partner_movements (
    id,
    legacy_id,
    balance_id,
    local_id,
    partner,
    type,
    medium,
    amount,
    currency,
    note,
    status,
    created_by,
    created_by_legacy_id
  )
  values (
    v_movement_id,
    'partner-movement-' || v_movement_id::text,
    v_balance.id,
    p_local_id,
    v_partner::public.partner_code,
    v_type::public.partner_movement_type,
    v_medium::public.financial_medium,
    v_amount,
    'UYU',
    v_note,
    'ACTIVO',
    v_request.actor_id,
    v_actor_legacy_id
  )
  returning * into v_movement;

  select *
  into v_principal_ledger
  from private.append_account_movement(
    v_request.id,
    v_principal_account.id,
    p_local_id,
    v_movement.balance_id,
    v_movement.type::text::public.account_movement_source,
    v_movement.id::text,
    case
      when v_movement.type = 'APORTE_SOCIO' then 'ENTRADA'::public.account_movement_direction
      else 'SALIDA'::public.account_movement_direction
    end,
    v_movement.type::text,
    v_movement.amount,
    case
      when v_movement.type = 'APORTE_SOCIO' then 'Aporte de socio '
      else 'Retiro de socio '
    end
      || v_movement.partner::text
      || ' - '
      || v_movement.medium::text
      || case when v_movement.note = '' then '' else ' - ' || v_movement.note end
  );

  select *
  into v_partner_ledger
  from private.append_account_movement(
    v_request.id,
    v_partner_account.id,
    p_local_id,
    v_movement.balance_id,
    v_movement.type::text::public.account_movement_source,
    v_movement.id::text,
    case
      when v_movement.type = 'APORTE_SOCIO' then 'ENTRADA'::public.account_movement_direction
      else 'SALIDA'::public.account_movement_direction
    end,
    v_movement.type::text,
    v_movement.amount,
    case
      when v_movement.type = 'APORTE_SOCIO' then 'Aporte de socio '
      else 'Retiro de socio '
    end
      || v_movement.partner::text
      || ' - '
      || v_movement.medium::text
      || case when v_movement.note = '' then '' else ' - ' || v_movement.note end
  );
  v_ledger_ids := array[v_principal_ledger.id, v_partner_ledger.id];

  perform private.append_command_audit(
    v_request.id,
    case
      when v_movement.type = 'APORTE_SOCIO' then 'Registrar aporte de socio'
      else 'Registrar retiro de socio'
    end,
    'MovimientoSocio',
    v_movement.id::text,
    p_local_id,
    '{}'::jsonb,
    pg_catalog.to_jsonb(v_movement),
    v_movement.note
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_movement),
    'ledger', private.account_movements_json(v_ledger_ids),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_annul_partner_movement(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_previous public.partner_movements%rowtype;
  v_movement public.partner_movements%rowtype;
  v_principal_account public.current_accounts%rowtype;
  v_partner_account public.current_accounts%rowtype;
  v_movement_reference text;
  v_balance_reference text;
  v_reason text;
  v_reversal_ids uuid[];
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'annul_partner_movement',
    p_idempotency_key,
    private.command_request_hash('annul_partner_movement', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'partner movements require a control function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_movement_reference := nullif(
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'movementId',
        p_payload ->> 'partnerMovementId',
        p_payload ->> 'movement_id',
        ''
      )
    ),
    ''
  );
  v_balance_reference := nullif(
    pg_catalog.btrim(coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')),
    ''
  );
  v_reason := pg_catalog.btrim(coalesce(p_payload ->> 'reason', p_payload ->> 'note', ''));

  if v_movement_reference is null then
    raise exception using errcode = '22023', message = 'movementId is required';
  end if;
  if v_reason = '' then
    raise exception using errcode = '22023', message = 'annulment reason is required';
  end if;

  select *
  into v_previous
  from public.partner_movements pm
  where pm.local_id = p_local_id
    and (
      pm.id::text = v_movement_reference
      or pm.legacy_id = v_movement_reference
    )
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'partner movement not found in command local';
  end if;
  if v_previous.status = 'ANULADO' then
    raise exception using errcode = '55000', message = 'partner movement is already annulled';
  end if;

  if v_balance_reference is not null then
    if v_previous.balance_id is null then
      raise exception using
        errcode = '22023',
        message = 'the partner movement is not linked to a balance';
    end if;
    if not exists (
      select 1
      from public.cash_balances cb
      where cb.id = v_previous.balance_id
        and cb.local_id = p_local_id
        and v_balance_reference in (cb.id::text, cb.legacy_id)
    ) then
      raise exception using
        errcode = '22023',
        message = 'balanceId does not match the partner movement';
    end if;
  end if;

  if v_previous.medium = 'EFECTIVO' then
    v_principal_account := private.require_current_account('PRINCIPAL_EFECTIVO', null, null);
  else
    v_principal_account := private.require_current_account('PRINCIPAL_BANCO', null, null);
  end if;
  v_partner_account := private.require_current_account('SOCIO', null, v_previous.partner);

  perform private.lock_current_accounts(array[v_principal_account.id, v_partner_account.id]);
  v_reversal_ids := private.reverse_account_movements(
    v_request.id,
    p_local_id,
    array[v_previous.type::text::public.account_movement_source],
    array[v_previous.id::text, v_previous.legacy_id],
    2,
    v_reason
  );

  update public.partner_movements pm
  set status = 'ANULADO'
  where pm.id = v_previous.id
  returning * into v_movement;

  perform private.append_command_audit(
    v_request.id,
    'Anular movimiento de socio',
    'MovimientoSocio',
    v_movement.id::text,
    p_local_id,
    pg_catalog.to_jsonb(v_previous),
    pg_catalog.to_jsonb(v_movement),
    v_reason
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_movement),
    'ledger', private.account_movements_json(v_reversal_ids),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;

revoke all on function public.poseidon_create_expense(text, public.app_role, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.poseidon_create_principal_expense(text, public.app_role, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.poseidon_annul_expense(text, public.app_role, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.poseidon_review_expense(text, public.app_role, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.poseidon_create_treasury_transfer(text, public.app_role, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.poseidon_annul_treasury_transfer(text, public.app_role, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.poseidon_create_partner_movement(text, public.app_role, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.poseidon_annul_partner_movement(text, public.app_role, uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.poseidon_create_expense(text, public.app_role, uuid, jsonb)
  to authenticated;
grant execute on function public.poseidon_create_principal_expense(text, public.app_role, uuid, jsonb)
  to authenticated;
grant execute on function public.poseidon_annul_expense(text, public.app_role, uuid, jsonb)
  to authenticated;
grant execute on function public.poseidon_review_expense(text, public.app_role, uuid, jsonb)
  to authenticated;
grant execute on function public.poseidon_create_treasury_transfer(text, public.app_role, uuid, jsonb)
  to authenticated;
grant execute on function public.poseidon_annul_treasury_transfer(text, public.app_role, uuid, jsonb)
  to authenticated;
grant execute on function public.poseidon_create_partner_movement(text, public.app_role, uuid, jsonb)
  to authenticated;
grant execute on function public.poseidon_annul_partner_movement(text, public.app_role, uuid, jsonb)
  to authenticated;

comment on function private.command_request_hash(text, public.app_role, uuid, jsonb) is
  'Canonical SHA-256 over command, requested function, local, and JSONB payload.';
comment on function private.claim_command(public.app_role, uuid, text, text, text) is
  'Authenticated idempotency claim serialized by a transaction-scoped advisory lock.';
comment on function private.append_account_movement(
  uuid,
  uuid,
  uuid,
  uuid,
  public.account_movement_source,
  text,
  public.account_movement_direction,
  text,
  numeric,
  text,
  uuid,
  timestamptz
) is
  'Internal append-only ledger writer. Actor identity comes from the authenticated pending command.';
comment on function private.reverse_account_movements(
  uuid,
  uuid,
  public.account_movement_source[],
  text[],
  integer,
  text
) is
  'Creates opposite append-only rows and validates every resulting money-account outflow.';
comment on function private.append_command_audit(uuid, text, text, text, uuid, jsonb, jsonb, text) is
  'Appends audit identity, actual role, and requested function from auth.uid() and its command claim.';

commit;
