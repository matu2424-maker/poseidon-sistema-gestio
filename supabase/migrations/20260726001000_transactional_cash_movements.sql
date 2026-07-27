begin;

create function public.poseidon_create_transfer(
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
  v_client public.clients%rowtype;
  v_cash_account public.current_accounts%rowtype;
  v_bank_account public.current_accounts%rowtype;
  v_transfer_account public.current_accounts%rowtype;
  v_transfer public.transfers%rowtype;
  v_movement public.account_movements%rowtype;
  v_actor_legacy_id text;
  v_balance_reference text;
  v_client_reference text;
  v_receipt text;
  v_beneficiary_name text;
  v_destination_account text;
  v_amount numeric;
  v_transfer_id uuid := extensions.gen_random_uuid();
  v_movement_ids uuid[] := array[]::uuid[];
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'create_transfer',
    p_idempotency_key,
    private.command_request_hash(
      'create_transfer',
      p_actor_function,
      p_local_id,
      p_payload
    )
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  if p_actor_function <> 'CAJERO' then
    raise exception using
      errcode = '42501',
      message = 'cash transfers require the cashier function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
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
      message = 'cash transfers require the active balance for the local';
  end if;

  v_receipt := pg_catalog.btrim(
    coalesce(
      p_payload ->> 'receipt',
      p_payload ->> 'receiptReference',
      p_payload ->> 'receipt_reference',
      ''
    )
  );
  v_beneficiary_name := pg_catalog.btrim(
    coalesce(
      p_payload ->> 'name',
      p_payload ->> 'beneficiaryName',
      p_payload ->> 'beneficiary_name',
      ''
    )
  );
  v_destination_account := pg_catalog.btrim(
    coalesce(
      p_payload ->> 'account',
      p_payload ->> 'destinationAccount',
      p_payload ->> 'destination_account',
      ''
    )
  );
  if v_destination_account = '' then
    v_destination_account := 'Cuenta unica inicial';
  end if;
  v_amount := private.positive_payload_amount(p_payload);

  if v_receipt = '' or v_beneficiary_name = '' then
    raise exception using
      errcode = '22023',
      message = 'receipt, beneficiary name and amount are required';
  end if;

  v_client_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'clientId', p_payload ->> 'client_id', '')
    ),
    ''
  );
  if v_client_reference is not null then
    select *
    into v_client
    from public.clients c
    where c.local_id = p_local_id
      and c.status = 'ACTIVO'
      and (
        c.id::text = v_client_reference
        or c.legacy_id = v_client_reference
      )
    for share;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'active transfer client not found in command local';
    end if;
  end if;

  v_cash_account := private.require_current_account(
    'LOCAL_EFECTIVO',
    p_local_id,
    null
  );
  v_bank_account := private.require_current_account(
    'LOCAL_BANCO',
    p_local_id,
    null
  );
  v_transfer_account := private.require_current_account(
    'TRANSFERENCIAS',
    null,
    null
  );

  perform private.lock_current_accounts(
    array[v_cash_account.id, v_bank_account.id, v_transfer_account.id]
  );
  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  perform private.assert_available_funds(v_cash_account.id, v_amount);

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  insert into public.transfers (
    id,
    legacy_id,
    balance_id,
    local_id,
    client_id,
    receipt,
    beneficiary_name,
    amount,
    destination_account,
    status,
    created_by,
    created_by_legacy_id,
    created_at
  )
  values (
    v_transfer_id,
    'transfer-' || v_transfer_id::text,
    v_balance.id,
    p_local_id,
    v_client.id,
    v_receipt,
    v_beneficiary_name,
    v_amount,
    v_destination_account,
    'ACTIVO',
    v_request.actor_id,
    v_actor_legacy_id,
    v_created_at
  )
  returning * into v_transfer;

  select *
  into v_movement
  from private.append_account_movement(
    v_request.id,
    v_transfer_account.id,
    p_local_id,
    v_balance.id,
    'TRANSFERENCIA',
    v_transfer.id::text,
    'ENTRADA',
    'TRANSFERENCIA',
    v_transfer.amount,
    v_transfer.beneficiary_name || ' - ' || v_transfer.receipt,
    null,
    v_created_at
  );
  v_movement_ids := pg_catalog.array_append(v_movement_ids, v_movement.id);

  select *
  into v_movement
  from private.append_account_movement(
    v_request.id,
    v_bank_account.id,
    p_local_id,
    v_balance.id,
    'TRANSFERENCIA',
    v_transfer.id::text,
    'ENTRADA',
    'TRANSFERENCIA',
    v_transfer.amount,
    v_transfer.beneficiary_name || ' - ' || v_transfer.receipt,
    null,
    v_created_at
  );
  v_movement_ids := pg_catalog.array_append(v_movement_ids, v_movement.id);

  select *
  into v_movement
  from private.append_account_movement(
    v_request.id,
    v_cash_account.id,
    p_local_id,
    v_balance.id,
    'TRANSFERENCIA',
    v_transfer.id::text,
    'SALIDA',
    'TRANSFERENCIA',
    v_transfer.amount,
    v_transfer.beneficiary_name
      || ' - '
      || v_transfer.receipt
      || ' - salida a banco',
    null,
    v_created_at
  );
  v_movement_ids := pg_catalog.array_append(v_movement_ids, v_movement.id);

  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  perform private.append_command_audit(
    v_request.id,
    'Crear transferencia',
    'Transferencia',
    v_transfer.id::text,
    p_local_id,
    '{}'::jsonb,
    pg_catalog.to_jsonb(v_transfer)
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

create function public.poseidon_annul_transfer(
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
  v_previous public.transfers%rowtype;
  v_transfer public.transfers%rowtype;
  v_balance public.cash_balances%rowtype;
  v_cash_account public.current_accounts%rowtype;
  v_bank_account public.current_accounts%rowtype;
  v_transfer_account public.current_accounts%rowtype;
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
    'annul_transfer',
    p_idempotency_key,
    private.command_request_hash(
      'annul_transfer',
      p_actor_function,
      p_local_id,
      p_payload
    )
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  if p_actor_function <> 'CAJERO' then
    raise exception using
      errcode = '42501',
      message = 'cash transfer annulments require the cashier function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_transfer_reference := nullif(
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'transferId',
        p_payload ->> 'transfer_id',
        ''
      )
    ),
    ''
  );
  v_balance_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')
    ),
    ''
  );
  v_reason := pg_catalog.btrim(
    coalesce(p_payload ->> 'reason', p_payload ->> 'note', '')
  );
  if v_reason = '' then
    v_reason := 'Anulacion operativa';
  end if;

  if v_transfer_reference is null then
    raise exception using errcode = '22023', message = 'transferId is required';
  end if;
  if v_balance_reference is null then
    raise exception using errcode = '22023', message = 'balanceId is required';
  end if;

  select *
  into v_previous
  from public.transfers t
  where t.local_id = p_local_id
    and (
      t.id::text = v_transfer_reference
      or t.legacy_id = v_transfer_reference
    )
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'transfer not found in command local';
  end if;
  if v_previous.status = 'ANULADO' then
    raise exception using errcode = '55000', message = 'transfer is already annulled';
  end if;

  select *
  into v_balance
  from public.cash_balances cb
  where cb.id = v_previous.balance_id
    and cb.local_id = p_local_id
    and (
      cb.id::text = v_balance_reference
      or cb.legacy_id = v_balance_reference
    )
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'balanceId does not match the transfer balance';
  end if;
  if v_balance.status <> 'EN_PROCESO' then
    raise exception using
      errcode = '55000',
      message = 'cash transfers can only be annulled while their balance is open';
  end if;

  v_cash_account := private.require_current_account(
    'LOCAL_EFECTIVO',
    p_local_id,
    null
  );
  v_bank_account := private.require_current_account(
    'LOCAL_BANCO',
    p_local_id,
    null
  );
  v_transfer_account := private.require_current_account(
    'TRANSFERENCIAS',
    null,
    null
  );

  perform private.lock_current_accounts(
    array[v_cash_account.id, v_bank_account.id, v_transfer_account.id]
  );
  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);

  v_reversal_ids := private.reverse_account_movements(
    v_request.id,
    p_local_id,
    array['TRANSFERENCIA'::public.account_movement_source],
    array[v_previous.id::text, v_previous.legacy_id],
    3,
    v_reason
  );

  update public.transfers t
  set status = 'ANULADO'
  where t.id = v_previous.id
  returning * into v_transfer;

  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  perform private.append_command_audit(
    v_request.id,
    'Anular transferencia',
    'Transferencia',
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

create function public.poseidon_create_gift(
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
  v_client public.clients%rowtype;
  v_cash_account public.current_accounts%rowtype;
  v_gift public.gifts%rowtype;
  v_movement public.account_movements%rowtype;
  v_client_item record;
  v_client_payload jsonb;
  v_actor_legacy_id text;
  v_balance_reference text;
  v_client_reference text;
  v_reference text;
  v_description text;
  v_amount numeric;
  v_gift_id uuid := extensions.gen_random_uuid();
  v_client_id uuid;
  v_client_ids uuid[] := array[]::uuid[];
  v_movement_ids uuid[];
  v_value jsonb;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'create_gift',
    p_idempotency_key,
    private.command_request_hash(
      'create_gift',
      p_actor_function,
      p_local_id,
      p_payload
    )
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  if p_actor_function <> 'CAJERO' then
    raise exception using
      errcode = '42501',
      message = 'cash gifts require the cashier function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
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
      message = 'cash gifts require the active balance for the local';
  end if;

  if p_payload ? 'clientIds' then
    v_client_payload := p_payload -> 'clientIds';
  elsif p_payload ? 'client_ids' then
    v_client_payload := p_payload -> 'client_ids';
  else
    raise exception using
      errcode = '22023',
      message = 'clientIds must be a nonempty JSON array';
  end if;

  if pg_catalog.jsonb_typeof(v_client_payload) <> 'array'
     or pg_catalog.jsonb_array_length(v_client_payload) = 0 then
    raise exception using
      errcode = '22023',
      message = 'clientIds must be a nonempty JSON array';
  end if;

  for v_client_item in
    select items.value, items.ordinality
    from pg_catalog.jsonb_array_elements(v_client_payload)
      with ordinality items(value, ordinality)
    order by items.ordinality
  loop
    if pg_catalog.jsonb_typeof(v_client_item.value) <> 'string' then
      raise exception using
        errcode = '22023',
        message = 'each clientId must be a string';
    end if;

    v_client_reference := nullif(
      pg_catalog.btrim(v_client_item.value #>> '{}'),
      ''
    );
    if v_client_reference is null then
      raise exception using errcode = '22023', message = 'clientId cannot be blank';
    end if;

    select *
    into v_client
    from public.clients c
    where c.local_id = p_local_id
      and c.status = 'ACTIVO'
      and (
        c.id::text = v_client_reference
        or c.legacy_id = v_client_reference
      )
    for share;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'all gift clients must be active in the command local';
    end if;

    if not (v_client.id = any(v_client_ids)) then
      v_client_ids := pg_catalog.array_append(v_client_ids, v_client.id);
    end if;
  end loop;

  v_reference := pg_catalog.btrim(coalesce(p_payload ->> 'reference', ''));
  v_description := pg_catalog.btrim(coalesce(p_payload ->> 'description', ''));
  v_amount := private.positive_payload_amount(p_payload);
  if v_reference = '' then
    raise exception using
      errcode = '22023',
      message = 'clients, reference and amount are required';
  end if;

  v_cash_account := private.require_current_account(
    'LOCAL_EFECTIVO',
    p_local_id,
    null
  );
  perform private.lock_current_accounts(array[v_cash_account.id]);
  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  perform private.assert_available_funds(v_cash_account.id, v_amount);

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  insert into public.gifts (
    id,
    legacy_id,
    balance_id,
    local_id,
    primary_client_id,
    type,
    cash_amount,
    credit_amount,
    reference,
    description,
    status,
    created_by,
    created_by_legacy_id,
    created_at
  )
  values (
    v_gift_id,
    'gift-' || v_gift_id::text,
    v_balance.id,
    p_local_id,
    v_client_ids[1],
    'EFECTIVO',
    v_amount,
    0,
    v_reference,
    v_description,
    'ACTIVO',
    v_request.actor_id,
    v_actor_legacy_id,
    v_created_at
  )
  returning * into v_gift;

  foreach v_client_id in array v_client_ids
  loop
    insert into public.gift_clients (gift_id, client_id, local_id, linked_at)
    values (v_gift.id, v_client_id, p_local_id, v_created_at);
  end loop;

  select *
  into v_movement
  from private.append_account_movement(
    v_request.id,
    v_cash_account.id,
    p_local_id,
    v_balance.id,
    'REGALO',
    v_gift.id::text,
    'SALIDA',
    'REGALO',
    v_gift.cash_amount,
    v_gift.reference
      || case
           when v_gift.description = '' then ''
           else ' - ' || v_gift.description
         end,
    null,
    v_created_at
  );
  v_movement_ids := array[v_movement.id];

  v_value := pg_catalog.to_jsonb(v_gift)
    || pg_catalog.jsonb_build_object(
      'client_ids',
      pg_catalog.to_jsonb(v_client_ids)
    );

  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  perform private.append_command_audit(
    v_request.id,
    'Crear regalo',
    'Regalo',
    v_gift.id::text,
    p_local_id,
    '{}'::jsonb,
    v_value
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', v_value,
    'ledger', private.account_movements_json(v_movement_ids),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_annul_gift(
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
  v_previous public.gifts%rowtype;
  v_gift public.gifts%rowtype;
  v_balance public.cash_balances%rowtype;
  v_cash_account public.current_accounts%rowtype;
  v_gift_reference text;
  v_balance_reference text;
  v_reason text;
  v_client_ids uuid[];
  v_reversal_ids uuid[];
  v_previous_value jsonb;
  v_value jsonb;
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'annul_gift',
    p_idempotency_key,
    private.command_request_hash(
      'annul_gift',
      p_actor_function,
      p_local_id,
      p_payload
    )
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  if p_actor_function <> 'CAJERO' then
    raise exception using
      errcode = '42501',
      message = 'cash gift annulments require the cashier function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_gift_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'giftId', p_payload ->> 'gift_id', '')
    ),
    ''
  );
  v_balance_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')
    ),
    ''
  );
  v_reason := pg_catalog.btrim(
    coalesce(p_payload ->> 'reason', p_payload ->> 'note', '')
  );
  if v_reason = '' then
    v_reason := 'Anulacion operativa antes del cierre';
  end if;

  if v_gift_reference is null then
    raise exception using errcode = '22023', message = 'giftId is required';
  end if;
  if v_balance_reference is null then
    raise exception using errcode = '22023', message = 'balanceId is required';
  end if;

  select *
  into v_previous
  from public.gifts g
  where g.local_id = p_local_id
    and (
      g.id::text = v_gift_reference
      or g.legacy_id = v_gift_reference
    )
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'gift not found in command local';
  end if;
  if v_previous.status = 'ANULADO' then
    raise exception using errcode = '55000', message = 'gift is already annulled';
  end if;

  select *
  into v_balance
  from public.cash_balances cb
  where cb.id = v_previous.balance_id
    and cb.local_id = p_local_id
    and (
      cb.id::text = v_balance_reference
      or cb.legacy_id = v_balance_reference
    )
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'balanceId does not match the gift balance';
  end if;
  if v_balance.status <> 'EN_PROCESO' then
    raise exception using
      errcode = '55000',
      message = 'cash gifts can only be annulled while their balance is open';
  end if;

  select pg_catalog.array_agg(gc.client_id order by gc.client_id)
  into v_client_ids
  from public.gift_clients gc
  where gc.gift_id = v_previous.id
    and gc.local_id = p_local_id;
  v_previous_value := pg_catalog.to_jsonb(v_previous)
    || pg_catalog.jsonb_build_object(
      'client_ids',
      pg_catalog.to_jsonb(coalesce(v_client_ids, array[]::uuid[]))
    );

  v_cash_account := private.require_current_account(
    'LOCAL_EFECTIVO',
    p_local_id,
    null
  );
  perform private.lock_current_accounts(array[v_cash_account.id]);
  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);

  v_reversal_ids := private.reverse_account_movements(
    v_request.id,
    p_local_id,
    array['REGALO'::public.account_movement_source],
    array[v_previous.id::text, v_previous.legacy_id],
    1,
    v_reason
  );

  update public.gifts g
  set status = 'ANULADO'
  where g.id = v_previous.id
  returning * into v_gift;

  v_value := pg_catalog.to_jsonb(v_gift)
    || pg_catalog.jsonb_build_object(
      'client_ids',
      pg_catalog.to_jsonb(coalesce(v_client_ids, array[]::uuid[]))
    );

  perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  perform private.append_command_audit(
    v_request.id,
    'Anular regalo',
    'Regalo',
    v_gift.id::text,
    p_local_id,
    v_previous_value,
    v_value,
    v_reason
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', v_value,
    'ledger', private.account_movements_json(v_reversal_ids),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

revoke all on function public.poseidon_create_transfer(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_annul_transfer(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_create_gift(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_annul_gift(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;

grant execute on function public.poseidon_create_transfer(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_annul_transfer(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_create_gift(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_annul_gift(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;

comment on function public.poseidon_create_transfer(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Creates an authenticated Caja cash-to-bank transfer with its informational ledger leg, audit and idempotency atomically.';
comment on function public.poseidon_annul_transfer(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Annuls an active transfer only while its cash balance is open and appends three funded reversals atomically.';
comment on function public.poseidon_create_gift(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Creates an authenticated cash gift, client links, Caja outflow, economic entity, audit and idempotency atomically.';
comment on function public.poseidon_annul_gift(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Annuls an active gift only while its cash balance is open and appends its cash reversal atomically.';

commit;
