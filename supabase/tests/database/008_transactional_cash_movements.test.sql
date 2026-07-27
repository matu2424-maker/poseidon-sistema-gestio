begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(57);

select is(
  (
    select count(*)::bigint
    from (
      values
        ('public.poseidon_create_transfer(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_transfer(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_create_gift(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_gift(text,public.app_role,uuid,jsonb)')
    ) target(signature)
    join pg_catalog.pg_proc p
      on p.oid = pg_catalog.to_regprocedure(target.signature)
    where p.prosecdef
      and p.provolatile = 'v'
      and p.prorettype = 'jsonb'::regtype
      and p.proconfig @> array['search_path=""']
  ),
  4::bigint,
  'the four cash-movement RPCs are volatile SECURITY DEFINER functions with an empty search_path'
);

select ok(
  (
    select pg_catalog.bool_and(
      pg_catalog.has_function_privilege(
        'authenticated',
        target.signature,
        'EXECUTE'
      )
      and not pg_catalog.has_function_privilege(
        'anon',
        target.signature,
        'EXECUTE'
      )
    )
    from (
      values
        ('public.poseidon_create_transfer(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_transfer(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_create_gift(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_gift(text,public.app_role,uuid,jsonb)')
    ) target(signature)
  ),
  'only authenticated may execute the four cash-movement RPCs'
);

select ok(
  not pg_catalog.has_table_privilege(
    'authenticated',
    'public.transfers',
    'INSERT,UPDATE,DELETE'
  )
  and not pg_catalog.has_table_privilege(
    'authenticated',
    'public.gifts',
    'INSERT,UPDATE,DELETE'
  )
  and not pg_catalog.has_table_privilege(
    'authenticated',
    'public.gift_clients',
    'INSERT,UPDATE,DELETE'
  )
  and not pg_catalog.has_table_privilege(
    'authenticated',
    'public.account_movements',
    'INSERT,UPDATE,DELETE'
  ),
  'authenticated cannot bypass the RPCs with direct operational or ledger writes'
);

select ok(
  pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'public.poseidon_create_transfer(text,public.app_role,uuid,jsonb)'::regprocedure
    ),
    'private.claim_command'
  ) > 0
  and pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'public.poseidon_create_transfer(text,public.app_role,uuid,jsonb)'::regprocedure
    ),
    'private.assert_open_cash_reconciled'
  ) > 0
  and pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'public.poseidon_annul_transfer(text,public.app_role,uuid,jsonb)'::regprocedure
    ),
    'private.reverse_account_movements'
  ) > 0,
  'cash transfers use the shared idempotency, reconciliation and append-only reversal runtime'
);

insert into auth.users (id, email) values
  ('15000000-0000-0000-0000-000000000001', 'cashier-movements@poseidon.test'),
  ('15000000-0000-0000-0000-000000000002', 'manager-movements@poseidon.test'),
  ('15000000-0000-0000-0000-000000000003', 'outsider-movements@poseidon.test'),
  ('15000000-0000-0000-0000-000000000004', 'admin-movements@poseidon.test');

insert into public.profiles (
  id,
  legacy_id,
  username,
  display_name,
  role,
  status
) values
  (
    '15000000-0000-0000-0000-000000000001',
    'cashier-movements',
    'cashier-movements',
    'Cajero Movimientos',
    'CAJERO',
    'ACTIVO'
  ),
  (
    '15000000-0000-0000-0000-000000000002',
    'manager-movements',
    'manager-movements',
    'Encargado Movimientos',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '15000000-0000-0000-0000-000000000003',
    'outsider-movements',
    'outsider-movements',
    'Encargado Ajeno Movimientos',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '15000000-0000-0000-0000-000000000004',
    'admin-movements',
    'admin-movements',
    'Administrador Movimientos',
    'ADMINISTRADOR',
    'ACTIVO'
  );

insert into public.locals (
  id,
  legacy_id,
  visible_id,
  name,
  is_primary
) values
  (
    '25000000-0000-0000-0000-000000000001',
    'cash-movement-local-1',
    '51',
    'Poseidon Movimientos',
    true
  ),
  (
    '25000000-0000-0000-0000-000000000002',
    'cash-movement-local-2',
    '52',
    'Local Ajeno Movimientos',
    false
  );

insert into public.user_locals (user_id, local_id) values
  (
    '15000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000001'
  ),
  (
    '15000000-0000-0000-0000-000000000002',
    '25000000-0000-0000-0000-000000000001'
  ),
  (
    '15000000-0000-0000-0000-000000000003',
    '25000000-0000-0000-0000-000000000002'
  );

