begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(77);

select is(
  (
    select pg_catalog.count(*)::bigint
    from (
      values
        ('public.poseidon_save_salary_settlement(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_salary_settlement(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_close_salary_period(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_start_salary_correction(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_close_salary_correction(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_cancel_salary_correction(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_manage_difference(text,public.app_role,uuid,jsonb)')
    ) target(signature)
    join pg_catalog.pg_proc procedure
      on procedure.oid = pg_catalog.to_regprocedure(target.signature)
    where procedure.prosecdef
      and procedure.provolatile = 'v'
      and procedure.prorettype = 'jsonb'::regtype
  ),
  7::bigint,
  'the seven salary and difference RPCs are volatile SECURITY DEFINER functions returning jsonb'
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
        ('public.poseidon_save_salary_settlement(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_salary_settlement(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_close_salary_period(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_start_salary_correction(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_close_salary_correction(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_cancel_salary_correction(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_manage_difference(text,public.app_role,uuid,jsonb)')
    ) target(signature)
  ),
  'only authenticated may execute the salary and difference RPCs'
);

select ok(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'private.lock_salary_periods(date[])',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'private.salary_period_employee_rows(date)',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'private.append_difference_adjustment(uuid,uuid,uuid,uuid,text,public.account_movement_direction,text,numeric,text,uuid,timestamptz)',
    'EXECUTE'
  ),
  'authenticated cannot call private salary or difference helpers'
);

select ok(
  (
    select pg_catalog.bool_and(
      procedure.proconfig @> array['search_path=""']::text[]
    )
    from (
      values
        ('public.poseidon_save_salary_settlement(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_salary_settlement(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_close_salary_period(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_start_salary_correction(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_close_salary_correction(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_cancel_salary_correction(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_manage_difference(text,public.app_role,uuid,jsonb)')
    ) target(signature)
    join pg_catalog.pg_proc procedure
      on procedure.oid = pg_catalog.to_regprocedure(target.signature)
  ),
  'all seven RPCs pin an empty search_path'
);

select ok(
  pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'public.poseidon_save_salary_settlement(text,public.app_role,uuid,jsonb)'::regprocedure
    ),
    'lock_salary_periods'
  ) > 0
  and pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'public.poseidon_manage_difference(text,public.app_role,uuid,jsonb)'::regprocedure
    ),
    'for update'
  ) > 0,
  'salary periods and managed balances are serialized inside their transactions'
);

