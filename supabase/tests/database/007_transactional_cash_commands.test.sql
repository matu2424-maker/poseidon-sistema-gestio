begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(54);

select is(
  (
    select count(*)::bigint
    from (
      values
        ('public.poseidon_open_cash(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_save_readings(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_close_cash(text,public.app_role,uuid,jsonb)')
    ) target(signature)
    join pg_catalog.pg_proc p
      on p.oid = pg_catalog.to_regprocedure(target.signature)
    where p.prosecdef
      and p.provolatile = 'v'
      and p.prorettype = 'jsonb'::regtype
  ),
  3::bigint,
  'the three cash RPCs are volatile SECURITY DEFINER functions returning jsonb'
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
        ('public.poseidon_open_cash(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_save_readings(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_close_cash(text,public.app_role,uuid,jsonb)')
    ) target(signature)
  ),
  'only authenticated may execute the cash RPCs'
);

select ok(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'private.nonnegative_payload_amount(jsonb,text,text,numeric)',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'private.sync_machine_result(uuid,uuid,uuid,timestamptz)',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'private.assert_machine_result_synced(uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated cannot call private cash helpers'
);

select ok(
  pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'public.poseidon_open_cash(text,public.app_role,uuid,jsonb)'::regprocedure
    ),
    'for update'
  ) > 0
  and exists (
    select 1
    from pg_catalog.pg_indexes i
    where i.schemaname = 'public'
      and i.indexname = 'cash_balances_one_open_per_local_uq'
  ),
  'opening serializes the local and retains the one-open-balance unique guard'
);

insert into auth.users (id, email) values
  ('14000000-0000-0000-0000-000000000001', 'cashier-cash@poseidon.test'),
  ('14000000-0000-0000-0000-000000000002', 'manager-cash@poseidon.test'),
  ('14000000-0000-0000-0000-000000000003', 'outsider-cash@poseidon.test'),
  ('14000000-0000-0000-0000-000000000004', 'admin-cash@poseidon.test');

insert into public.profiles (
  id,
  legacy_id,
  username,
  display_name,
  role,
  status
) values
  (
    '14000000-0000-0000-0000-000000000001',
    'cashier-cash',
    'cashier-cash',
    'Cajero Caja',
    'CAJERO',
    'ACTIVO'
  ),
  (
    '14000000-0000-0000-0000-000000000002',
    'manager-cash',
    'manager-cash',
    'Encargado Caja',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '14000000-0000-0000-0000-000000000003',
    'outsider-cash',
    'outsider-cash',
    'Encargado Ajeno Caja',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '14000000-0000-0000-0000-000000000004',
    'admin-cash',
    'admin-cash',
    'Administrador Caja',
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
    '24000000-0000-0000-0000-000000000001',
    'cash-local-1',
    '41',
    'Poseidon Caja',
    true
  ),
  (
    '24000000-0000-0000-0000-000000000002',
    'cash-local-2',
    '42',
    'Local Caja Ajeno',
    false
  );

insert into public.user_locals (user_id, local_id) values
  (
    '14000000-0000-0000-0000-000000000001',
    '24000000-0000-0000-0000-000000000001'
  ),
  (
    '14000000-0000-0000-0000-000000000002',
    '24000000-0000-0000-0000-000000000001'
  ),
  (
    '14000000-0000-0000-0000-000000000003',
    '24000000-0000-0000-0000-000000000002'
  );

insert into public.current_accounts (
  id,
  legacy_id,
  kind,
  local_id,
  partner,
  name
) values
  (
    '54000000-0000-0000-0000-000000000001',
    'cash-local-cash',
    'LOCAL_EFECTIVO',
    '24000000-0000-0000-0000-000000000001',
    null,
    'Poseidon Caja / Efectivo'
  ),
  (
    '54000000-0000-0000-0000-000000000002',
    'cash-local-bank',
    'LOCAL_BANCO',
    '24000000-0000-0000-0000-000000000001',
    null,
    'Poseidon Caja / Banco'
  ),
  (
    '54000000-0000-0000-0000-000000000003',
    'cash-principal-cash',
    'PRINCIPAL_EFECTIVO',
    null,
    null,
    'Principal Caja / Efectivo'
  ),
  (
    '54000000-0000-0000-0000-000000000004',
    'cash-principal-bank',
    'PRINCIPAL_BANCO',
    null,
    null,
    'Principal Caja / Banco'
  ),
  (
    '54000000-0000-0000-0000-000000000005',
    'cash-partner-mathias',
    'SOCIO',
    null,
    'MATHIAS',
    'Socio Caja / Mathias'
  ),
  (
    '54000000-0000-0000-0000-000000000006',
    'cash-partner-ricardo',
    'SOCIO',
    null,
    'RICARDO',
    'Socio Caja / Ricardo'
  );