insert into public.clients (
  id,
  legacy_id,
  visible_id,
  local_id,
  name,
  document_type,
  document_id,
  status
) values
  (
    '35000000-0000-0000-0000-000000000001',
    'cash-movement-client-1',
    '501',
    '25000000-0000-0000-0000-000000000001',
    'Cliente Movimiento Uno',
    'CEDULA',
    '50000001',
    'ACTIVO'
  ),
  (
    '35000000-0000-0000-0000-000000000002',
    'cash-movement-client-2',
    '502',
    '25000000-0000-0000-0000-000000000001',
    'Cliente Movimiento Dos',
    'PASAPORTE',
    'MOVE50002',
    'ACTIVO'
  ),
  (
    '35000000-0000-0000-0000-000000000003',
    'cash-movement-client-inactive',
    '503',
    '25000000-0000-0000-0000-000000000001',
    'Cliente Movimiento Inactivo',
    'CEDULA',
    '50000003',
    'INACTIVO'
  ),
  (
    '35000000-0000-0000-0000-000000000004',
    'cash-movement-client-other-local',
    '504',
    '25000000-0000-0000-0000-000000000002',
    'Cliente Movimiento Otro Local',
    'CEDULA',
    '50000004',
    'ACTIVO'
  );

insert into public.current_accounts (
  id,
  legacy_id,
  kind,
  local_id,
  name
) values
  (
    '55000000-0000-0000-0000-000000000001',
    'cash-movement-local-cash',
    'LOCAL_EFECTIVO',
    '25000000-0000-0000-0000-000000000001',
    'Poseidon Movimientos - Caja / Efectivo'
  ),
  (
    '55000000-0000-0000-0000-000000000002',
    'cash-movement-local-bank',
    'LOCAL_BANCO',
    '25000000-0000-0000-0000-000000000001',
    'Poseidon Movimientos - Caja / Banco'
  ),
  (
    '55000000-0000-0000-0000-000000000003',
    'cash-movement-transfer-account',
    'TRANSFERENCIAS',
    null,
    'Transferencias Movimientos'
  );

insert into public.cash_balances (
  id,
  legacy_id,
  visible_id,
  local_id,
  operating_date,
  initial_cash,
  initial_bank,
  opened_by,
  opened_by_legacy_id,
  opened_by_role
) values (
  '65000000-0000-0000-0000-000000000001',
  'cash-movement-balance-open',
  'POSE-MOV-1',
  '25000000-0000-0000-0000-000000000001',
  '2026-07-26',
  1000,
  100,
  '15000000-0000-0000-0000-000000000001',
  'cashier-movements',
  'CAJERO'
);

insert into public.account_movements (
  id,
  legacy_id,
  account_id,
  local_id,
  source_type,
  source_id,
  direction,
  concept,
  amount,
  detail,
  actor_id,
  actor_legacy_id
) values
  (
    '75000000-0000-0000-0000-000000000001',
    'cash-movement-fund-local-cash',
    '55000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000001',
    'APORTE',
    'cash-movement-initial-cash',
    'ENTRADA',
    'SALDO_INICIAL',
    1000,
    'Saldo inicial de Caja / Efectivo',
    '15000000-0000-0000-0000-000000000004',
    'admin-movements'
  ),
  (
    '75000000-0000-0000-0000-000000000002',
    'cash-movement-fund-local-bank',
    '55000000-0000-0000-0000-000000000002',
    '25000000-0000-0000-0000-000000000001',
    'APORTE',
    'cash-movement-initial-bank',
    'ENTRADA',
    'SALDO_INICIAL',
    100,
    'Saldo inicial de Caja / Banco',
    '15000000-0000-0000-0000-000000000004',
    'admin-movements'
  );

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_create_transfer(
      'cash-transfer-manager-role-0001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"65000000-0000-0000-0000-000000000001",
        "receipt":"TRX-ROLE",
        "name":"Funcion incorrecta",
        "amount":10
      }'::jsonb
    )
  $sql$,
  'cash transfers require the cashier function'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000003',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_create_gift(
      'cash-gift-outsider-local-0001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"65000000-0000-0000-0000-000000000001",
        "clientIds":["35000000-0000-0000-0000-000000000001"],
        "reference":"REG-OUTSIDER",
        "amount":10
      }'::jsonb
    )
  $sql$,
  'authenticated user is not assigned to the local'
);

reset role;

select is(
  (
    select
      (select count(*) from public.command_requests)
      + (select count(*) from public.transfers)
      + (select count(*) from public.gifts)
      + (select count(*) from public.audit_events)
  ),
  0::bigint,
  'function and local authorization failures leave no durable command, entity or audit'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_create_transfer(
      'cash-transfer-inactive-client-1',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"65000000-0000-0000-0000-000000000001",
        "clientId":"cash-movement-client-inactive",
        "receipt":"TRX-INACTIVE",
        "name":"Cliente inactivo",
        "amount":10
      }'::jsonb
    )
  $sql$,
  'active transfer client not found in command local'
);

select throws_ok(
  $sql$
    select public.poseidon_create_gift(
      'cash-gift-other-client-0001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"65000000-0000-0000-0000-000000000001",
        "clientIds":[
          "35000000-0000-0000-0000-000000000001",
          "cash-movement-client-other-local"
        ],
        "reference":"REG-OTHER-LOCAL",
        "amount":10
      }'::jsonb
    )
  $sql$,
  'all gift clients must be active in the command local'
);