insert into auth.users (id, email) values
  ('15000000-0000-0000-0000-000000000001', 'salary-cashier@poseidon.test'),
  ('15000000-0000-0000-0000-000000000002', 'salary-manager@poseidon.test'),
  ('15000000-0000-0000-0000-000000000003', 'salary-outsider@poseidon.test'),
  ('15000000-0000-0000-0000-000000000004', 'salary-admin@poseidon.test');

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
    'salary-cashier',
    'salary-cashier',
    'Cajero Salarios',
    'CAJERO',
    'ACTIVO'
  ),
  (
    '15000000-0000-0000-0000-000000000002',
    'salary-manager',
    'salary-manager',
    'Encargado Salarios',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '15000000-0000-0000-0000-000000000003',
    'salary-outsider',
    'salary-outsider',
    'Encargado Ajeno Salarios',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '15000000-0000-0000-0000-000000000004',
    'salary-admin',
    'salary-admin',
    'Administrador Salarios',
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
    'salary-local-1',
    '51',
    'Poseidon Salarios',
    true
  ),
  (
    '25000000-0000-0000-0000-000000000002',
    'salary-local-2',
    '52',
    'Local Salarios Ajeno',
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

insert into public.staff (
  id,
  legacy_id,
  visible_id,
  local_id,
  first_name,
  last_name,
  document_id,
  hire_date,
  position,
  salary_type,
  nominal_salary,
  status
) values
  (
    '35000000-0000-0000-0000-000000000001',
    'salary-staff-1',
    '501',
    '25000000-0000-0000-0000-000000000001',
    'Ana',
    'Salario',
    'SALARY-DOC-1',
    '2026-01-01',
    'CAJERO_A',
    'MENSUAL',
    2500,
    'ACTIVO'
  ),
  (
    '35000000-0000-0000-0000-000000000002',
    'salary-staff-2',
    '502',
    '25000000-0000-0000-0000-000000000002',
    'Bruno',
    'Otro Local',
    'SALARY-DOC-2',
    '2026-09-01',
    'LIMPIEZA',
    'MENSUAL',
    1800,
    'ACTIVO'
  );

insert into public.salary_history (
  id,
  legacy_id,
  staff_id,
  local_id,
  staff_name_snapshot,
  previous_salary_type,
  new_salary_type,
  previous_nominal_salary,
  new_nominal_salary,
  effective_date,
  reason,
  changed_by,
  changed_by_legacy_id,
  changed_by_name_snapshot
) values (
  '75000000-0000-0000-0000-000000000001',
  'salary-history-1',
  '35000000-0000-0000-0000-000000000001',
  '25000000-0000-0000-0000-000000000001',
  'Ana Salario',
  'MENSUAL',
  'MENSUAL',
  2500,
  3000,
  '2026-07-01',
  'Ajuste efectivo julio',
  '15000000-0000-0000-0000-000000000004',
  'salary-admin',
  'Administrador Salarios'
);

insert into public.current_accounts (
  id,
  legacy_id,
  kind,
  local_id,
  staff_id,
  partner,
  name
) values
  (
    '55000000-0000-0000-0000-000000000001',
    'salary-local-1-cash',
    'LOCAL_EFECTIVO',
    '25000000-0000-0000-0000-000000000001',
    null,
    null,
    'Poseidon Salarios / Efectivo'
  ),
  (
    '55000000-0000-0000-0000-000000000002',
    'salary-local-1-bank',
    'LOCAL_BANCO',
    '25000000-0000-0000-0000-000000000001',
    null,
    null,
    'Poseidon Salarios / Banco'
  ),
  (
    '55000000-0000-0000-0000-000000000003',
    'salary-local-2-cash',
    'LOCAL_EFECTIVO',
    '25000000-0000-0000-0000-000000000002',
    null,
    null,
    'Local Salarios Ajeno / Efectivo'
  ),
  (
    '55000000-0000-0000-0000-000000000004',
    'salary-local-2-bank',
    'LOCAL_BANCO',
    '25000000-0000-0000-0000-000000000002',
    null,
    null,
    'Local Salarios Ajeno / Banco'
  ),
  (
    '55000000-0000-0000-0000-000000000005',
    'salary-principal-cash',
    'PRINCIPAL_EFECTIVO',
    null,
    null,
    null,
    'Principal Salarios / Efectivo'
  ),
  (
    '55000000-0000-0000-0000-000000000006',
    'salary-principal-bank',
    'PRINCIPAL_BANCO',
    null,
    null,
    null,
    'Principal Salarios / Banco'
  ),
  (
    '55000000-0000-0000-0000-000000000007',
    'salary-staff-account-1',
    'PERSONAL',
    '25000000-0000-0000-0000-000000000001',
    '35000000-0000-0000-0000-000000000001',
    null,
    'Cuenta Ana Salario'
  ),
  (
    '55000000-0000-0000-0000-000000000008',
    'salary-staff-account-2',
    'PERSONAL',
    '25000000-0000-0000-0000-000000000002',
    '35000000-0000-0000-0000-000000000002',
    null,
    'Cuenta Bruno Otro Local'
  );

insert into public.cash_balances (
  id,
  legacy_id,
  visible_id,
  local_id,
  operating_date,
  status,
  initial_cash,
  initial_bank,
  opened_by,
  opened_by_legacy_id,
  opened_by_role,
  opened_at,
  closed_by,
  closed_by_legacy_id,
  closed_by_role,
  closed_at,
  declared_cash,
  declared_bank,
  next_cash_base,
  next_bank_base,
  cash_difference,
  bank_difference,
  difference_note,
  difference_status
) values
  (
    '65000000-0000-0000-0000-000000000001',
    'salary-difference-target',
    'POSE-SAL-1',
    '25000000-0000-0000-0000-000000000001',
    '2026-06-30',
    'CERRADO',
    2000,
    500,
    '15000000-0000-0000-0000-000000000001',
    'salary-cashier',
    'CAJERO',
    '2026-06-30 12:00:00+00',
    '15000000-0000-0000-0000-000000000001',
    'salary-cashier',
    'CAJERO',
    '2026-06-30 20:00:00+00',
    2100,
    450,
    2100,
    450,
    100,
    -50,
    'Diferencia historica',
    'PENDIENTE'
  ),
  (
    '65000000-0000-0000-0000-000000000002',
    'salary-later-closed',
    'POSE-SAL-2',
    '25000000-0000-0000-0000-000000000001',
    '2026-07-05',
    'CERRADO',
    2100,
    450,
    '15000000-0000-0000-0000-000000000001',
    'salary-cashier',
    'CAJERO',
    '2026-07-05 12:00:00+00',
    '15000000-0000-0000-0000-000000000001',
    'salary-cashier',
    'CAJERO',
    '2026-07-05 20:00:00+00',
    2100,
    450,
    2100,
    450,
    0,
    0,
    '',
    null
  ),
  (
    '65000000-0000-0000-0000-000000000003',
    'salary-open-balance',
    'POSE-SAL-3',
    '25000000-0000-0000-0000-000000000001',
    '2026-08-05',
    'EN_PROCESO',
    5100,
    1950,
    '15000000-0000-0000-0000-000000000001',
    'salary-cashier',
    'CAJERO',
    '2026-08-05 12:00:00+00',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    '',
    null
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
  actor_legacy_id,
  created_at
) values
  (
    '85000000-0000-0000-0000-000000000001',
    'salary-seed-local-cash',
    '55000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000001',
    null,
    'MIGRACION',
    'salary-seed-local-cash',
    'ENTRADA',
    'SALDO_INICIAL',
    5000,
    'Fondo local salarios',
    '15000000-0000-0000-0000-000000000004',
    'salary-admin',
    '2026-06-01 10:00:00+00'
  ),
  (
    '85000000-0000-0000-0000-000000000002',
    'salary-seed-local-bank',
    '55000000-0000-0000-0000-000000000002',
    '25000000-0000-0000-0000-000000000001',
    null,
    'MIGRACION',
    'salary-seed-local-bank',
    'ENTRADA',
    'SALDO_INICIAL',
    2000,
    'Fondo banco salarios',
    '15000000-0000-0000-0000-000000000004',
    'salary-admin',
    '2026-06-01 10:00:00+00'
  ),
  (
    '85000000-0000-0000-0000-000000000003',
    'salary-seed-local-2-cash',
    '55000000-0000-0000-0000-000000000003',
    '25000000-0000-0000-0000-000000000002',
    null,
    'MIGRACION',
    'salary-seed-local-2-cash',
    'ENTRADA',
    'SALDO_INICIAL',
    1000,
    'Fondo local ajeno',
    '15000000-0000-0000-0000-000000000004',
    'salary-admin',
    '2026-06-01 10:00:00+00'
  ),
  (
    '85000000-0000-0000-0000-000000000004',
    'salary-seed-local-2-bank',
    '55000000-0000-0000-0000-000000000004',
    '25000000-0000-0000-0000-000000000002',
    null,
    'MIGRACION',
    'salary-seed-local-2-bank',
    'ENTRADA',
    'SALDO_INICIAL',
    1000,
    'Fondo banco ajeno',
    '15000000-0000-0000-0000-000000000004',
    'salary-admin',
    '2026-06-01 10:00:00+00'
  ),
  (
    '85000000-0000-0000-0000-000000000005',
    'salary-seed-principal-cash',
    '55000000-0000-0000-0000-000000000005',
    '25000000-0000-0000-0000-000000000001',
    null,
    'MIGRACION',
    'salary-seed-principal-cash',
    'ENTRADA',
    'SALDO_INICIAL',
    10000,
    'Fondo Principal efectivo',
    '15000000-0000-0000-0000-000000000004',
    'salary-admin',
    '2026-06-01 10:00:00+00'
  ),
  (
    '85000000-0000-0000-0000-000000000006',
    'salary-seed-principal-bank',
    '55000000-0000-0000-0000-000000000006',
    '25000000-0000-0000-0000-000000000001',
    null,
    'MIGRACION',
    'salary-seed-principal-bank',
    'ENTRADA',
    'SALDO_INICIAL',
    5000,
    'Fondo Principal banco',
    '15000000-0000-0000-0000-000000000004',
    'salary-admin',
    '2026-06-01 10:00:00+00'
  ),
  (
    '85000000-0000-0000-0000-000000000007',
    'salary-original-difference-cash',
    '55000000-0000-0000-0000-000000000001',
    '25000000-0000-0000-0000-000000000001',
    '65000000-0000-0000-0000-000000000001',
    'DIFERENCIA_CAJA',
    '65000000-0000-0000-0000-000000000001-EFECTIVO',
    'ENTRADA',
    'DIFERENCIA_EFECTIVO',
    100,
    'Diferencia efectivo original',
    '15000000-0000-0000-0000-000000000001',
    'salary-cashier',
    '2026-06-30 20:00:00+00'
  ),
  (
    '85000000-0000-0000-0000-000000000008',
    'salary-original-difference-bank',
    '55000000-0000-0000-0000-000000000002',
    '25000000-0000-0000-0000-000000000001',
    '65000000-0000-0000-0000-000000000001',
    'DIFERENCIA_CAJA',
    '65000000-0000-0000-0000-000000000001-BANCO',
    'SALIDA',
    'DIFERENCIA_BANCO',
    50,
    'Diferencia banco original',
    '15000000-0000-0000-0000-000000000001',
    'salary-cashier',
    '2026-06-30 20:00:00+00'
  );

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000003',
  true
);