insert into public.machines (
  id,
  legacy_id,
  visible_id,
  name,
  current_location_kind,
  current_local_id,
  location_label,
  last_in,
  last_out,
  status
) values
  (
    '34000000-0000-0000-0000-000000000001',
    'cash-machine-active',
    '401',
    'Maquina Caja Activa',
    'LOCAL',
    '24000000-0000-0000-0000-000000000001',
    'Poseidon Caja',
    100,
    50,
    'ACTIVA'
  ),
  (
    '34000000-0000-0000-0000-000000000002',
    'cash-machine-maintenance',
    '402',
    'Maquina Caja Mantenimiento',
    'LOCAL',
    '24000000-0000-0000-0000-000000000001',
    'Poseidon Caja',
    20,
    10,
    'MANTENIMIENTO'
  ),
  (
    '34000000-0000-0000-0000-000000000003',
    'cash-machine-disuse',
    '403',
    'Maquina Caja Desuso',
    'TALLER',
    null,
    'Taller',
    0,
    0,
    'DESUSO'
  );

select set_config(
  'request.jwt.claim.sub',
  '14000000-0000-0000-0000-000000000001',
  true
);

select is(
  (public.poseidon_session_context() ->> 'schema_version')::integer,
  3,
  'session context advertises remote schema 3'
);

select set_config(
  'request.jwt.claim.sub',
  '14000000-0000-0000-0000-000000000002',
  true
);

select throws_ok(
  $$
    select public.poseidon_open_cash(
      'cash-open-manager-function-0001',
      'ENCARGADO',
      '24000000-0000-0000-0000-000000000001',
      '{
        "operatingDate":"2026-07-26",
        "initialFund":1000,
        "initialBankFund":500,
        "initialNote":"",
        "openingCapitalPerson":"MATHIAS",
        "firstOpening":true
      }'::jsonb
    )
  $$,
  'cash opening requires the cashier function'
);

select set_config(
  'request.jwt.claim.sub',
  '14000000-0000-0000-0000-000000000003',
  true
);

select throws_ok(
  $$
    select public.poseidon_open_cash(
      'cash-open-outsider-0000000001',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      '{
        "operatingDate":"2026-07-26",
        "initialFund":1000,
        "initialBankFund":500,
        "initialNote":"",
        "openingCapitalPerson":"MATHIAS",
        "firstOpening":true
      }'::jsonb
    )
  $$,
  'authenticated user is not assigned to the local'
);

select set_config(
  'request.jwt.claim.sub',
  '14000000-0000-0000-0000-000000000001',
  true
);

select is(
  (
    public.poseidon_open_cash(
      'cash-open-first-00000000001',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      '{
        "operatingDate":"2026-07-26",
        "initialFund":1000,
        "initialBankFund":500,
        "initialNote":"Inicio controlado",
        "openingCapitalPerson":"MATHIAS",
        "firstOpening":true
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'first opening succeeds'
);

select is(
  (
    select count(*)::integer
    from public.cash_balances cb
    where cb.local_id = '24000000-0000-0000-0000-000000000001'
      and cb.status = 'EN_PROCESO'
  ),
  1,
  'first opening creates one open balance'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      cb.initial_cash,
      cb.initial_bank,
      cb.opened_by,
      cb.opened_by_role,
      cb.visible_id
    )
    from public.cash_balances cb
    where cb.local_id = '24000000-0000-0000-0000-000000000001'
      and cb.status = 'EN_PROCESO'
  ),
  '[
    1000,
    500,
    "14000000-0000-0000-0000-000000000001",
    "CAJERO",
    "POSE-1"
  ]'::jsonb,
  'opening stores amounts, real actor role and visible sequence'
);