reset role;

select ok(
  (select count(*) from public.command_requests) = 0
  and (select count(*) from public.transfers) = 0
  and (select count(*) from public.gifts) = 0
  and (select count(*) from public.gift_clients) = 0
  and (select count(*) from public.audit_events) = 0,
  'client validation failures are atomic'
);

insert into public.account_movements (
  id,
  legacy_id,
  account_id,
  local_id,
  source_type,
  source_id,
  direction,
  concept,
  amount,
  detail,
  actor_id,
  actor_legacy_id
) values (
  '75000000-0000-0000-0000-000000000003',
  'cash-movement-divergence',
  '55000000-0000-0000-0000-000000000001',
  '25000000-0000-0000-0000-000000000001',
  'AJUSTE',
  'cash-movement-divergence',
  'ENTRADA',
  'AJUSTE_TECNICO',
  1,
  'Entrada no asociada para probar conciliacion',
  '15000000-0000-0000-0000-000000000004',
  'admin-movements'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_create_transfer(
      'cash-transfer-divergence-0001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"65000000-0000-0000-0000-000000000001",
        "receipt":"TRX-DIVERGENCE",
        "name":"Conciliacion",
        "amount":10
      }'::jsonb
    )
  $sql$,
  'cash balance and account ledger are not reconciled'
);

reset role;

select ok(
  (select count(*) from public.command_requests) = 0
  and (select count(*) from public.transfers) = 0
  and (select count(*) from public.account_movements where source_type = 'TRANSFERENCIA') = 0
  and (select count(*) from public.audit_events) = 0,
  'reconciliation rejection creates no command, transfer, transfer ledger or audit'
);

insert into public.account_movements (
  id,
  legacy_id,
  account_id,
  local_id,
  source_type,
  source_id,
  direction,
  concept,
  amount,
  detail,
  actor_id,
  actor_legacy_id
) values (
  '75000000-0000-0000-0000-000000000004',
  'cash-movement-divergence-counterpart',
  '55000000-0000-0000-0000-000000000001',
  '25000000-0000-0000-0000-000000000001',
  'AJUSTE',
  'cash-movement-divergence-counterpart',
  'SALIDA',
  'AJUSTE_TECNICO',
  1,
  'Contrapartida para restaurar conciliacion',
  '15000000-0000-0000-0000-000000000004',
  'admin-movements'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_create_transfer(
      'cash-transfer-insufficient-0001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"65000000-0000-0000-0000-000000000001",
        "receipt":"TRX-EXCESS",
        "name":"Fondos insuficientes",
        "amount":1001
      }'::jsonb
    )
  $sql$,
  'insufficient funds'
);

select throws_ok(
  $sql$
    select public.poseidon_create_gift(
      'cash-gift-insufficient-00001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"65000000-0000-0000-0000-000000000001",
        "clientIds":["35000000-0000-0000-0000-000000000001"],
        "reference":"REG-EXCESS",
        "amount":1001
      }'::jsonb
    )
  $sql$,
  'insufficient funds'
);

reset role;