select throws_ok(
  $$
    select public.poseidon_save_salary_settlement(
      'salary-outsider-save-000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-07",
        "concept":"SALARIO",
        "amount":1000,
        "origin":"LIQUIDACION"
      }'::jsonb
    )
  $$,
  'authenticated user is not assigned to the local'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);

select throws_ok(
  $$
    select public.poseidon_save_salary_settlement(
      'salary-cashier-principal-0001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-07",
        "concept":"SALARIO",
        "amount":1000,
        "origin":"LIQUIDACION"
      }'::jsonb
    )
  $$,
  'requested function is not allowed for the authenticated role'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000002',
  true
);

select is(
  (
    public.poseidon_save_salary_settlement(
      'salary-create-base-00000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-07",
        "concept":"SALARIO",
        "amount":1000,
        "notes":"Salario julio",
        "origin":"LIQUIDACION",
        "paymentAccountId":"salary-principal-cash"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'manager creates a Principal salary payment'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      ss.period_month,
      ss.origin,
      ss.balance_id,
      ca.kind,
      ss.total_to_pay,
      ss.concept
    )
    from public.salary_settlements ss
    join public.current_accounts ca on ca.id = ss.payment_account_id
    where ss.notes = 'Salario julio'
  ),
  '["2026-07-01","LIQUIDACION",null,"PRINCIPAL_EFECTIVO",1000,"SALARIO"]'::jsonb,
  'Principal salary stores period, origin, account and canonical concept'
);