select is(
  (
    select count(*)::integer
    from public.machine_readings mr
    join public.cash_balances cb on cb.id = mr.balance_id
    where cb.local_id = '24000000-0000-0000-0000-000000000001'
      and cb.status = 'EN_PROCESO'
  ),
  2,
  'opening creates readings only for active and maintenance machines'
);

select is(
  (
    select pg_catalog.jsonb_build_object(
      'PENDIENTE',
      count(*) filter (where mr.status = 'PENDIENTE'),
      'FUERA_DE_SERVICIO',
      count(*) filter (where mr.status = 'FUERA_DE_SERVICIO')
    )
    from public.machine_readings mr
    join public.cash_balances cb on cb.id = mr.balance_id
    where cb.local_id = '24000000-0000-0000-0000-000000000001'
      and cb.status = 'EN_PROCESO'
  ),
  '{"PENDIENTE":1,"FUERA_DE_SERVICIO":1}'::jsonb,
  'opening derives reading status from machine status'
);

select is(
  (
    select count(*)::integer
    from public.partner_movements pm
    where pm.local_id = '24000000-0000-0000-0000-000000000001'
      and pm.balance_id = (
        select cb.id
        from public.cash_balances cb
        where cb.status = 'EN_PROCESO'
          and cb.local_id = '24000000-0000-0000-0000-000000000001'
      )
  ),
  2,
  'first opening records one partner contribution per funded medium'
);

select is(
  (
    select count(*)::integer
    from public.treasury_transfers tt
    where tt.local_id = '24000000-0000-0000-0000-000000000001'
      and tt.timing = 'APERTURA'
  ),
  2,
  'first opening records one Principal to Caja transfer per funded medium'
);

select is(
  pg_catalog.jsonb_build_array(
    private.account_balance('54000000-0000-0000-0000-000000000001'),
    private.account_balance('54000000-0000-0000-0000-000000000002')
  ),
  '[1000,500]'::jsonb,
  'first opening funds both Caja accounts'
);

select is(
  pg_catalog.jsonb_build_array(
    private.account_balance('54000000-0000-0000-0000-000000000003'),
    private.account_balance('54000000-0000-0000-0000-000000000004')
  ),
  '[0,0]'::jsonb,
  'partner funding and opening transfers leave Principal at zero'
);

select is(
  private.account_balance('54000000-0000-0000-0000-000000000005'),
  1500::numeric,
  'first opening records the real partner contribution'
);

select is(
  (
    select count(*)::integer
    from public.audit_events ae
    where ae.action = 'Abrir caja'
      and ae.actor_id = '14000000-0000-0000-0000-000000000001'
  ),
  1,
  'opening is audited with the authenticated actor'
);

select is(
  public.poseidon_open_cash(
    'cash-open-first-00000000001',
    'CAJERO',
    '24000000-0000-0000-0000-000000000001',
    '{
      "operatingDate":"2026-07-26",
      "initialFund":1000,
      "initialBankFund":500,
      "initialNote":"Inicio controlado",
      "openingCapitalPerson":"MATHIAS",
      "firstOpening":true
    }'::jsonb
  ),
  (
    select cr.response_payload
    from public.command_requests cr
    where cr.command_name = 'open_cash'
      and cr.idempotency_key = 'cash-open-first-00000000001'
  ),
  'exact opening replay returns the stored response'
);

select is(
  (
    select count(*)::integer
    from public.command_requests cr
    where cr.command_name = 'open_cash'
      and cr.idempotency_key = 'cash-open-first-00000000001'
  ),
  1,
  'opening replay does not duplicate its command claim'
);

select throws_ok(
  $$
    select public.poseidon_open_cash(
      'cash-open-second-while-open-01',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      '{
        "operatingDate":"2026-07-27",
        "initialFund":1000,
        "initialBankFund":500,
        "initialNote":"",
        "openingCapitalPerson":"MATHIAS",
        "firstOpening":false
      }'::jsonb
    )
  $$,
  'an open cash balance already exists for the local'
);

