begin;

create function private.nonnegative_payload_amount(
  p_payload jsonb,
  p_field text,
  p_alias text default null,
  p_default numeric default null
)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_raw text;
  v_amount numeric;
begin
  if p_payload ? p_field then
    v_raw := p_payload ->> p_field;
  elsif p_alias is not null and p_payload ? p_alias then
    v_raw := p_payload ->> p_alias;
  elsif p_default is not null then
    return p_default;
  else
    raise exception using
      errcode = '22023',
      message = pg_catalog.format('%s is required', p_field);
  end if;

  if v_raw is null or pg_catalog.btrim(v_raw) = '' then
    raise exception using
      errcode = '22023',
      message = pg_catalog.format('%s must be a valid amount', p_field);
  end if;

  begin
    v_amount := v_raw::numeric;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception using
        errcode = '22023',
        message = pg_catalog.format('%s must be a valid amount', p_field);
  end;

  if v_amount < 0
     or v_amount::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using
      errcode = '22023',
      message = pg_catalog.format('%s must be finite and nonnegative', p_field);
  end if;

  return v_amount;
end;
$$;

create function private.sync_machine_result(
  p_command_request_id uuid,
  p_balance_id uuid,
  p_local_id uuid,
  p_created_at timestamptz default statement_timestamp()
)
returns uuid[]
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_profile public.profiles%rowtype;
  v_balance public.cash_balances%rowtype;
  v_cash_account public.current_accounts%rowtype;
  v_target_result numeric;
  v_current_result numeric;
  v_delta numeric;
  v_previous_adjustment_id uuid;
  v_movement_id uuid;
begin
  select *
  into v_request
  from public.command_requests cr
  where cr.id = p_command_request_id
    and cr.actor_id = auth.uid()
    and cr.command_name = 'save_readings'
    and cr.local_id = p_local_id
    and cr.status = 'PENDIENTE';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'pending authenticated save_readings command not found';
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'active authenticated result actor not found';
  end if;

  select *
  into v_balance
  from public.cash_balances cb
  where cb.id = p_balance_id
    and cb.local_id = p_local_id
    and cb.status = 'EN_PROCESO';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'an open cash balance is required for machine result synchronization';
  end if;

  v_cash_account := private.require_current_account(
    'LOCAL_EFECTIVO',
    p_local_id,
    null
  );
  perform private.lock_current_accounts(array[v_cash_account.id]);

  select coalesce(pg_catalog.sum(mr.result), 0)::numeric
  into v_target_result
  from public.machine_readings mr
  where mr.balance_id = p_balance_id
    and mr.local_id = p_local_id
    and mr.status = 'CARGADA';

  select coalesce(
    pg_catalog.sum(
      case
        when am.direction = 'ENTRADA' then am.amount
        else -am.amount
      end
    ),
    0
  )::numeric
  into v_current_result
  from public.account_movements am
  where am.account_id = v_cash_account.id
    and am.local_id = p_local_id
    and am.balance_id = p_balance_id
    and am.source_type = 'RESULTADO_MAQUINAS'
    and am.source_id in (v_balance.id::text, v_balance.legacy_id)
    and am.status = 'ACTIVO';

  v_delta := v_target_result - v_current_result;
  if v_delta = 0 then
    return array[]::uuid[];
  end if;

  select am.id
  into v_previous_adjustment_id
  from public.account_movements am
  where am.account_id = v_cash_account.id
    and am.local_id = p_local_id
    and am.balance_id = p_balance_id
    and am.source_type = 'RESULTADO_MAQUINAS'
    and am.source_id in (v_balance.id::text, v_balance.legacy_id)
    and am.status = 'ACTIVO'
  order by am.created_at desc, am.id desc
  limit 1;

  v_movement_id := extensions.gen_random_uuid();
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
    previous_adjustment_id,
    created_at
  )
  values (
    v_movement_id,
    'account-movement-' || v_movement_id::text,
    v_cash_account.id,
    p_local_id,
    p_balance_id,
    'RESULTADO_MAQUINAS',
    v_balance.id::text,
    case
      when v_delta > 0 then 'ENTRADA'::public.account_movement_direction
      else 'SALIDA'::public.account_movement_direction
    end,
    'RESULTADO_MAQUINAS',
    pg_catalog.abs(v_delta),
    'UYU',
    'Caja ' || v_balance.visible_id || ' - ' || v_balance.operating_date::text,
    'ACTIVO',
    v_profile.id,
    v_profile.legacy_id,
    v_previous_adjustment_id,
    coalesce(p_created_at, statement_timestamp())
  );

  return array[v_movement_id];
end;
$$;