select ok(
  (select count(*) from public.command_requests) = 0
  and (select count(*) from public.transfers) = 0
  and (select count(*) from public.gifts) = 0
  and private.account_balance('55000000-0000-0000-0000-000000000001') = 1000
  and private.account_balance('55000000-0000-0000-0000-000000000002') = 100,
  'insufficient-funds rejections preserve entities, idempotency, cash and bank'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select is(
  (
    public.poseidon_create_transfer(
      'cash-transfer-valid-00000001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"cash-movement-balance-open",
        "clientId":"cash-movement-client-1",
        "receipt":"TRX-VALID-1",
        "name":"Cobro bancario",
        "amount":200,
        "account":"Banco operativo"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'an assigned manager explicitly operating as cashier creates a transfer'
);

reset role;

select set_config(
  'poseidon.test.transfer_id',
  (
    select t.id::text
    from public.transfers t
    where t.receipt = 'TRX-VALID-1'
  ),
  true
);

select ok(
  exists (
    select 1
    from public.transfers t
    where t.balance_id = '65000000-0000-0000-0000-000000000001'
      and t.local_id = '25000000-0000-0000-0000-000000000001'
      and t.client_id = '35000000-0000-0000-0000-000000000001'
      and t.receipt = 'TRX-VALID-1'
      and t.beneficiary_name = 'Cobro bancario'
      and t.destination_account = 'Banco operativo'
      and t.amount = 200
      and t.status = 'ACTIVO'
      and t.created_by = '15000000-0000-0000-0000-000000000002'
      and t.created_by_legacy_id = 'manager-movements'
  ),
  'transfer stores the active balance, local, client, real actor and business fields'
);

select is(
  (
    select pg_catalog.jsonb_object_agg(
      ca.kind::text,
      pg_catalog.jsonb_build_array(am.direction, am.amount)
    )
    from public.account_movements am
    join public.current_accounts ca on ca.id = am.account_id
    where am.source_type = 'TRANSFERENCIA'
      and am.source_id = (
        select t.id::text
        from public.transfers t
        where t.receipt = 'TRX-VALID-1'
      )
      and am.reversal_of is null
  ),
  '{
    "TRANSFERENCIAS":["ENTRADA",200],
    "LOCAL_BANCO":["ENTRADA",200],
    "LOCAL_EFECTIVO":["SALIDA",200]
  }'::jsonb,
  'transfer appends its informational, bank-in and cash-out legs'
);

select is(
  (
    select count(*)::integer
    from public.account_movements am
    where am.source_type = 'TRANSFERENCIA'
      and am.source_id = (
        select t.id::text
        from public.transfers t
        where t.receipt = 'TRX-VALID-1'
      )
      and am.local_id = '25000000-0000-0000-0000-000000000001'
      and am.balance_id = '65000000-0000-0000-0000-000000000001'
      and am.actor_id = '15000000-0000-0000-0000-000000000002'
      and am.actor_legacy_id = 'manager-movements'
  ),
  3,
  'all transfer legs preserve localId, balanceId and authenticated actor'
);

select is(
  pg_catalog.jsonb_build_array(
    private.account_balance('55000000-0000-0000-0000-000000000001'),
    private.account_balance('55000000-0000-0000-0000-000000000002'),
    private.account_balance('55000000-0000-0000-0000-000000000003')
  ),
  '[800,300,200]'::jsonb,
  'transfer moves liquidity from Caja cash to bank and records the informational balance'
);

select is(
  (
    select -coalesce(pg_catalog.sum(g.cash_amount + g.credit_amount), 0)
    from public.gifts g
    where g.status = 'ACTIVO'
  ),
  0::numeric,
  'transfer does not change the economic result'
);

select ok(
  exists (
    select 1
    from public.audit_events ae
    join public.command_requests cr on cr.id = ae.command_request_id
    join public.audit_event_locals ael on ael.audit_event_id = ae.id
    where cr.command_name = 'create_transfer'
      and cr.idempotency_key = 'cash-transfer-valid-00000001'
      and ae.action = 'Crear transferencia'
      and ae.entity_type = 'Transferencia'
      and ae.actor_id = '15000000-0000-0000-0000-000000000002'
      and ae.actor_legacy_id = 'manager-movements'
      and ae.actor_name_snapshot = 'Encargado Movimientos'
      and ae.actual_role = 'ENCARGADO'
      and ae.requested_function = 'CAJERO'
      and ae.primary_local_id = '25000000-0000-0000-0000-000000000001'
      and ael.local_id = ae.primary_local_id
  ),
  'transfer audit derives real manager identity while preserving the requested cashier function'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000002',
  true
);

select is(
  public.poseidon_create_transfer(
    'cash-transfer-valid-00000001',
    'CAJERO',
    '25000000-0000-0000-0000-000000000001',
    '{
      "account":"Banco operativo",
      "amount":200,
      "name":"Cobro bancario",
      "receipt":"TRX-VALID-1",
      "clientId":"cash-movement-client-1",
      "balanceId":"cash-movement-balance-open"
    }'::jsonb
  ),
  (
    select cr.response_payload
    from public.command_requests cr
    where cr.command_name = 'create_transfer'
      and cr.idempotency_key = 'cash-transfer-valid-00000001'
  ),
  'exact transfer replay returns the stored response'
);

reset role;

select ok(
  (select count(*) from public.transfers where receipt = 'TRX-VALID-1') = 1
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'TRANSFERENCIA'
      and am.reversal_of is null
  ) = 3
  and (
    select count(*)
    from public.command_requests cr
    where cr.command_name = 'create_transfer'
      and cr.idempotency_key = 'cash-transfer-valid-00000001'
  ) = 1
  and (
    select count(*)
    from public.audit_events ae
    where ae.action = 'Crear transferencia'
  ) = 1,
  'transfer replay does not duplicate entity, ledger, command or audit'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_create_transfer(
      'cash-transfer-valid-00000001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"cash-movement-balance-open",
        "clientId":"cash-movement-client-1",
        "receipt":"TRX-VALID-1",
        "name":"Cobro bancario",
        "amount":199,
        "account":"Banco operativo"
      }'::jsonb
    )
  $sql$,
  'idempotency key was already used with a different request'
);

reset role;

select ok(
  (select count(*) from public.transfers where receipt = 'TRX-VALID-1') = 1
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'TRANSFERENCIA'
  ) = 3
  and (
    select count(*)
    from public.command_requests cr
    where cr.command_name = 'create_transfer'
  ) = 1,
  'transfer idempotency hash mismatch leaves the successful transaction unchanged'
);