select is(
  (
    public.poseidon_save_readings(
      'cash-readings-first-00000001',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        (
          select cb.id
          from public.cash_balances cb
          where cb.status = 'EN_PROCESO'
            and cb.local_id = '24000000-0000-0000-0000-000000000001'
        ),
        'updates',
        pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'readingId',
            (
              select mr.id
              from public.machine_readings mr
              where mr.machine_id = '34000000-0000-0000-0000-000000000001'
                and mr.balance_id = (
                  select cb.id
                  from public.cash_balances cb
                  where cb.status = 'EN_PROCESO'
                    and cb.local_id = '24000000-0000-0000-0000-000000000001'
                )
            ),
            'inActual',
            120,
            'outActual',
            55,
            'status',
            'CARGADA',
            'observation',
            ''
          )
        )
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'reading batch succeeds'
);

select is(
  (
    select pg_catalog.jsonb_build_array(mr.result, mr.status)
    from public.machine_readings mr
    where mr.machine_id = '34000000-0000-0000-0000-000000000001'
      and mr.balance_id = (
        select cb.id
        from public.cash_balances cb
        where cb.status = 'EN_PROCESO'
          and cb.local_id = '24000000-0000-0000-0000-000000000001'
      )
  ),
  '[15,"CARGADA"]'::jsonb,
  'reading stores the calculated result'
);

select is(
  (
    select coalesce(
      sum(case when am.direction = 'ENTRADA' then am.amount else -am.amount end),
      0
    )
    from public.account_movements am
    where am.source_type = 'RESULTADO_MAQUINAS'
      and am.balance_id = (
        select cb.id
        from public.cash_balances cb
        where cb.status = 'EN_PROCESO'
          and cb.local_id = '24000000-0000-0000-0000-000000000001'
      )
  ),
  15::numeric,
  'reading result is appended to Caja / Efectivo'
);

select is(
  private.account_balance('54000000-0000-0000-0000-000000000001'),
  1015::numeric,
  'positive machine result increases Caja / Efectivo'
);

select is(
  (
    select count(*)::integer
    from public.audit_events ae
    where ae.action = 'Guardar contadores'
  ),
  1,
  'reading batch creates one command audit event'
);

select is(
  (
    public.poseidon_save_readings(
      'cash-readings-first-00000001',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        (
          select cb.id
          from public.cash_balances cb
          where cb.status = 'EN_PROCESO'
            and cb.local_id = '24000000-0000-0000-0000-000000000001'
        ),
        'updates',
        pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'readingId',
            (
              select mr.id
              from public.machine_readings mr
              where mr.machine_id = '34000000-0000-0000-0000-000000000001'
                and mr.balance_id = (
                  select cb.id
                  from public.cash_balances cb
                  where cb.status = 'EN_PROCESO'
                    and cb.local_id = '24000000-0000-0000-0000-000000000001'
                )
            ),
            'inActual',
            120,
            'outActual',
            55,
            'status',
            'CARGADA',
            'observation',
            ''
          )
        )
      )
    ) ->> 'revision'
  ),
  (
    select cr.id::text
    from public.command_requests cr
    where cr.command_name = 'save_readings'
      and cr.idempotency_key = 'cash-readings-first-00000001'
  ),
  'reading replay returns the original revision'
);

select is(
  (
    select count(*)::integer
    from public.account_movements am
    where am.source_type = 'RESULTADO_MAQUINAS'
  ),
  1,
  'reading replay does not duplicate result movements'
);

select throws_ok(
  $$
    select public.poseidon_save_readings(
      'cash-readings-atomic-reject-01',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        (
          select cb.id
          from public.cash_balances cb
          where cb.status = 'EN_PROCESO'
            and cb.local_id = '24000000-0000-0000-0000-000000000001'
        ),
        'updates',
        pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'readingId',
            (
              select mr.id
              from public.machine_readings mr
              where mr.machine_id = '34000000-0000-0000-0000-000000000002'
                and mr.balance_id = (
                  select cb.id
                  from public.cash_balances cb
                  where cb.status = 'EN_PROCESO'
                    and cb.local_id = '24000000-0000-0000-0000-000000000001'
                )
            ),
            'inActual',
            25,
            'outActual',
            12,
            'status',
            'CARGADA'
          ),
          pg_catalog.jsonb_build_object(
            'readingId',
            (
              select mr.id
              from public.machine_readings mr
              where mr.machine_id = '34000000-0000-0000-0000-000000000001'
                and mr.balance_id = (
                  select cb.id
                  from public.cash_balances cb
                  where cb.status = 'EN_PROCESO'
                    and cb.local_id = '24000000-0000-0000-0000-000000000001'
                )
            ),
            'inActual',
            99
          )
        )
      )
    )
  $$,
  'inActual cannot be lower than inPrevious'
);