select is(
  private.account_balance('55000000-0000-0000-0000-000000000005'),
  9000::numeric,
  'Principal cash decreases by the salary payment'
);

select is(
  private.account_balance('55000000-0000-0000-0000-000000000007'),
  -1000::numeric,
  'the employee account records the salary payment'
);

select is(
  (
    public.poseidon_save_salary_settlement(
      'salary-create-base-00000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-07",
        "concept":"SALARIO",
        "amount":1000,
        "notes":"Salario julio",
        "origin":"LIQUIDACION",
        "paymentAccountId":"salary-principal-cash"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'salary creation is idempotent'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from public.salary_settlements ss
    where ss.notes = 'Salario julio'
  ),
  1,
  'idempotent salary replay does not duplicate the settlement'
);

select throws_ok(
  $$
    select public.poseidon_save_salary_settlement(
      'salary-create-base-00000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-07",
        "concept":"SALARIO",
        "amount":1001,
        "notes":"Salario julio",
        "origin":"LIQUIDACION",
        "paymentAccountId":"salary-principal-cash"
      }'::jsonb
    )
  $$,
  'idempotency key was already used with a different request'
);

select throws_ok(
  $$
    select public.poseidon_save_salary_settlement(
      'salary-limit-base-00000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-07",
        "concept":"SALARIO",
        "amount":2500,
        "origin":"LIQUIDACION",
        "paymentAccountId":"salary-principal-cash"
      }'::jsonb
    )
  $$,
  'accumulated salary payments cannot exceed effective base salary'
);