insert into public.account_movements (
  id,
  legacy_id,
  account_id,
  local_id,
  source_type,
  source_id,
  direction,
  concept,
  amount,
  detail,
  actor_id,
  actor_legacy_id
) values (
  '75000000-0000-0000-0000-000000000005',
  'cash-movement-bank-spend',
  '55000000-0000-0000-0000-000000000002',
  '25000000-0000-0000-0000-000000000001',
  'AJUSTE',
  'cash-movement-bank-spend',
  'SALIDA',
  'AJUSTE_TECNICO',
  150,
  'Salida bancaria para probar no negatividad del reverso',
  '15000000-0000-0000-0000-000000000004',
  'admin-movements'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_annul_transfer(
      'cash-transfer-annul-no-funds-1',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        '65000000-0000-0000-0000-000000000001',
        'transferId',
        current_setting('poseidon.test.transfer_id')
      )
    )
  $sql$,
  'insufficient funds'
);

reset role;

select ok(
  (
    select t.status = 'ACTIVO'
    from public.transfers t
    where t.receipt = 'TRX-VALID-1'
  )
  and (
    select count(*)
    from public.account_movements am
    where am.reversal_of is not null
      and am.source_id = (
        select t.id::text
        from public.transfers t
        where t.receipt = 'TRX-VALID-1'
      )
  ) = 0
  and not exists (
    select 1
    from public.command_requests cr
    where cr.idempotency_key = 'cash-transfer-annul-no-funds-1'
  )
  and private.account_balance('55000000-0000-0000-0000-000000000001') = 800
  and private.account_balance('55000000-0000-0000-0000-000000000002') = 150,
  'unfunded transfer reversal is atomic and cannot make Caja bank negative'
);