select is(
  (
    select mr.status::text
    from public.machine_readings mr
    where mr.machine_id = '34000000-0000-0000-0000-000000000002'
      and mr.balance_id = (
        select cb.id
        from public.cash_balances cb
        where cb.status = 'EN_PROCESO'
          and cb.local_id = '24000000-0000-0000-0000-000000000001'
      )
  ),
  'FUERA_DE_SERVICIO',
  'atomic rejection preserves the earlier valid row'
);

select is(
  private.account_balance('54000000-0000-0000-0000-000000000001'),
  1015::numeric,
  'atomic rejection preserves Caja / Efectivo'
);

select is(
  (
    public.poseidon_save_readings(
      'cash-readings-second-0000001',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        (
          select cb.id
          from public.cash_balances cb
          where cb.status = 'EN_PROCESO'
            and cb.local_id = '24000000-0000-0000-0000-000000000001'
        ),
        'updates',
        pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'readingId',
            (
              select mr.id
              from public.machine_readings mr
              where mr.machine_id = '34000000-0000-0000-0000-000000000001'
                and mr.balance_id = (
                  select cb.id
                  from public.cash_balances cb
                  where cb.status = 'EN_PROCESO'
                    and cb.local_id = '24000000-0000-0000-0000-000000000001'
                )
            ),
            'inActual',
            130,
            'outActual',
            60,
            'status',
            'CARGADA'
          )
        )
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'a later reading replaces the economic target through an append-only delta'
);

select is(
  private.account_balance('54000000-0000-0000-0000-000000000001'),
  1020::numeric,
  'machine-result delta keeps Caja / Efectivo synchronized'
);

select throws_ok(
  $$
    select public.poseidon_close_cash(
      'cash-close-note-required-001',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        (
          select cb.id
          from public.cash_balances cb
          where cb.status = 'EN_PROCESO'
            and cb.local_id = '24000000-0000-0000-0000-000000000001'
        ),
        'declaredCash',
        890,
        'declaredBank',
        455,
        'transferToPrincipalCash',
        120,
        'transferToPrincipalBank',
        50,
        'differenceNote',
        ''
      )
    )
  $$,
  'cash differences require an observation'
);

select is(
  (
    select cb.status::text
    from public.cash_balances cb
    where cb.local_id = '24000000-0000-0000-0000-000000000001'
      and cb.status = 'EN_PROCESO'
  ),
  'EN_PROCESO',
  'rejected close leaves the balance open'
);

select set_config(
  'request.jwt.claim.sub',
  '14000000-0000-0000-0000-000000000002',
  true
);

select throws_ok(
  $$
    select public.poseidon_close_cash(
      'cash-close-manager-function-01',
      'ENCARGADO',
      '24000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        (
          select cb.id
          from public.cash_balances cb
          where cb.status = 'EN_PROCESO'
            and cb.local_id = '24000000-0000-0000-0000-000000000001'
        ),
        'declaredCash',
        1020,
        'declaredBank',
        500
      )
    )
  $$,
  'cash closing requires the cashier function'
);

select set_config(
  'request.jwt.claim.sub',
  '14000000-0000-0000-0000-000000000001',
  true
);

select is(
  (
    public.poseidon_close_cash(
      'cash-close-success-000000001',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        (
          select cb.id
          from public.cash_balances cb
          where cb.status = 'EN_PROCESO'
            and cb.local_id = '24000000-0000-0000-0000-000000000001'
        ),
        'declaredCash',
        890,
        'declaredBank',
        455,
        'transferToPrincipalCash',
        120,
        'transferToPrincipalBank',
        50,
        'differenceNote',
        'Control de faltante y sobrante'
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'reconciled close succeeds'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      cb.status,
      cb.declared_cash,
      cb.declared_bank,
      cb.cash_difference,
      cb.bank_difference,
      cb.difference_status
    )
    from public.cash_balances cb
    where cb.visible_id = 'POSE-1'
  ),
  '["CERRADO",890,455,-10,5,"PENDIENTE"]'::jsonb,
  'close stores the immutable control snapshot and pending differences'
);