select is(
  (
    public.poseidon_save_salary_settlement(
      'salary-create-advance-000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-07",
        "concept":"ADELANTO",
        "amount":1000,
        "notes":"Adelanto julio",
        "origin":"LIQUIDACION",
        "paymentAccountId":"salary-principal-cash"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'manager creates an advance within the effective base'
);

select is(
  (
    public.poseidon_save_salary_settlement(
      'salary-create-discount-00001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-07",
        "concept":"DESCUENTO",
        "amount":500,
        "notes":"Descuento julio",
        "origin":"LIQUIDACION",
        "paymentAccountId":"salary-principal-cash"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'discount covers base without delivering money'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from public.account_movements am
    join public.salary_settlements ss
      on ss.id::text = am.source_id
    where ss.notes = 'Descuento julio'
      and am.source_type = 'SUELDO'
  ),
  1,
  'discount creates only the employee-account movement'
);

select is(
  private.account_balance('55000000-0000-0000-0000-000000000005'),
  8000::numeric,
  'discount does not change Principal funds'
);

select is(
  (
    public.poseidon_save_salary_settlement(
      'salary-create-extra-bank-0001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-07",
        "concept":"EXTRA",
        "amount":400,
        "notes":"Premio banco julio",
        "origin":"LIQUIDACION",
        "paymentAccountId":"salary-principal-bank"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'manager pays an extra from Principal bank'
);

select is(
  private.account_balance('55000000-0000-0000-0000-000000000006'),
  4600::numeric,
  'Principal bank decreases by the selected payment account'
);

select is(
  (
    public.poseidon_save_salary_settlement(
      'salary-correct-advance-00001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'settlementId',
        (
          select ss.legacy_id
          from public.salary_settlements ss
          where ss.notes = 'Adelanto julio'
            and ss.status = 'CONFIRMADA'
        ),
        'staffId',
        'salary-staff-1',
        'period',
        '2026-07',
        'concept',
        'ADELANTO',
        'amount',
        1300,
        'notes',
        'Adelanto julio corregido',
        'origin',
        'LIQUIDACION',
        'paymentAccountId',
        'salary-principal-cash'
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'same-account correction validates only the net increase'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      pg_catalog.count(*) filter (where ss.status = 'ANULADA'),
      pg_catalog.count(*) filter (
        where ss.status = 'CONFIRMADA'
          and ss.replaces_settlement_id is not null
      )
    )
    from public.salary_settlements ss
    where ss.notes in ('Adelanto julio', 'Adelanto julio corregido')
  ),
  '[1,1]'::jsonb,
  'correction preserves the original and links its replacement'
);

select is(
  private.account_balance('55000000-0000-0000-0000-000000000005'),
  7700::numeric,
  'same-account correction consumes only the 300 net increase'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from public.account_movements reversal
    join public.account_movements original
      on original.id = reversal.reversal_of
    join public.salary_settlements ss
      on ss.id::text = original.source_id
    where ss.notes = 'Adelanto julio'
  ),
  2,
  'salary correction appends reversals for employee and payer legs'
);

select is(
  (
    select s.salary_advance_balance
    from public.staff s
    where s.id = '35000000-0000-0000-0000-000000000001'
  ),
  1300::numeric,
  'staff advance balance follows the active replacement'
);

select is(
  (
    public.poseidon_annul_salary_settlement(
      'salary-annul-advance-000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'settlementId',
        (
          select ss.legacy_id
          from public.salary_settlements ss
          where ss.notes = 'Adelanto julio corregido'
            and ss.status = 'CONFIRMADA'
        ),
        'reason',
        'Adelanto no correspondia'
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'manager annuls the active Principal advance'
);

select is(
  (
    select s.salary_advance_balance
    from public.staff s
    where s.id = '35000000-0000-0000-0000-000000000001'
  ),
  0::numeric,
  'annulment recomputes the active advance balance'
);

select is(
  private.account_balance('55000000-0000-0000-0000-000000000005'),
  9000::numeric,
  'annulment restores Principal cash through append-only reversals'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);

select is(
  (
    public.poseidon_save_salary_settlement(
      'salary-caja-payment-0000001',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-08",
        "concept":"ADELANTO",
        "amount":500,
        "notes":"Adelanto desde Caja",
        "origin":"CAJA",
        "balanceId":"salary-open-balance"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'cashier creates a Caja salary payment'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      ss.origin,
      ss.balance_id,
      ca.kind
    )
    from public.salary_settlements ss
    join public.current_accounts ca on ca.id = ss.payment_account_id
    where ss.notes = 'Adelanto desde Caja'
  ),
  '["CAJA","65000000-0000-0000-0000-000000000003","LOCAL_EFECTIVO"]'::jsonb,
  'Caja salary is bound to the active local balance and cash account'
);

select is(
  private.account_balance('55000000-0000-0000-0000-000000000001'),
  4600::numeric,
  'Caja salary decreases Local / Efectivo while staying reconciled'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000002',
  true
);

select throws_ok(
  $$
    select public.poseidon_annul_salary_settlement(
      'salary-manager-annul-caja-01',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      jsonb_build_object(
        'settlementId',
        (
          select ss.legacy_id
          from public.salary_settlements ss
          where ss.notes = 'Adelanto desde Caja'
        ),
        'reason',
        'Intento administrativo'
      )
    )
  $$,
  'Caja salary annulments require the cashier function'
);

select throws_ok(
  $$
    select public.poseidon_close_salary_period(
      'salary-close-open-cash-0001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{"period":"2026-08"}'::jsonb
    )
  $$,
  'salary period has payments linked to an open cash balance'
);

select throws_ok(
  $$
    select public.poseidon_manage_difference(
      'difference-open-block-000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"salary-difference-target",
        "status":"VERIFICADA",
        "reviewNote":"Debe bloquear"
      }'::jsonb
    )
  $$,
  'cash differences cannot be managed while the local has an open balance'
);

update public.cash_balances cb
set
  status = 'CERRADO',
  closed_by = '15000000-0000-0000-0000-000000000001',
  closed_by_legacy_id = 'salary-cashier',
  closed_by_role = 'CAJERO',
  closed_at = '2026-08-05 20:00:00+00'
where cb.id = '65000000-0000-0000-0000-000000000003';

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);

select throws_ok(
  $$
    select public.poseidon_annul_salary_settlement(
      'salary-cashier-annul-closed1',
      'CAJERO',
      '25000000-0000-0000-0000-000000000001',
      jsonb_build_object(
        'settlementId',
        (
          select ss.legacy_id
          from public.salary_settlements ss
          where ss.notes = 'Adelanto desde Caja'
        ),
        'reason',
        'Caja ya cerrada'
      )
    )
  $$,
  'Caja salary payments can only be annulled while their balance is open'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000002',
  true
);

select is(
  (
    public.poseidon_close_salary_period(
      'salary-close-july-000000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{"period":"2026-07","note":"Cierre julio"}'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'manager closes the salary period after all linked cash balances are closed'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      sc.kind,
      sc.revision,
      sc.status,
      sc.employee_count,
      sc.total_base,
      sc.total_extras,
      sc.total_deductions,
      sc.total_salary_paid,
      sc.total_pending
    )
    from public.salary_closures sc
    where sc.period_month = '2026-07-01'
      and sc.revision = 0
  ),
  '["ORDINARIO",0,"CERRADO",1,3000,400,500,1000,1500]'::jsonb,
  'ordinary closure freezes effective base and salary totals'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      snapshot.base_salary,
      snapshot.salary_paid,
      snapshot.advances,
      snapshot.extra_amount,
      snapshot.deductions,
      snapshot.base_covered_amount,
      snapshot.liquidated_amount,
      snapshot.pending_amount,
      snapshot.settlement_count
    )
    from public.salary_closure_employee_snapshots snapshot
    join public.salary_closures closure
      on closure.id = snapshot.closure_id
    where closure.period_month = '2026-07-01'
      and closure.revision = 0
      and snapshot.staff_id = '35000000-0000-0000-0000-000000000001'
  ),
  '[3000,1000,0,400,500,1500,1400,1500,3]'::jsonb,
  'employee snapshot freezes covered, delivered and pending amounts'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from public.salary_closure_settlement_snapshots settlement_snapshot
    join public.salary_closures closure
      on closure.id = settlement_snapshot.closure_id
    where closure.period_month = '2026-07-01'
      and closure.revision = 0
  ),
  3,
  'ordinary closure snapshots only active salary settlements'
);

select throws_ok(
  $$
    update public.salary_closures
    set note = 'No se puede reescribir'
    where period_month = '2026-07-01'
      and revision = 0
  $$,
  'closed salary snapshots are immutable'
);

select throws_ok(
  $$
    select public.poseidon_save_salary_settlement(
      'salary-closed-ordinary-save01',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "staffId":"salary-staff-1",
        "period":"2026-07",
        "concept":"EXTRA",
        "amount":50,
        "origin":"LIQUIDACION",
        "paymentAccountId":"salary-principal-cash"
      }'::jsonb
    )
  $$,
  'salary period 2026-07 is closed by LS-1'
);