insert into public.account_movements (
  id,
  legacy_id,
  account_id,
  local_id,
  source_type,
  source_id,
  direction,
  concept,
  amount,
  detail,
  actor_id,
  actor_legacy_id
) values (
  '75000000-0000-0000-0000-000000000006',
  'cash-movement-bank-spend-counterpart',
  '55000000-0000-0000-0000-000000000002',
  '25000000-0000-0000-0000-000000000001',
  'AJUSTE',
  'cash-movement-bank-spend-counterpart',
  'ENTRADA',
  'AJUSTE_TECNICO',
  150,
  'Contrapartida bancaria para habilitar el reverso',
  '15000000-0000-0000-0000-000000000004',
  'admin-movements'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select is(
  (
    public.poseidon_annul_transfer(
      'cash-transfer-annul-valid-0001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'transferId',
        current_setting('poseidon.test.transfer_id'),
        'balanceId',
        'cash-movement-balance-open'
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'cashier annuls the transfer after the bank reversal is funded'
);

reset role;

select ok(
  (
    select t.status = 'ANULADO'
    from public.transfers t
    where t.receipt = 'TRX-VALID-1'
  )
  and (
    select count(*)
    from public.account_movements original
    join public.account_movements reversal
      on reversal.reversal_of = original.id
    where original.source_type = 'TRANSFERENCIA'
      and original.source_id = (
        select t.id::text
        from public.transfers t
        where t.receipt = 'TRX-VALID-1'
      )
      and original.status = 'ACTIVO'
      and original.reversal_of is null
      and reversal.status = 'ACTIVO'
      and reversal.direction = case
        when original.direction = 'ENTRADA'
          then 'SALIDA'::public.account_movement_direction
        else 'ENTRADA'::public.account_movement_direction
      end
      and reversal.amount = original.amount
  ) = 3,
  'transfer annulment keeps three active originals and appends three linked opposites'
);

select is(
  pg_catalog.jsonb_build_array(
    private.account_balance('55000000-0000-0000-0000-000000000001'),
    private.account_balance('55000000-0000-0000-0000-000000000002'),
    private.account_balance('55000000-0000-0000-0000-000000000003')
  ),
  '[1000,100,0]'::jsonb,
  'funded transfer annulment restores cash, bank and informational balances'
);

select ok(
  exists (
    select 1
    from public.audit_events ae
    join public.command_requests cr on cr.id = ae.command_request_id
    where cr.command_name = 'annul_transfer'
      and cr.idempotency_key = 'cash-transfer-annul-valid-0001'
      and ae.action = 'Anular transferencia'
      and ae.actor_id = '15000000-0000-0000-0000-000000000001'
      and ae.actual_role = 'CAJERO'
      and ae.requested_function = 'CAJERO'
      and ae.reason = 'Anulacion operativa'
      and ae.previous_value ->> 'status' = 'ACTIVO'
      and ae.new_value ->> 'status' = 'ANULADO'
  ),
  'transfer annulment audits authenticated identity, state transition and reason'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);

select is(
  public.poseidon_annul_transfer(
    'cash-transfer-annul-valid-0001',
    'CAJERO',
    '25000000-0000-0000-0000-000000000001',
    pg_catalog.jsonb_build_object(
      'balanceId',
      'cash-movement-balance-open',
      'transferId',
      current_setting('poseidon.test.transfer_id')
    )
  ),
  (
    select cr.response_payload
    from public.command_requests cr
    where cr.command_name = 'annul_transfer'
      and cr.idempotency_key = 'cash-transfer-annul-valid-0001'
  ),
  'exact transfer-annulment replay returns the stored response'
);

reset role;

select ok(
  (
    select count(*)
    from public.account_movements am
    where am.reversal_of is not null
      and am.source_id = (
        select t.id::text
        from public.transfers t
        where t.receipt = 'TRX-VALID-1'
      )
  ) = 3
  and (
    select count(*)
    from public.command_requests cr
    where cr.command_name = 'annul_transfer'
      and cr.idempotency_key = 'cash-transfer-annul-valid-0001'
  ) = 1,
  'transfer-annulment replay does not duplicate reversals or command completion'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select is(
  (
    public.poseidon_create_gift(
      'cash-gift-valid-00000000001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"cash-movement-balance-open",
        "clientIds":[
          "35000000-0000-0000-0000-000000000001",
          "cash-movement-client-2",
          "35000000-0000-0000-0000-000000000001"
        ],
        "reference":"REG-VALID-1",
        "description":"Atencion comercial",
        "amount":150
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'cashier creates a cash gift with active local clients'
);

reset role;

select set_config(
  'poseidon.test.gift_id',
  (
    select g.id::text
    from public.gifts g
    where g.reference = 'REG-VALID-1'
  ),
  true
);

select ok(
  exists (
    select 1
    from public.gifts g
    where g.balance_id = '65000000-0000-0000-0000-000000000001'
      and g.local_id = '25000000-0000-0000-0000-000000000001'
      and g.primary_client_id = '35000000-0000-0000-0000-000000000001'
      and g.type = 'EFECTIVO'
      and g.cash_amount = 150
      and g.credit_amount = 0
      and g.reference = 'REG-VALID-1'
      and g.description = 'Atencion comercial'
      and g.status = 'ACTIVO'
      and g.created_by = '15000000-0000-0000-0000-000000000001'
      and g.created_by_legacy_id = 'cashier-movements'
  ),
  'gift stores active balance, local, primary client, cash amount and real actor'
);

select is(
  (
    select count(*)::integer
    from public.gift_clients gc
    join public.gifts g on g.id = gc.gift_id
    where g.reference = 'REG-VALID-1'
      and gc.local_id = g.local_id
      and gc.client_id in (
        '35000000-0000-0000-0000-000000000001',
        '35000000-0000-0000-0000-000000000002'
      )
  ),
  2,
  'gift client links are local, complete and deduplicated'
);

select ok(
  exists (
    select 1
    from public.account_movements am
    join public.gifts g on g.id::text = am.source_id
    where g.reference = 'REG-VALID-1'
      and am.account_id = '55000000-0000-0000-0000-000000000001'
      and am.local_id = g.local_id
      and am.balance_id = g.balance_id
      and am.source_type = 'REGALO'
      and am.direction = 'SALIDA'
      and am.amount = g.cash_amount
      and am.actor_id = g.created_by
      and am.reversal_of is null
  ),
  'gift appends one scoped Caja / Efectivo outflow'
);

select is(
  pg_catalog.jsonb_build_array(
    private.account_balance('55000000-0000-0000-0000-000000000001'),
    private.account_balance('55000000-0000-0000-0000-000000000002'),
    private.account_balance('55000000-0000-0000-0000-000000000003')
  ),
  '[850,100,0]'::jsonb,
  'gift reduces Caja / Efectivo without changing bank or transfer balances'
);

select is(
  (
    select -coalesce(pg_catalog.sum(g.cash_amount + g.credit_amount), 0)
    from public.gifts g
    where g.status = 'ACTIVO'
  ),
  (-150)::numeric,
  'active gift reduces economic result by its full amount'
);

select ok(
  exists (
    select 1
    from public.audit_events ae
    join public.command_requests cr on cr.id = ae.command_request_id
    join public.audit_event_locals ael on ael.audit_event_id = ae.id
    where cr.command_name = 'create_gift'
      and cr.idempotency_key = 'cash-gift-valid-00000000001'
      and ae.action = 'Crear regalo'
      and ae.entity_type = 'Regalo'
      and ae.actor_id = '15000000-0000-0000-0000-000000000001'
      and ae.actual_role = 'CAJERO'
      and ae.requested_function = 'CAJERO'
      and ae.primary_local_id = '25000000-0000-0000-0000-000000000001'
      and ael.local_id = ae.primary_local_id
      and pg_catalog.jsonb_array_length(ae.new_value -> 'client_ids') = 2
  ),
  'gift audit preserves authenticated actor, function, local and client associations'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);

select is(
  public.poseidon_create_gift(
    'cash-gift-valid-00000000001',
    'CAJERO',
    '25000000-0000-0000-0000-000000000001',
    '{
      "amount":150,
      "description":"Atencion comercial",
      "reference":"REG-VALID-1",
      "clientIds":[
        "35000000-0000-0000-0000-000000000001",
        "cash-movement-client-2",
        "35000000-0000-0000-0000-000000000001"
      ],
      "balanceId":"cash-movement-balance-open"
    }'::jsonb
  ),
  (
    select cr.response_payload
    from public.command_requests cr
    where cr.command_name = 'create_gift'
      and cr.idempotency_key = 'cash-gift-valid-00000000001'
  ),
  'exact gift replay returns the stored response'
);

reset role;

select ok(
  (select count(*) from public.gifts where reference = 'REG-VALID-1') = 1
  and (
    select count(*)
    from public.gift_clients gc
    join public.gifts g on g.id = gc.gift_id
    where g.reference = 'REG-VALID-1'
  ) = 2
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'REGALO'
      and am.reversal_of is null
  ) = 1
  and (
    select count(*)
    from public.command_requests cr
    where cr.command_name = 'create_gift'
      and cr.idempotency_key = 'cash-gift-valid-00000000001'
  ) = 1,
  'gift replay does not duplicate entity, client links, ledger or command'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_create_gift(
      'cash-gift-valid-00000000001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"cash-movement-balance-open",
        "clientIds":[
          "35000000-0000-0000-0000-000000000001",
          "cash-movement-client-2"
        ],
        "reference":"REG-VALID-1",
        "description":"Atencion comercial",
        "amount":149
      }'::jsonb
    )
  $sql$,
  'idempotency key was already used with a different request'
);

reset role;

select ok(
  (select count(*) from public.gifts where reference = 'REG-VALID-1') = 1
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'REGALO'
  ) = 1
  and private.account_balance('55000000-0000-0000-0000-000000000001') = 850,
  'gift idempotency hash mismatch preserves entity, ledger and cash'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select is(
  (
    public.poseidon_annul_gift(
      'cash-gift-annul-valid-000001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'giftId',
        current_setting('poseidon.test.gift_id'),
        'balanceId',
        '65000000-0000-0000-0000-000000000001'
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'cashier annuls an active gift while its balance remains open'
);

reset role;

select ok(
  (
    select g.status = 'ANULADO'
    from public.gifts g
    where g.reference = 'REG-VALID-1'
  )
  and (
    select count(*)
    from public.account_movements original
    join public.account_movements reversal
      on reversal.reversal_of = original.id
    where original.source_type = 'REGALO'
      and original.source_id = (
        select g.id::text
        from public.gifts g
        where g.reference = 'REG-VALID-1'
      )
      and original.status = 'ACTIVO'
      and original.direction = 'SALIDA'
      and reversal.status = 'ACTIVO'
      and reversal.direction = 'ENTRADA'
      and reversal.amount = original.amount
  ) = 1
  and (
    select count(*)
    from public.gift_clients gc
    join public.gifts g on g.id = gc.gift_id
    where g.reference = 'REG-VALID-1'
  ) = 2,
  'gift annulment preserves entity and clients while appending one linked opposite'
);

select ok(
  private.account_balance('55000000-0000-0000-0000-000000000001') = 1000
  and (
    select -coalesce(pg_catalog.sum(g.cash_amount + g.credit_amount), 0)
    from public.gifts g
    where g.status = 'ACTIVO'
  ) = 0,
  'gift annulment restores Caja / Efectivo and removes the gift from active economic result'
);

select ok(
  exists (
    select 1
    from public.audit_events ae
    join public.command_requests cr on cr.id = ae.command_request_id
    where cr.command_name = 'annul_gift'
      and cr.idempotency_key = 'cash-gift-annul-valid-000001'
      and ae.action = 'Anular regalo'
      and ae.actor_id = '15000000-0000-0000-0000-000000000001'
      and ae.actual_role = 'CAJERO'
      and ae.requested_function = 'CAJERO'
      and ae.reason = 'Anulacion operativa antes del cierre'
      and ae.previous_value ->> 'status' = 'ACTIVO'
      and ae.new_value ->> 'status' = 'ANULADO'
      and pg_catalog.jsonb_array_length(ae.new_value -> 'client_ids') = 2
  ),
  'gift annulment audits authenticated identity, client links, transition and reason'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);

select is(
  public.poseidon_annul_gift(
    'cash-gift-annul-valid-000001',
    'CAJERO',
    '25000000-0000-0000-0000-000000000001',
    pg_catalog.jsonb_build_object(
      'balanceId',
      '65000000-0000-0000-0000-000000000001',
      'giftId',
      current_setting('poseidon.test.gift_id')
    )
  ),
  (
    select cr.response_payload
    from public.command_requests cr
    where cr.command_name = 'annul_gift'
      and cr.idempotency_key = 'cash-gift-annul-valid-000001'
  ),
  'exact gift-annulment replay returns the stored response'
);

reset role;

select ok(
  (
    select count(*)
    from public.account_movements am
    where am.reversal_of is not null
      and am.source_id = (
        select g.id::text
        from public.gifts g
        where g.reference = 'REG-VALID-1'
      )
  ) = 1
  and (
    select count(*)
    from public.command_requests cr
    where cr.command_name = 'annul_gift'
      and cr.idempotency_key = 'cash-gift-annul-valid-000001'
  ) = 1,
  'gift-annulment replay does not duplicate reversal or command completion'
);

select public.poseidon_create_transfer(
  'cash-transfer-closed-setup-001',
  'CAJERO',
  '25000000-0000-0000-0000-000000000001',
  '{
    "balanceId":"65000000-0000-0000-0000-000000000001",
    "receipt":"TRX-CLOSED",
    "name":"Cierre posterior",
    "amount":50
  }'::jsonb
);

select public.poseidon_create_gift(
  'cash-gift-closed-setup-00001',
  'CAJERO',
  '25000000-0000-0000-0000-000000000001',
  '{
    "balanceId":"65000000-0000-0000-0000-000000000001",
    "clientIds":["35000000-0000-0000-0000-000000000001"],
    "reference":"REG-CLOSED",
    "amount":25
  }'::jsonb
);

reset role;

select set_config(
  'poseidon.test.closed_transfer_id',
  (
    select t.id::text
    from public.transfers t
    where t.receipt = 'TRX-CLOSED'
  ),
  true
);

select set_config(
  'poseidon.test.closed_gift_id',
  (
    select g.id::text
    from public.gifts g
    where g.reference = 'REG-CLOSED'
  ),
  true
);

update public.cash_balances
set status = 'CERRADO'
where id = '65000000-0000-0000-0000-000000000001';

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_annul_transfer(
      'cash-transfer-closed-annul-001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        '65000000-0000-0000-0000-000000000001',
        'transferId',
        current_setting('poseidon.test.closed_transfer_id')
      )
    )
  $sql$,
  'cash transfers can only be annulled while their balance is open'
);

select throws_ok(
  $sql$
    select public.poseidon_annul_gift(
      'cash-gift-closed-annul-00001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        '65000000-0000-0000-0000-000000000001',
        'giftId',
        current_setting('poseidon.test.closed_gift_id')
      )
    )
  $sql$,
  'cash gifts can only be annulled while their balance is open'
);