select is(
  pg_catalog.jsonb_build_array(
    private.account_balance('54000000-0000-0000-0000-000000000001'),
    private.account_balance('54000000-0000-0000-0000-000000000002'),
    private.account_balance('54000000-0000-0000-0000-000000000003'),
    private.account_balance('54000000-0000-0000-0000-000000000004')
  ),
  '[890,455,120,50]'::jsonb,
  'close leaves declared Caja balances and transfers the requested amounts to Principal'
);

select is(
  (
    select count(*)::integer
    from public.account_movements am
    where am.source_type = 'DIFERENCIA_CAJA'
      and am.balance_id = (
        select cb.id from public.cash_balances cb where cb.visible_id = 'POSE-1'
      )
  ),
  2,
  'cash and bank differences are explicit ledger movements'
);

select is(
  (
    select count(*)::integer
    from public.treasury_transfers tt
    where tt.timing = 'CIERRE'
      and tt.balance_id = (
        select cb.id from public.cash_balances cb where cb.visible_id = 'POSE-1'
      )
  ),
  2,
  'close records one final transfer per nonzero medium'
);

select is(
  (
    select pg_catalog.jsonb_build_array(m.last_in, m.last_out)
    from public.machines m
    where m.id = '34000000-0000-0000-0000-000000000001'
  ),
  '[130,60]'::jsonb,
  'close advances machine counters from loaded readings'
);

select is(
  (
    select count(*)::integer
    from public.machine_history mh
    where mh.machine_id = '34000000-0000-0000-0000-000000000001'
      and mh.action = 'CONTADORES'
  ),
  1,
  'close appends machine history'
);

select is(
  (
    select count(*)::integer
    from public.audit_events ae
    where ae.action = 'Cerrar caja'
      and ae.entity_id = (
        select cb.id::text from public.cash_balances cb where cb.visible_id = 'POSE-1'
      )
  ),
  1,
  'close is audited once'
);

select is(
  public.poseidon_close_cash(
    'cash-close-success-000000001',
    'CAJERO',
    '24000000-0000-0000-0000-000000000001',
    pg_catalog.jsonb_build_object(
      'balanceId',
      (select cb.id from public.cash_balances cb where cb.visible_id = 'POSE-1'),
      'declaredCash',
      890,
      'declaredBank',
      455,
      'transferToPrincipalCash',
      120,
      'transferToPrincipalBank',
      50,
      'differenceNote',
      'Control de faltante y sobrante'
    )
  ),
  (
    select cr.response_payload
    from public.command_requests cr
    where cr.command_name = 'close_cash'
      and cr.idempotency_key = 'cash-close-success-000000001'
  ),
  'exact close replay returns the stored response'
);

select throws_ok(
  $$
    select public.poseidon_open_cash(
      'cash-reopen-wrong-inheritance-1',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      '{
        "operatingDate":"2026-07-27",
        "initialFund":891,
        "initialBankFund":455,
        "initialNote":"",
        "openingCapitalPerson":"MATHIAS",
        "firstOpening":false
      }'::jsonb
    )
  $$,
  'cash reopening must inherit the exact Caja balances'
);

select is(
  (
    public.poseidon_open_cash(
      'cash-reopen-success-00000001',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      '{
        "operatingDate":"2026-07-27",
        "initialFund":890,
        "initialBankFund":455,
        "initialNote":"",
        "openingCapitalPerson":"MATHIAS",
        "firstOpening":false
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'reopening inherits the exact current Caja balances'
);

select is(
  (
    select count(*)::integer
    from public.cash_balances cb
    where cb.local_id = '24000000-0000-0000-0000-000000000001'
      and cb.status = 'EN_PROCESO'
  ),
  1,
  'reopening still leaves exactly one open balance'
);

select public.poseidon_save_readings(
  'cash-readings-resolve-reopen-01',
  'CAJERO',
  '24000000-0000-0000-0000-000000000001',
  pg_catalog.jsonb_build_object(
    'balanceId',
    (
      select cb.id
      from public.cash_balances cb
      where cb.status = 'EN_PROCESO'
        and cb.local_id = '24000000-0000-0000-0000-000000000001'
    ),
    'updates',
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'readingId',
        (
          select mr.id
          from public.machine_readings mr
          where mr.machine_id = '34000000-0000-0000-0000-000000000001'
            and mr.balance_id = (
              select cb.id
              from public.cash_balances cb
              where cb.status = 'EN_PROCESO'
                and cb.local_id = '24000000-0000-0000-0000-000000000001'
            )
        ),
        'status',
        'SIN_LECTURA',
        'observation',
        'Lectura omitida para aislar la prueba de conciliacion'
      )
    )
  )
);

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
  detail,
  actor_id,
  actor_legacy_id
) values (
  '74000000-0000-0000-0000-000000000001',
  'cash-rogue-ledger-entry',
  '54000000-0000-0000-0000-000000000001',
  '24000000-0000-0000-0000-000000000001',
  null,
  'AJUSTE',
  'cash-rogue-entry',
  'ENTRADA',
  'AJUSTE_TECNICO',
  1,
  'Movimiento no asociado para probar divergencia',
  '14000000-0000-0000-0000-000000000004',
  'admin-cash'
);