select throws_ok(
  $$
    select public.poseidon_start_salary_correction(
      'salary-correction-no-note-001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      jsonb_build_object(
        'parentClosureId',
        (
          select sc.legacy_id
          from public.salary_closures sc
          where sc.period_month = '2026-07-01'
            and sc.revision = 0
        ),
        'note',
        ''
      )
    )
  $$,
  'salary correction reason is required'
);

select is(
  (
    public.poseidon_start_salary_correction(
      'salary-start-correction-0001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'parentClosureId',
        (
          select sc.legacy_id
          from public.salary_closures sc
          where sc.period_month = '2026-07-01'
            and sc.revision = 0
        ),
        'note',
        'Premio omitido'
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'manager starts a correction from the latest immutable closure'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      correction.kind,
      correction.revision,
      correction.status,
      correction.parent_closure_id = parent.id
    )
    from public.salary_closures correction
    join public.salary_closures parent
      on parent.id = correction.parent_closure_id
    where correction.period_month = '2026-07-01'
      and correction.revision = 1
  ),
  '["CORRECTIVO",1,"CORRECCION_ABIERTA",true]'::jsonb,
  'open correction is linked as revision one'
);

select throws_ok(
  $$
    select public.poseidon_close_salary_correction(
      'salary-close-empty-correction1',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      jsonb_build_object(
        'correctionClosureId',
        (
          select sc.legacy_id
          from public.salary_closures sc
          where sc.period_month = '2026-07-01'
            and sc.revision = 1
        )
      )
    )
  $$,
  'salary correction requires at least one linked change'
);