create function private.assert_machine_result_synced(
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
  v_reading_result numeric;
  v_ledger_result numeric;
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
      message = 'an open cash balance is required for result reconciliation';
  end if;

  v_cash_account := private.require_current_account(
    'LOCAL_EFECTIVO',
    p_local_id,
    null
  );

  if exists (
    select 1
    from public.account_movements am
    where am.source_type = 'RESULTADO_MAQUINAS'
      and am.source_id in (v_balance.id::text, v_balance.legacy_id)
      and am.status = 'ACTIVO'
      and (
        am.account_id <> v_cash_account.id
        or am.local_id is distinct from p_local_id
        or am.balance_id is distinct from p_balance_id
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'machine result ledger is associated with the wrong cash scope';
  end if;

  select coalesce(pg_catalog.sum(mr.result), 0)::numeric
  into v_reading_result
  from public.machine_readings mr
  where mr.balance_id = p_balance_id
    and mr.local_id = p_local_id
    and mr.status = 'CARGADA';

  select coalesce(
    pg_catalog.sum(
      case
        when am.direction = 'ENTRADA' then am.amount
        else -am.amount
      end
    ),
    0
  )::numeric
  into v_ledger_result
  from public.account_movements am
  where am.account_id = v_cash_account.id
    and am.local_id = p_local_id
    and am.balance_id = p_balance_id
    and am.source_type = 'RESULTADO_MAQUINAS'
    and am.source_id in (v_balance.id::text, v_balance.legacy_id)
    and am.status = 'ACTIVO';

  if v_reading_result <> v_ledger_result then
    raise exception using
      errcode = '23514',
      message = 'machine readings and result ledger are not reconciled',
      detail = pg_catalog.format(
        'balance_id=%s readings=%s ledger=%s',
        p_balance_id,
        v_reading_result,
        v_ledger_result
      );
  end if;

  return v_reading_result;
end;
$$;

create function public.poseidon_save_readings(
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
  v_local public.locals%rowtype;
  v_balance public.cash_balances%rowtype;
  v_cash_account public.current_accounts%rowtype;
  v_reading public.machine_readings%rowtype;
  v_update jsonb;
  v_field jsonb;
  v_balance_reference text;
  v_reading_reference text;
  v_raw text;
  v_next_in numeric;
  v_next_out numeric;
  v_next_status text;
  v_next_observation text;
  v_next_result numeric;
  v_reading_ids uuid[] := array[]::uuid[];
  v_validated_updates jsonb := '[]'::jsonb;
  v_previous_readings jsonb := '[]'::jsonb;
  v_saved_readings jsonb := '[]'::jsonb;
  v_ledger_ids uuid[] := array[]::uuid[];
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'save_readings',
    p_idempotency_key,
    private.command_request_hash('save_readings', p_actor_function, p_local_id, p_payload)
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
      message = 'saving readings requires the cashier function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  select *
  into v_local
  from public.locals l
  where l.id = p_local_id
    and l.status = 'ACTIVO'
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'the command local is not active';
  end if;

  v_balance_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')
    ),
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
      message = 'readings require the active balance for the local';
  end if;

  v_cash_account := private.require_current_account(
    'LOCAL_EFECTIVO',
    p_local_id,
    null
  );
  perform private.lock_current_accounts(array[v_cash_account.id]);
  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  perform private.assert_machine_result_synced(v_balance.id, p_local_id);

  if not (p_payload ? 'updates')
     or pg_catalog.jsonb_typeof(p_payload -> 'updates') <> 'array'
     or pg_catalog.jsonb_array_length(p_payload -> 'updates') = 0 then
    raise exception using
      errcode = '22023',
      message = 'updates must be a nonempty JSON array';
  end if;

  for v_update in
    select items.value
    from pg_catalog.jsonb_array_elements(p_payload -> 'updates') items(value)
  loop
    if pg_catalog.jsonb_typeof(v_update) <> 'object' then
      raise exception using errcode = '22023', message = 'each reading update must be an object';
    end if;

    v_reading_reference := nullif(
      pg_catalog.btrim(
        coalesce(v_update ->> 'readingId', v_update ->> 'reading_id', '')
      ),
      ''
    );
    if v_reading_reference is null then
      raise exception using errcode = '22023', message = 'readingId is required';
    end if;

    select *
    into v_reading
    from public.machine_readings mr
    where mr.balance_id = v_balance.id
      and mr.local_id = p_local_id
      and (
        mr.id::text = v_reading_reference
        or mr.legacy_id = v_reading_reference
      )
    for update;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'a reading from the active balance was not found';
    end if;

    if v_reading.id = any(v_reading_ids) then
      raise exception using
        errcode = '22023',
        message = 'the reading batch contains duplicate IDs';
    end if;
    v_reading_ids := pg_catalog.array_append(v_reading_ids, v_reading.id);

    v_next_in := v_reading.in_actual;
    if v_update ? 'inActual' or v_update ? 'in_actual' then
      if v_update ? 'inActual' then
        v_field := v_update -> 'inActual';
        v_raw := v_update ->> 'inActual';
      else
        v_field := v_update -> 'in_actual';
        v_raw := v_update ->> 'in_actual';
      end if;

      if pg_catalog.jsonb_typeof(v_field) = 'null' then
        v_next_in := null;
      else
        begin
          v_next_in := v_raw::numeric;
        exception
          when invalid_text_representation or numeric_value_out_of_range then
            raise exception using
              errcode = '22023',
              message = 'inActual must be a valid counter';
        end;
        if v_next_in::text in ('NaN', 'Infinity', '-Infinity') then
          raise exception using
            errcode = '22023',
            message = 'inActual must be finite';
        end if;
      end if;
    end if;

    v_next_out := v_reading.out_actual;
    if v_update ? 'outActual' or v_update ? 'out_actual' then
      if v_update ? 'outActual' then
        v_field := v_update -> 'outActual';
        v_raw := v_update ->> 'outActual';
      else
        v_field := v_update -> 'out_actual';
        v_raw := v_update ->> 'out_actual';
      end if;

      if pg_catalog.jsonb_typeof(v_field) = 'null' then
        v_next_out := null;
      else
        begin
          v_next_out := v_raw::numeric;
        exception
          when invalid_text_representation or numeric_value_out_of_range then
            raise exception using
              errcode = '22023',
              message = 'outActual must be a valid counter';
        end;
        if v_next_out::text in ('NaN', 'Infinity', '-Infinity') then
          raise exception using
            errcode = '22023',
            message = 'outActual must be finite';
        end if;
      end if;
    end if;

    if v_next_in is not null and v_next_in < v_reading.in_previous then
      raise exception using
        errcode = '23514',
        message = 'inActual cannot be lower than inPrevious';
    end if;
    if v_next_out is not null and v_next_out < v_reading.out_previous then
      raise exception using
        errcode = '23514',
        message = 'outActual cannot be lower than outPrevious';
    end if;

    if v_update ? 'status' then
      v_next_status := pg_catalog.upper(
        pg_catalog.btrim(coalesce(v_update ->> 'status', ''))
      );
    else
      v_next_status := v_reading.status::text;
    end if;
    if v_next_status not in (
      'PENDIENTE',
      'CARGADA',
      'SIN_LECTURA',
      'FUERA_DE_SERVICIO'
    ) then
      raise exception using errcode = '22023', message = 'invalid reading status';
    end if;
    if v_next_status = 'CARGADA'
       and (v_next_in is null or v_next_out is null) then
      raise exception using
        errcode = '23514',
        message = 'loaded readings require both counters';
    end if;

    if v_update ? 'observation' then
      v_next_observation := coalesce(v_update ->> 'observation', '');
    else
      v_next_observation := v_reading.observation;
    end if;

    v_next_result := case
      when v_next_in is null or v_next_out is null then 0
      else (v_next_in - v_reading.in_previous)
        - (v_next_out - v_reading.out_previous)
    end;

    v_previous_readings := v_previous_readings
      || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_reading));
    v_validated_updates := v_validated_updates
      || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'id',
          v_reading.id,
          'in_actual',
          v_next_in,
          'out_actual',
          v_next_out,
          'status',
          v_next_status,
          'observation',
          v_next_observation,
          'result',
          v_next_result
        )
      );
  end loop;

  for v_update in
    select items.value
    from pg_catalog.jsonb_array_elements(v_validated_updates) items(value)
  loop
    update public.machine_readings mr
    set
      in_actual = (v_update ->> 'in_actual')::numeric,
      out_actual = (v_update ->> 'out_actual')::numeric,
      result = (v_update ->> 'result')::numeric,
      status = (v_update ->> 'status')::public.reading_status,
      observation = coalesce(v_update ->> 'observation', ''),
      updated_by = v_request.actor_id,
      updated_by_legacy_id = (
        select p.legacy_id
        from public.profiles p
        where p.id = v_request.actor_id
      )
    where mr.id = (v_update ->> 'id')::uuid
    returning * into v_reading;

    v_saved_readings := v_saved_readings
      || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_reading));
  end loop;

  v_ledger_ids := private.sync_machine_result(
    v_request.id,
    v_balance.id,
    p_local_id,
    v_created_at
  );
  perform private.assert_machine_result_synced(v_balance.id, p_local_id);
  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);

  perform private.append_command_audit(
    v_request.id,
    'Guardar contadores',
    'Recaudacion',
    v_balance.id::text,
    p_local_id,
    v_previous_readings,
    v_saved_readings
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    v_saved_readings,
    'ledger',
    private.account_movements_json(v_ledger_ids),
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_open_cash(
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
  v_local public.locals%rowtype;
  v_balance public.cash_balances%rowtype;
  v_local_cash public.current_accounts%rowtype;
  v_local_bank public.current_accounts%rowtype;
  v_principal_cash public.current_accounts%rowtype;
  v_principal_bank public.current_accounts%rowtype;
  v_partner_account public.current_accounts%rowtype;
  v_partner_movement public.partner_movements%rowtype;
  v_treasury_transfer public.treasury_transfers%rowtype;
  v_ledger_movement public.account_movements%rowtype;
  v_machine public.machines%rowtype;
  v_reading public.machine_readings%rowtype;
  v_actor_legacy_id text;
  v_operating_date_text text;
  v_operating_date date;
  v_initial_cash numeric;
  v_initial_bank numeric;
  v_initial_note text;
  v_partner_text text;
  v_first_value jsonb;
  v_requested_first boolean;
  v_is_first boolean;
  v_local_code text;
  v_next_sequence bigint;
  v_balance_id uuid := extensions.gen_random_uuid();
  v_entity_id uuid;
  v_lock_ids uuid[];
  v_ledger_ids uuid[] := array[]::uuid[];
  v_readings jsonb := '[]'::jsonb;
  v_partner_movements jsonb := '[]'::jsonb;
  v_treasury_transfers jsonb := '[]'::jsonb;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'open_cash',
    p_idempotency_key,
    private.command_request_hash('open_cash', p_actor_function, p_local_id, p_payload)
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
      message = 'cash opening requires the cashier function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  select *
  into v_local
  from public.locals l
  where l.id = p_local_id
    and l.status = 'ACTIVO'
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'the command local is not active';
  end if;

  if exists (
    select 1
    from public.cash_balances cb
    where cb.local_id = p_local_id
      and cb.status = 'EN_PROCESO'
  ) then
    raise exception using
      errcode = '55000',
      message = 'an open cash balance already exists for the local';
  end if;

  v_operating_date_text := pg_catalog.btrim(
    coalesce(p_payload ->> 'operatingDate', p_payload ->> 'operating_date', '')
  );
  if v_operating_date_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception using errcode = '22023', message = 'operatingDate must use YYYY-MM-DD';
  end if;
  begin
    v_operating_date := v_operating_date_text::date;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception using errcode = '22023', message = 'operatingDate is invalid';
  end;
  if v_operating_date::text <> v_operating_date_text then
    raise exception using errcode = '22023', message = 'operatingDate is invalid';
  end if;

  v_initial_cash := private.nonnegative_payload_amount(
    p_payload,
    'initialFund',
    'initial_cash'
  );
  v_initial_bank := private.nonnegative_payload_amount(
    p_payload,
    'initialBankFund',
    'initial_bank'
  );
  v_initial_note := pg_catalog.btrim(
    coalesce(p_payload ->> 'initialNote', p_payload ->> 'initial_note', '')
  );

  if p_payload ? 'firstOpening' then
    v_first_value := p_payload -> 'firstOpening';
  elsif p_payload ? 'first_opening' then
    v_first_value := p_payload -> 'first_opening';
  end if;
  if v_first_value is null
     or pg_catalog.jsonb_typeof(v_first_value) <> 'boolean' then
    raise exception using errcode = '22023', message = 'firstOpening must be boolean';
  end if;
  v_requested_first := v_first_value::text::boolean;

  select not exists (
    select 1
    from public.cash_balances cb
    where cb.local_id = p_local_id
  )
  into v_is_first;

  if v_requested_first <> v_is_first then
    raise exception using
      errcode = '22023',
      message = 'firstOpening does not match the local cash history';
  end if;

  v_partner_text := pg_catalog.upper(
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'openingCapitalPerson',
        p_payload ->> 'opening_capital_person',
        p_payload ->> 'partner',
        ''
      )
    )
  );
  if v_is_first
     and (v_initial_cash > 0 or v_initial_bank > 0)
     and v_partner_text not in ('MATHIAS', 'RICARDO') then
    raise exception using errcode = '22023', message = 'a valid opening partner is required';
  end if;

  v_local_cash := private.require_current_account(
    'LOCAL_EFECTIVO',
    p_local_id,
    null
  );
  v_local_bank := private.require_current_account(
    'LOCAL_BANCO',
    p_local_id,
    null
  );
  v_lock_ids := array[v_local_cash.id, v_local_bank.id];

  if v_is_first and (v_initial_cash > 0 or v_initial_bank > 0) then
    v_partner_account := private.require_current_account(
      'SOCIO',
      null,
      v_partner_text::public.partner_code
    );
    v_lock_ids := pg_catalog.array_append(v_lock_ids, v_partner_account.id);
  end if;
  if v_is_first and v_initial_cash > 0 then
    v_principal_cash := private.require_current_account(
      'PRINCIPAL_EFECTIVO',
      null,
      null
    );
    v_lock_ids := pg_catalog.array_append(v_lock_ids, v_principal_cash.id);
  end if;
  if v_is_first and v_initial_bank > 0 then
    v_principal_bank := private.require_current_account(
      'PRINCIPAL_BANCO',
      null,
      null
    );
    v_lock_ids := pg_catalog.array_append(v_lock_ids, v_principal_bank.id);
  end if;
  perform private.lock_current_accounts(v_lock_ids);

  if not v_is_first then
    if v_initial_cash <> private.account_balance(v_local_cash.id)
       or v_initial_bank <> private.account_balance(v_local_bank.id) then
      raise exception using
        errcode = '23514',
        message = 'cash reopening must inherit the exact Caja balances';
    end if;
  end if;

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  v_local_code := pg_catalog.upper(
    pg_catalog.substr(
      pg_catalog.regexp_replace(v_local.name, '[^A-Za-z0-9]', '', 'g'),
      1,
      4
    )
  );
  if v_local_code = '' then
    v_local_code := 'CAJA';
  end if;

  select coalesce(
    pg_catalog.max(
      case
        when cb.visible_id ~ '-[0-9]+$'
          then pg_catalog.substring(cb.visible_id, '([0-9]+)$')::bigint
        else 0
      end
    ),
    0
  ) + 1
  into v_next_sequence
  from public.cash_balances cb
  where cb.local_id = p_local_id;

  insert into public.cash_balances (
    id,
    legacy_id,
    visible_id,
    local_id,
    operating_date,
    status,
    initial_cash,
    initial_bank,
    initial_note,
    opened_by,
    opened_by_legacy_id,
    opened_by_role,
    opened_at
  )
  values (
    v_balance_id,
    'cash-balance-' || v_balance_id::text,
    v_local_code || '-' || v_next_sequence::text,
    p_local_id,
    v_operating_date,
    'EN_PROCESO',
    v_initial_cash,
    v_initial_bank,
    v_initial_note,
    v_request.actor_id,
    v_actor_legacy_id,
    v_request.actual_role,
    v_created_at
  )
  returning * into v_balance;

  if v_is_first and v_initial_cash > 0 then
    v_entity_id := extensions.gen_random_uuid();
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
      created_by_legacy_id,
      created_at
    )
    values (
      v_entity_id,
      'partner-movement-' || v_entity_id::text,
      v_balance.id,
      p_local_id,
      v_partner_text::public.partner_code,
      'APORTE_SOCIO',
      'EFECTIVO',
      v_initial_cash,
      'UYU',
      'Aporte inicial de socio para caja ' || v_balance.visible_id,
      'ACTIVO',
      v_request.actor_id,
      v_actor_legacy_id,
      v_created_at
    )
    returning * into v_partner_movement;
    v_partner_movements := v_partner_movements
      || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_partner_movement));

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_principal_cash.id,
      p_local_id,
      v_balance.id,
      'APORTE_SOCIO',
      v_partner_movement.id::text,
      'ENTRADA',
      'APORTE_SOCIO',
      v_initial_cash,
      'Aporte de socio ' || v_partner_text || ' - EFECTIVO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_partner_account.id,
      p_local_id,
      v_balance.id,
      'APORTE_SOCIO',
      v_partner_movement.id::text,
      'ENTRADA',
      'APORTE_SOCIO',
      v_initial_cash,
      'Aporte de socio ' || v_partner_text || ' - EFECTIVO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);

    perform private.assert_available_funds(v_principal_cash.id, v_initial_cash);

    v_entity_id := extensions.gen_random_uuid();
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
      created_by_legacy_id,
      created_at
    )
    values (
      v_entity_id,
      'treasury-transfer-' || v_entity_id::text,
      v_balance.id,
      p_local_id,
      'APORTE_CAJA',
      'EFECTIVO',
      'APERTURA',
      v_initial_cash,
      'UYU',
      'Asignacion inicial a caja ' || v_balance.visible_id,
      'ACTIVO',
      v_request.actor_id,
      v_actor_legacy_id,
      v_created_at
    )
    returning * into v_treasury_transfer;
    v_treasury_transfers := v_treasury_transfers
      || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_treasury_transfer));

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_principal_cash.id,
      p_local_id,
      v_balance.id,
      'TRASPASO_CAJA',
      v_treasury_transfer.id::text,
      'SALIDA',
      'APORTE_CAJA',
      v_initial_cash,
      'Aporte desde Principal a caja - EFECTIVO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_local_cash.id,
      p_local_id,
      v_balance.id,
      'TRASPASO_CAJA',
      v_treasury_transfer.id::text,
      'ENTRADA',
      'APORTE_CAJA',
      v_initial_cash,
      'Aporte desde Principal a caja - EFECTIVO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);
  end if;

  if v_is_first and v_initial_bank > 0 then
    v_entity_id := extensions.gen_random_uuid();
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
      created_by_legacy_id,
      created_at
    )
    values (
      v_entity_id,
      'partner-movement-' || v_entity_id::text,
      v_balance.id,
      p_local_id,
      v_partner_text::public.partner_code,
      'APORTE_SOCIO',
      'BANCO',
      v_initial_bank,
      'UYU',
      'Aporte inicial de socio para banco de caja ' || v_balance.visible_id,
      'ACTIVO',
      v_request.actor_id,
      v_actor_legacy_id,
      v_created_at
    )
    returning * into v_partner_movement;
    v_partner_movements := v_partner_movements
      || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_partner_movement));

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_principal_bank.id,
      p_local_id,
      v_balance.id,
      'APORTE_SOCIO',
      v_partner_movement.id::text,
      'ENTRADA',
      'APORTE_SOCIO',
      v_initial_bank,
      'Aporte de socio ' || v_partner_text || ' - BANCO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_partner_account.id,
      p_local_id,
      v_balance.id,
      'APORTE_SOCIO',
      v_partner_movement.id::text,
      'ENTRADA',
      'APORTE_SOCIO',
      v_initial_bank,
      'Aporte de socio ' || v_partner_text || ' - BANCO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);

    perform private.assert_available_funds(v_principal_bank.id, v_initial_bank);

    v_entity_id := extensions.gen_random_uuid();
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
      created_by_legacy_id,
      created_at
    )
    values (
      v_entity_id,
      'treasury-transfer-' || v_entity_id::text,
      v_balance.id,
      p_local_id,
      'APORTE_CAJA',
      'BANCO',
      'APERTURA',
      v_initial_bank,
      'UYU',
      'Asignacion inicial a banco de caja ' || v_balance.visible_id,
      'ACTIVO',
      v_request.actor_id,
      v_actor_legacy_id,
      v_created_at
    )
    returning * into v_treasury_transfer;
    v_treasury_transfers := v_treasury_transfers
      || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_treasury_transfer));

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_principal_bank.id,
      p_local_id,
      v_balance.id,
      'TRASPASO_CAJA',
      v_treasury_transfer.id::text,
      'SALIDA',
      'APORTE_CAJA',
      v_initial_bank,
      'Aporte desde Principal a caja - BANCO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_local_bank.id,
      p_local_id,
      v_balance.id,
      'TRASPASO_CAJA',
      v_treasury_transfer.id::text,
      'ENTRADA',
      'APORTE_CAJA',
      v_initial_bank,
      'Aporte desde Principal a caja - BANCO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);
  end if;

  for v_machine in
    select m.*
    from public.machines m
    where m.current_location_kind = 'LOCAL'
      and m.current_local_id = p_local_id
      and m.status not in ('INACTIVA', 'DESUSO')
    order by m.id
    for share
  loop
    v_entity_id := extensions.gen_random_uuid();
    insert into public.machine_readings (
      id,
      legacy_id,
      balance_id,
      local_id,
      machine_id,
      in_previous,
      in_actual,
      out_previous,
      out_actual,
      result,
      status,
      observation,
      updated_by,
      updated_by_legacy_id,
      created_at,
      updated_at
    )
    values (
      v_entity_id,
      'machine-reading-' || v_entity_id::text,
      v_balance.id,
      p_local_id,
      v_machine.id,
      v_machine.last_in,
      v_machine.last_in,
      v_machine.last_out,
      v_machine.last_out,
      0,
      case
        when v_machine.status = 'ACTIVA' then 'PENDIENTE'::public.reading_status
        else 'FUERA_DE_SERVICIO'::public.reading_status
      end,
      case
        when v_machine.status = 'ACTIVA' then ''
        else 'Maquina en mantenimiento'
      end,
      v_request.actor_id,
      v_actor_legacy_id,
      v_created_at,
      v_created_at
    )
    returning * into v_reading;
    v_readings := v_readings
      || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_reading));
  end loop;

  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  if private.account_balance(v_local_bank.id) <> v_initial_bank then
    raise exception using
      errcode = '23514',
      message = 'opening bank amount and Caja / Banco ledger are not reconciled';
  end if;
  perform private.assert_machine_result_synced(v_balance.id, p_local_id);

  perform private.append_command_audit(
    v_request.id,
    'Abrir caja',
    'BalanceDiario',
    v_balance.id::text,
    p_local_id,
    '{}'::jsonb,
    pg_catalog.jsonb_build_object(
      'balance',
      pg_catalog.to_jsonb(v_balance),
      'readings',
      v_readings,
      'openingPartnerMovements',
      v_partner_movements,
      'openingTreasuryTransfers',
      v_treasury_transfers
    ),
    v_initial_note
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    pg_catalog.to_jsonb(v_balance),
    'ledger',
    private.account_movements_json(v_ledger_ids),
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_close_cash(
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
  v_local public.locals%rowtype;
  v_balance public.cash_balances%rowtype;
  v_closed_balance public.cash_balances%rowtype;
  v_local_cash public.current_accounts%rowtype;
  v_local_bank public.current_accounts%rowtype;
  v_principal_cash public.current_accounts%rowtype;
  v_principal_bank public.current_accounts%rowtype;
  v_transfer public.treasury_transfers%rowtype;
  v_ledger_movement public.account_movements%rowtype;
  v_machine public.machines%rowtype;
  v_reading public.machine_readings%rowtype;
  v_actor_legacy_id text;
  v_balance_reference text;
  v_declared_cash numeric;
  v_declared_bank numeric;
  v_transfer_cash numeric;
  v_transfer_bank numeric;
  v_expected_cash numeric;
  v_expected_bank numeric;
  v_expected_cash_after_transfer numeric;
  v_expected_bank_after_transfer numeric;
  v_cash_difference numeric;
  v_bank_difference numeric;
  v_difference_note text;
  v_entity_id uuid;
  v_ledger_ids uuid[] := array[]::uuid[];
  v_transfers jsonb := '[]'::jsonb;
  v_machine_history jsonb := '[]'::jsonb;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'close_cash',
    p_idempotency_key,
    private.command_request_hash('close_cash', p_actor_function, p_local_id, p_payload)
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
      message = 'cash closing requires the cashier function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  select *
  into v_local
  from public.locals l
  where l.id = p_local_id
    and l.status = 'ACTIVO'
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'the command local is not active';
  end if;

  v_balance_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')
    ),
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
      message = 'cash closing requires the active balance for the local';
  end if;

  v_declared_cash := private.nonnegative_payload_amount(
    p_payload,
    'declaredCash',
    'declared_cash'
  );
  v_declared_bank := private.nonnegative_payload_amount(
    p_payload,
    'declaredBank',
    'declared_bank'
  );
  v_transfer_cash := private.nonnegative_payload_amount(
    p_payload,
    'transferToPrincipalCash',
    'transfer_to_principal_cash',
    0
  );
  v_transfer_bank := private.nonnegative_payload_amount(
    p_payload,
    'transferToPrincipalBank',
    'transfer_to_principal_bank',
    0
  );
  v_difference_note := pg_catalog.btrim(
    coalesce(p_payload ->> 'differenceNote', p_payload ->> 'difference_note', '')
  );

  if exists (
    select 1
    from public.machine_readings mr
    where mr.balance_id = v_balance.id
      and mr.local_id = p_local_id
      and mr.status = 'PENDIENTE'
      and pg_catalog.btrim(mr.observation) = ''
  ) then
    raise exception using
      errcode = '23514',
      message = 'active pending machines require an observation before closing';
  end if;

  v_local_cash := private.require_current_account(
    'LOCAL_EFECTIVO',
    p_local_id,
    null
  );
  v_local_bank := private.require_current_account(
    'LOCAL_BANCO',
    p_local_id,
    null
  );
  v_principal_cash := private.require_current_account(
    'PRINCIPAL_EFECTIVO',
    null,
    null
  );
  v_principal_bank := private.require_current_account(
    'PRINCIPAL_BANCO',
    null,
    null
  );
  perform private.lock_current_accounts(
    array[
      v_local_cash.id,
      v_local_bank.id,
      v_principal_cash.id,
      v_principal_bank.id
    ]
  );

  v_expected_cash := private.assert_open_cash_reconciled(
    v_balance.id,
    p_local_id
  );
  perform private.assert_machine_result_synced(v_balance.id, p_local_id);
  v_expected_bank := private.account_balance(v_local_bank.id);

  if v_expected_cash < 0 then
    raise exception using
      errcode = '23514',
      message = 'cash closing is blocked because expected cash is negative',
      detail = pg_catalog.format(
        'balance_id=%s expected_cash=%s',
        v_balance.id,
        v_expected_cash
      );
  end if;
  if v_transfer_cash > v_expected_cash then
    raise exception using
      errcode = '23514',
      message = 'final cash transfer cannot exceed expected cash';
  end if;
  if v_transfer_bank > v_expected_bank then
    raise exception using
      errcode = '23514',
      message = 'final bank transfer cannot exceed Caja / Banco funds';
  end if;

  v_expected_cash_after_transfer := v_expected_cash - v_transfer_cash;
  v_expected_bank_after_transfer := v_expected_bank - v_transfer_bank;
  v_cash_difference := v_declared_cash - v_expected_cash_after_transfer;
  v_bank_difference := v_declared_bank - v_expected_bank_after_transfer;

  if (v_cash_difference <> 0 or v_bank_difference <> 0)
     and v_difference_note = '' then
    raise exception using
      errcode = '22023',
      message = 'cash differences require an observation';
  end if;

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  if v_transfer_cash > 0 then
    v_entity_id := extensions.gen_random_uuid();
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
      created_by_legacy_id,
      created_at
    )
    values (
      v_entity_id,
      'treasury-transfer-' || v_entity_id::text,
      v_balance.id,
      p_local_id,
      'RETIRO_CAJA',
      'EFECTIVO',
      'CIERRE',
      v_transfer_cash,
      'UYU',
      'Traspaso final de caja a Principal ' || v_balance.visible_id,
      'ACTIVO',
      v_request.actor_id,
      v_actor_legacy_id,
      v_created_at
    )
    returning * into v_transfer;
    v_transfers := v_transfers
      || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_transfer));

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_local_cash.id,
      p_local_id,
      v_balance.id,
      'TRASPASO_CAJA',
      v_transfer.id::text,
      'SALIDA',
      'RETIRO_CAJA',
      v_transfer_cash,
      'Retiro de caja a Principal - EFECTIVO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_principal_cash.id,
      p_local_id,
      v_balance.id,
      'TRASPASO_CAJA',
      v_transfer.id::text,
      'ENTRADA',
      'RETIRO_CAJA',
      v_transfer_cash,
      'Retiro de caja a Principal - EFECTIVO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);
  end if;

  if v_transfer_bank > 0 then
    v_entity_id := extensions.gen_random_uuid();
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
      created_by_legacy_id,
      created_at
    )
    values (
      v_entity_id,
      'treasury-transfer-' || v_entity_id::text,
      v_balance.id,
      p_local_id,
      'RETIRO_CAJA',
      'BANCO',
      'CIERRE',
      v_transfer_bank,
      'UYU',
      'Traspaso final de banco a Principal ' || v_balance.visible_id,
      'ACTIVO',
      v_request.actor_id,
      v_actor_legacy_id,
      v_created_at
    )
    returning * into v_transfer;
    v_transfers := v_transfers
      || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_transfer));

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_local_bank.id,
      p_local_id,
      v_balance.id,
      'TRASPASO_CAJA',
      v_transfer.id::text,
      'SALIDA',
      'RETIRO_CAJA',
      v_transfer_bank,
      'Retiro de caja a Principal - BANCO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);

    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_principal_bank.id,
      p_local_id,
      v_balance.id,
      'TRASPASO_CAJA',
      v_transfer.id::text,
      'ENTRADA',
      'RETIRO_CAJA',
      v_transfer_bank,
      'Retiro de caja a Principal - BANCO',
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);
  end if;

  if v_cash_difference <> 0 then
    if v_cash_difference < 0 then
      perform private.assert_available_funds(
        v_local_cash.id,
        pg_catalog.abs(v_cash_difference)
      );
    end if;
    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_local_cash.id,
      p_local_id,
      v_balance.id,
      'DIFERENCIA_CAJA',
      v_balance.id::text || '-EFECTIVO',
      case
        when v_cash_difference > 0
          then 'ENTRADA'::public.account_movement_direction
        else 'SALIDA'::public.account_movement_direction
      end,
      'DIFERENCIA_EFECTIVO',
      pg_catalog.abs(v_cash_difference),
      'Diferencia efectivo caja ' || v_balance.visible_id
        || ' - ' || v_balance.operating_date::text,
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);
  end if;

  if v_bank_difference <> 0 then
    if v_bank_difference < 0 then
      perform private.assert_available_funds(
        v_local_bank.id,
        pg_catalog.abs(v_bank_difference)
      );
    end if;
    select *
    into v_ledger_movement
    from private.append_account_movement(
      v_request.id,
      v_local_bank.id,
      p_local_id,
      v_balance.id,
      'DIFERENCIA_CAJA',
      v_balance.id::text || '-BANCO',
      case
        when v_bank_difference > 0
          then 'ENTRADA'::public.account_movement_direction
        else 'SALIDA'::public.account_movement_direction
      end,
      'DIFERENCIA_BANCO',
      pg_catalog.abs(v_bank_difference),
      'Diferencia banco caja ' || v_balance.visible_id
        || ' - ' || v_balance.operating_date::text,
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_ledger_movement.id);
  end if;

  if private.assert_open_cash_reconciled(v_balance.id, p_local_id)
     <> v_declared_cash then
    raise exception using
      errcode = '23514',
      message = 'declared cash does not reconcile after final movements';
  end if;
  if private.account_balance(v_local_bank.id) <> v_declared_bank then
    raise exception using
      errcode = '23514',
      message = 'declared bank does not reconcile after final movements';
  end if;
  perform private.assert_machine_result_synced(v_balance.id, p_local_id);

  for v_reading in
    select mr.*
    from public.machine_readings mr
    where mr.balance_id = v_balance.id
      and mr.local_id = p_local_id
      and mr.status = 'CARGADA'
    order by mr.machine_id
  loop
    update public.machines m
    set
      last_in = v_reading.in_actual,
      last_out = v_reading.out_actual
    where m.id = v_reading.machine_id
      and m.current_location_kind = 'LOCAL'
      and m.current_local_id = p_local_id
    returning * into v_machine;

    if not found then
      raise exception using
        errcode = '23514',
        message = 'a loaded machine is no longer assigned to the balance local';
    end if;

    v_entity_id := extensions.gen_random_uuid();
    insert into public.machine_history (
      id,
      legacy_id,
      machine_id,
      machine_legacy_id,
      machine_visible_id,
      machine_name_snapshot,
      location_kind,
      local_id,
      action,
      detail,
      actor_id,
      actor_legacy_id,
      created_at
    )
    values (
      v_entity_id,
      'machine-history-' || v_entity_id::text,
      v_machine.id,
      v_machine.legacy_id,
      v_machine.visible_id,
      v_machine.name,
      'LOCAL',
      p_local_id,
      'CONTADORES',
      'Cierre ' || v_balance.operating_date::text
        || ': IN ' || v_reading.in_previous::text
        || ' -> ' || v_reading.in_actual::text
        || ', OUT ' || v_reading.out_previous::text
        || ' -> ' || v_reading.out_actual::text,
      v_request.actor_id,
      v_actor_legacy_id,
      v_created_at
    );
    v_machine_history := v_machine_history
      || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'machine_id',
          v_machine.id,
          'reading_id',
          v_reading.id,
          'history_id',
          v_entity_id
        )
      );
  end loop;

  update public.cash_balances cb
  set
    status = 'CERRADO',
    closed_by = v_request.actor_id,
    closed_by_legacy_id = v_actor_legacy_id,
    closed_by_role = v_request.actual_role,
    closed_at = v_created_at,
    declared_cash = v_declared_cash,
    declared_bank = v_declared_bank,
    next_cash_base = v_declared_cash,
    next_bank_base = v_declared_bank,
    final_transfer_to_principal_cash = v_transfer_cash,
    final_transfer_to_principal_bank = v_transfer_bank,
    cash_difference = v_cash_difference,
    bank_difference = v_bank_difference,
    difference_note = v_difference_note,
    difference_status = case
      when v_cash_difference = 0 and v_bank_difference = 0 then null
      else 'PENDIENTE'::public.difference_status
    end
  where cb.id = v_balance.id
    and cb.local_id = p_local_id
    and cb.status = 'EN_PROCESO'
  returning * into v_closed_balance;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'the cash balance changed before it could be closed';
  end if;

  perform private.append_command_audit(
    v_request.id,
    'Cerrar caja',
    'BalanceDiario',
    v_closed_balance.id::text,
    p_local_id,
    pg_catalog.to_jsonb(v_balance),
    pg_catalog.jsonb_build_object(
      'balance',
      pg_catalog.to_jsonb(v_closed_balance),
      'closingTreasuryTransfers',
      v_transfers,
      'machineHistory',
      v_machine_history
    ),
    v_difference_note
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    pg_catalog.to_jsonb(v_closed_balance),
    'ledger',
    private.account_movements_json(v_ledger_ids),
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create or replace function public.poseidon_session_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_locals jsonb;
begin
  select *
  into v_actor
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'ACTIVO';

  if v_actor.id is null then
    raise exception using
      errcode = '42501',
      message = 'active profile required';
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', l.id,
        'legacy_id', l.legacy_id,
        'visible_id', l.visible_id,
        'name', l.name,
        'status', l.status
      )
      order by pg_catalog.char_length(l.visible_id), l.visible_id
    ),
    '[]'::jsonb
  )
  into v_locals
  from public.locals l
  where v_actor.role = 'ADMINISTRADOR'
     or exists (
       select 1
       from public.user_locals ul
       where ul.user_id = v_actor.id
         and ul.local_id = l.id
     );

  return pg_catalog.jsonb_build_object(
    'schema_version', 3,
    'profile',
    pg_catalog.jsonb_build_object(
      'id', v_actor.id,
      'legacy_id', v_actor.legacy_id,
      'username', v_actor.username,
      'display_name', v_actor.display_name,
      'role', v_actor.role
    ),
    'locals', v_locals
  );