reset role;

select ok(
  (
    select t.status = 'ACTIVO'
    from public.transfers t
    where t.receipt = 'TRX-CLOSED'
  )
  and (
    select g.status = 'ACTIVO'
    from public.gifts g
    where g.reference = 'REG-CLOSED'
  )
  and not exists (
    select 1
    from public.account_movements am
    where am.reversal_of is not null
      and am.source_id in (
        (select t.id::text from public.transfers t where t.receipt = 'TRX-CLOSED'),
        (select g.id::text from public.gifts g where g.reference = 'REG-CLOSED')
      )
  )
  and not exists (
    select 1
    from public.command_requests cr
    where cr.idempotency_key in (
      'cash-transfer-closed-annul-001',
      'cash-gift-closed-annul-00001'
    )
  ),
  'closed-balance annulment rejections preserve active entities and append no reversals or commands'
);

select ok(
  (select count(*) from public.command_requests) = 6
  and not exists (
    select 1
    from public.command_requests cr
    where cr.status <> 'APLICADO'
      or cr.response_payload ->> 'ok' <> 'true'
      or cr.completed_at is null
  )
  and (select count(*) from public.audit_events) = 6
  and not exists (
    select 1
    from public.command_requests cr
    left join public.audit_events ae on ae.command_request_id = cr.id
    group by cr.id
    having count(ae.id) <> 1
  ),
  'every successful command has one completed idempotency result and one audit event'
);

select ok(
  not exists (
    select 1
    from public.current_accounts ca
    where ca.kind in (
      'LOCAL_EFECTIVO',
      'LOCAL_BANCO',
      'PRINCIPAL_EFECTIVO',
      'PRINCIPAL_BANCO'
    )
      and private.account_balance(ca.id) < 0
  ),
  'all money-account balances remain nonnegative'
);

select ok(
  not exists (
    select 1
    from public.account_movements am
    where (
      exists (
        select 1
        from public.transfers t
        where am.source_id in (t.id::text, t.legacy_id)
      )
      or exists (
        select 1
        from public.gifts g
        where am.source_id in (g.id::text, g.legacy_id)
      )
    )
      and (
        am.local_id is distinct from '25000000-0000-0000-0000-000000000001'
        or am.balance_id is distinct from '65000000-0000-0000-0000-000000000001'
        or am.actor_id not in (
          '15000000-0000-0000-0000-000000000001',
          '15000000-0000-0000-0000-000000000002'
        )
      )
  ),
  'all command-created original and reversal rows preserve local, balance and real actor scope'
);

select * from finish();
rollback;