select is(
  (
    public.poseidon_save_salary_settlement(
      'salary-correction-extra-00001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'staffId',
        'salary-staff-1',
        'period',
        '2026-07',
        'concept',
        'EXTRA',
        'amount',
        200,
        'notes',
        'Premio correctivo',
        'origin',
        'LIQUIDACION',
        'paymentAccountId',
        'salary-principal-cash',
        'correctionClosureId',
        (
          select sc.legacy_id
          from public.salary_closures sc
          where sc.period_month = '2026-07-01'
            and sc.revision = 1
        )
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'linked correction settlement is accepted for the closed period'
);

select is(
  (
    public.poseidon_close_salary_correction(
      'salary-finish-correction-0001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'correctionClosureId',
        (
          select sc.legacy_id
          from public.salary_closures sc
          where sc.period_month = '2026-07-01'
            and sc.revision = 1
        )
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'manager closes a correction with linked changes'
);

select is(
  (
    select snapshot.extra_amount
    from public.salary_closure_employee_snapshots snapshot
    join public.salary_closures closure
      on closure.id = snapshot.closure_id
    where closure.period_month = '2026-07-01'
      and closure.revision = 1
      and snapshot.staff_id = '35000000-0000-0000-0000-000000000001'
  ),
  600::numeric,
  'corrective snapshot includes the linked extra'
);

select is(
  (
    select snapshot.extra_amount
    from public.salary_closure_employee_snapshots snapshot
    join public.salary_closures closure
      on closure.id = snapshot.closure_id
    where closure.period_month = '2026-07-01'
      and closure.revision = 0
      and snapshot.staff_id = '35000000-0000-0000-0000-000000000001'
  ),
  400::numeric,
  'ordinary snapshot remains unchanged after correction'
);

select throws_ok(
  $$
    update public.salary_closures
    set note = 'Tampoco se reescribe R1'
    where period_month = '2026-07-01'
      and revision = 1
  $$,
  'closed salary snapshots are immutable'
);

select throws_ok(
  $$
    select public.poseidon_start_salary_correction(
      'salary-start-old-parent-0001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      jsonb_build_object(
        'parentClosureId',
        (
          select sc.legacy_id
          from public.salary_closures sc
          where sc.period_month = '2026-07-01'
            and sc.revision = 0
        ),
        'note',
        'Padre desactualizado'
      )
    )
  $$,
  'salary correction must start from latest closure LS-2'
);

select is(
  (
    public.poseidon_start_salary_correction(
      'salary-start-correction-r2-01',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'parentClosureId',
        (
          select sc.legacy_id
          from public.salary_closures sc
          where sc.period_month = '2026-07-01'
            and sc.revision = 1
        ),
        'note',
        'Revision abierta por error'
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'manager starts revision two from the latest closure'
);

select is(
  (
    public.poseidon_cancel_salary_correction(
      'salary-cancel-correction-r2-1',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'correctionClosureId',
        (
          select sc.legacy_id
          from public.salary_closures sc
          where sc.period_month = '2026-07-01'
            and sc.revision = 2
        )
      )
    ) ->> 'ok'
  )::boolean,
  true,
  'empty salary correction can be cancelled'
);

select is(
  (
    select pg_catalog.jsonb_build_array(sc.revision, sc.status)
    from public.salary_closures sc
    where sc.period_month = '2026-07-01'
      and sc.revision = 2
  ),
  '[2,"ANULADO"]'::jsonb,
  'cancelled correction remains as an audited revision row'
);

insert into public.cash_balances (
  id,
  legacy_id,
  visible_id,
  local_id,
  operating_date,
  status,
  initial_cash,
  initial_bank,
  opened_by,
  opened_by_legacy_id,
  opened_by_role,
  opened_at
) values (
  '65000000-0000-0000-0000-000000000004',
  'salary-open-other-local',
  'POSE-SAL-4',
  '25000000-0000-0000-0000-000000000002',
  '2026-08-06',
  'EN_PROCESO',
  1000,
  1000,
  '15000000-0000-0000-0000-000000000003',
  'salary-outsider',
  'CAJERO',
  '2026-08-06 12:00:00+00'
);

select is(
  (
    public.poseidon_manage_difference(
      'difference-verify-000000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"salary-difference-target",
        "status":"VERIFICADA",
        "reviewNote":"Diferencia confirmada"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'an open balance in another local does not block difference verification'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from public.account_movements am
    where am.balance_id = '65000000-0000-0000-0000-000000000001'
      and am.source_type = 'DIFERENCIA_CAJA'
  ),
  2,
  'verification preserves the original difference ledger'
);

select throws_ok(
  $$
    select public.poseidon_manage_difference(
      'difference-repeat-verify-0001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"salary-difference-target",
        "status":"VERIFICADA",
        "reviewNote":"Repetida"
      }'::jsonb
    )
  $$,
  'difference cannot change from VERIFICADA to VERIFICADA'
);

select is(
  (
    public.poseidon_manage_difference(
      'difference-correct-first-0001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"salary-difference-target",
        "status":"CORREGIDA",
        "reviewNote":"Declaracion corregida",
        "correctedCash":2200,
        "correctedBank":500
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'difference correction appends the required cash and bank deltas'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      cb.difference_status,
      cb.declared_cash,
      cb.declared_bank,
      cb.cash_difference,
      cb.bank_difference
    )
    from public.cash_balances cb
    where cb.id = '65000000-0000-0000-0000-000000000001'
  ),
  '["CORREGIDA",2200,500,200,0]'::jsonb,
  'corrected difference stores declared values and recalculated differences'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from public.account_movements am
    where am.balance_id = '65000000-0000-0000-0000-000000000001'
      and am.source_type = 'DIFERENCIA_CAJA'
      and am.previous_adjustment_id is not null
  ),
  2,
  'first correction chains one append-only delta per changed medium'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      private.account_balance('55000000-0000-0000-0000-000000000001'),
      private.account_balance('55000000-0000-0000-0000-000000000002')
    )
  ),
  '[4700,2000]'::jsonb,
  'difference deltas move Caja accounts without an economic movement'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      cb.status,
      cb.declared_cash,
      cb.declared_bank,
      cb.row_version
    )
    from public.cash_balances cb
    where cb.id = '65000000-0000-0000-0000-000000000002'
  ),
  '["CERRADO",2100,450,1]'::jsonb,
  'historical correction does not rewrite a later closed balance'
);

select is(
  (
    public.poseidon_manage_difference(
      'difference-correct-second-001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"salary-difference-target",
        "status":"CORREGIDA",
        "reviewNote":"Segunda correccion",
        "correctedCash":2150,
        "correctedBank":500
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'CORREGIDA may transition to a second chained correction'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      pg_catalog.count(*),
      pg_catalog.count(distinct am.id),
      pg_catalog.count(am.previous_adjustment_id)
    )
    from public.account_movements am
    where am.balance_id = '65000000-0000-0000-0000-000000000001'
      and am.account_id = '55000000-0000-0000-0000-000000000001'
      and am.source_type = 'DIFERENCIA_CAJA'
  ),
  '[3,3,2]'::jsonb,
  'second cash correction extends one unique adjustment chain'
);