end;
$$;

revoke execute on function private.nonnegative_payload_amount(jsonb, text, text, numeric)
from public;
revoke execute on function private.sync_machine_result(uuid, uuid, uuid, timestamptz)
from public;
revoke execute on function private.assert_machine_result_synced(uuid, uuid)
from public;

revoke all on function public.poseidon_open_cash(text, public.app_role, uuid, jsonb)
from public, anon;
revoke all on function public.poseidon_save_readings(text, public.app_role, uuid, jsonb)
from public, anon;
revoke all on function public.poseidon_close_cash(text, public.app_role, uuid, jsonb)
from public, anon;

grant execute on function public.poseidon_open_cash(text, public.app_role, uuid, jsonb)
to authenticated;
grant execute on function public.poseidon_save_readings(text, public.app_role, uuid, jsonb)
to authenticated;
grant execute on function public.poseidon_close_cash(text, public.app_role, uuid, jsonb)
to authenticated;

comment on function public.poseidon_open_cash(text, public.app_role, uuid, jsonb) is
  'Opens one cash balance per local and records initial partner and treasury legs atomically.';
comment on function public.poseidon_save_readings(text, public.app_role, uuid, jsonb) is
  'Validates and saves a reading batch atomically and appends the machine-result ledger delta.';
comment on function public.poseidon_close_cash(text, public.app_role, uuid, jsonb) is
  'Closes a reconciled cash balance with final treasury transfers, declared differences, machine history and audit in one transaction.';
comment on function public.poseidon_session_context() is
  'Returns schema 3 with the authenticated active profile and its server-authorized locals.';

commit;