select throws_ok(
  $$
    select public.poseidon_close_cash(
      'cash-close-divergent-ledger-001',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        (
          select cb.id
          from public.cash_balances cb
          where cb.status = 'EN_PROCESO'
            and cb.local_id = '24000000-0000-0000-0000-000000000001'
        ),
        'declaredCash',
        890,
        'declaredBank',
        455
      )
    )
  $$,
  'cash balance and account ledger are not reconciled'
);

select is(
  (
    select cb.status::text
    from public.cash_balances cb
    where cb.status = 'EN_PROCESO'
      and cb.local_id = '24000000-0000-0000-0000-000000000001'
  ),
  'EN_PROCESO',
  'divergence rejection leaves the reopened balance untouched'
);

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
  detail,
  actor_id,
  actor_legacy_id
) values (
  '74000000-0000-0000-0000-000000000002',
  'cash-rogue-ledger-reversal',
  '54000000-0000-0000-0000-000000000001',
  '24000000-0000-0000-0000-000000000001',
  null,
  'AJUSTE',
  'cash-rogue-reversal',
  'SALIDA',
  'AJUSTE_TECNICO',
  1,
  'Contrapartida de prueba para restaurar conciliacion',
  '14000000-0000-0000-0000-000000000004',
  'admin-cash'
);

select is(
  (
    public.poseidon_save_readings(
      'cash-readings-negative-0000001',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        (
          select cb.id
          from public.cash_balances cb
          where cb.status = 'EN_PROCESO'
            and cb.local_id = '24000000-0000-0000-0000-000000000001'
        ),
        'updates',
        pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object(
            'readingId',
            (
              select mr.id
              from public.machine_readings mr
              where mr.machine_id = '34000000-0000-0000-0000-000000000001'
                and mr.balance_id = (
                  select cb.id
                  from public.cash_balances cb
                  where cb.status = 'EN_PROCESO'
                    and cb.local_id = '24000000-0000-0000-0000-000000000001'
                )
            ),
            'inActual',
            130,
            'outActual',
            1000,
            'status',
            'CARGADA'
          )
        )
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'a real negative machine result is recorded'
);

select is(
  private.account_balance('54000000-0000-0000-0000-000000000001'),
  (-50)::numeric,
  'negative machine result may expose a real negative Caja / Efectivo'
);

select throws_ok(
  $$
    select public.poseidon_close_cash(
      'cash-close-negative-expected-01',
      'CAJERO',
      '24000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'balanceId',
        (
          select cb.id
          from public.cash_balances cb
          where cb.status = 'EN_PROCESO'
            and cb.local_id = '24000000-0000-0000-0000-000000000001'
        ),
        'declaredCash',
        0,
        'declaredBank',
        455
      )
    )
  $$,
  'cash closing is blocked because expected cash is negative'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      cb.status,
      cb.closed_at,
      cb.cash_difference,
      (
        select count(*)
        from public.account_movements am
        where am.balance_id = cb.id
          and am.source_type = 'DIFERENCIA_CAJA'
      )
    )
    from public.cash_balances cb
    where cb.status = 'EN_PROCESO'
      and cb.local_id = '24000000-0000-0000-0000-000000000001'
  ),
  '["EN_PROCESO",null,null,0]'::jsonb,
  'negative close rejection creates no close, difference or automatic repair'
);

select * from finish();
rollback;