select is(
  (
    public.poseidon_manage_difference(
      'difference-annul-0000000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"salary-difference-target",
        "status":"ANULADA",
        "reviewNote":"Diferencia anulada"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'difference annulment appends the opposite active delta'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      cb.difference_status,
      cb.declared_cash,
      cb.declared_bank,
      cb.next_cash_base,
      cb.next_bank_base,
      cb.cash_difference,
      cb.bank_difference
    )
    from public.cash_balances cb
    where cb.id = '65000000-0000-0000-0000-000000000001'
  ),
  '["ANULADA",2000,500,2000,500,0,0]'::jsonb,
  'annulment restores expected declarations and leaves zero effective difference'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      coalesce(
        pg_catalog.sum(
          case
            when am.direction = 'ENTRADA' then am.amount
            else -am.amount
          end
        ) filter (
          where am.account_id = '55000000-0000-0000-0000-000000000001'
        ),
        0
      ),
      coalesce(
        pg_catalog.sum(
          case
            when am.direction = 'ENTRADA' then am.amount
            else -am.amount
          end
        ) filter (
          where am.account_id = '55000000-0000-0000-0000-000000000002'
        ),
        0
      )
    )
    from public.account_movements am
    where am.balance_id = '65000000-0000-0000-0000-000000000001'
      and am.source_type = 'DIFERENCIA_CAJA'
  ),
  '[0,0]'::jsonb,
  'annulment leaves original and delta rows append-only with zero net impact'
);

select throws_ok(
  $$
    select public.poseidon_manage_difference(
      'difference-terminal-00000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"salary-difference-target",
        "status":"CORREGIDA",
        "reviewNote":"No permitida",
        "correctedCash":2000,
        "correctedBank":500
      }'::jsonb
    )
  $$,
  'difference cannot change from ANULADA to CORREGIDA'
);

select ok(
  exists (
    select 1
    from public.audit_events audit
    where audit.entity_type = 'DiferenciaCaja'
      and audit.entity_id = '65000000-0000-0000-0000-000000000001'
      and audit.actual_role = 'ENCARGADO'
      and audit.requested_function = 'ENCARGADO'
      and audit.new_value ? 'accountBalancesBefore'
      and audit.new_value ? 'accountBalancesAfter'
      and audit.new_value ? 'newAccountMovements'
  )
  and not exists (
    select 1
    from public.account_movements am
    where am.balance_id = '65000000-0000-0000-0000-000000000001'
      and am.source_type not in ('DIFERENCIA_CAJA')
  ),
  'difference audit is self-contained and creates no economic-result source'
);

select is(
  (
    public.poseidon_manage_difference(
      'difference-verify-000000001',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"salary-difference-target",
        "status":"VERIFICADA",
        "reviewNote":"Diferencia confirmada"
      }'::jsonb
    ) #>> '{value,difference_status}'
  ),
  'VERIFICADA',
  'idempotent replay returns the original difference response after later transitions'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000004',
  true
);

select is(
  (
    public.poseidon_save_salary_settlement(
      'salary-local-two-extra-00001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000002',
      '{
        "staffId":"salary-staff-2",
        "period":"2026-06",
        "concept":"EXTRA",
        "amount":100,
        "notes":"Extra otro local",
        "origin":"LIQUIDACION",
        "paymentAccountId":"salary-principal-cash"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'administrator creates a Principal settlement in another local'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000002',
  true
);

select throws_ok(
  $$
    select public.poseidon_close_salary_period(
      'salary-close-multilocal-deny1',
      'ENCARGADO',
      '25000000-0000-0000-0000-000000000001',
      '{"period":"2026-06"}'::jsonb
    )
  $$,
  'authenticated user cannot access every salary snapshot local'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000004',
  true
);

select is(
  (
    public.poseidon_close_salary_period(
      'salary-close-multilocal-admin1',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000001',
      '{"period":"2026-06","note":"Cierre multilocal"}'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'administrator closes a salary snapshot spanning every included local'
);

select is(
  (
    select pg_catalog.count(*)::integer
    from public.audit_event_locals scope
    join public.audit_events audit
      on audit.id = scope.audit_event_id
    where audit.action = 'Cerrar periodo salarial definitivo'
      and audit.reason = 'Cierre multilocal'
  ),
  2,
  'multilocal salary audit freezes both local scopes'
);

select ok(
  (
    select pg_catalog.bool_and(request.status = 'APLICADO')
    from public.command_requests request
    where request.command_name in (
      'save_salary_settlement',
      'annul_salary_settlement',
      'close_salary_period',
      'start_salary_correction',
      'close_salary_correction',
      'cancel_salary_correction',
      'manage_difference'
    )
  ),
  'successful salary and difference commands finish their idempotency claims'
);

select ok(
  not exists (
    select 1
    from public.audit_events audit
    left join public.command_requests request
      on request.id = audit.command_request_id
    where audit.entity_type in (
      'LiquidacionSalario',
      'LiquidacionSalarioCierre',
      'DiferenciaCaja'
    )
      and request.id is null
  ),
  'every salary and difference audit row is linked to its authenticated command claim'
);

select * from finish();

rollback;
