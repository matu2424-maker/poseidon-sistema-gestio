begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(32);

select is(
  (
    select count(*)::bigint
    from (
      values
        (
          'public.poseidon_create_periodic_closure(text,public.app_role,uuid,jsonb)'
        ),
        (
          'public.poseidon_annul_periodic_closure(text,public.app_role,uuid,jsonb)'
        )
    ) target(signature)
    join pg_catalog.pg_proc p
      on p.oid = pg_catalog.to_regprocedure(target.signature)
    where p.prosecdef
      and p.provolatile = 'v'
      and p.prorettype = 'jsonb'::regtype
      and p.proconfig @> array['search_path=""']::text[]
  ),
  2::bigint,
  'both periodic closure RPCs are volatile SECURITY DEFINER functions returning jsonb'
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
        (
          'public.poseidon_create_periodic_closure(text,public.app_role,uuid,jsonb)'
        ),
        (
          'public.poseidon_annul_periodic_closure(text,public.app_role,uuid,jsonb)'
        )
    ) target(signature)
  ),
  'only authenticated may execute periodic closure RPCs'
);

select ok(
  not pg_catalog.has_table_privilege(
    'authenticated',
    'public.periodic_closures',
    'INSERT,UPDATE,DELETE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'private.periodic_closure_snapshot(uuid)',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'private.guard_periodic_closure_mutation()',
    'EXECUTE'
  ),
  'authenticated cannot write snapshots or execute their private helpers'
);

select has_trigger(
  'public',
  'periodic_closures',
  'periodic_closures_guard_snapshot_update',
  'periodic closure rows have an immutable snapshot guard'
);

select ok(
  pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'public.poseidon_create_periodic_closure(text,public.app_role,uuid,jsonb)'::regprocedure
    ),
    'pg_advisory_xact_lock'
  ) > 0
  and pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'public.poseidon_create_periodic_closure(text,public.app_role,uuid,jsonb)'::regprocedure
    ),
    'for update'
  ) > 0
  and pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'public.poseidon_annul_periodic_closure(text,public.app_role,uuid,jsonb)'::regprocedure
    ),
    'for update'
  ) > 0,
  'creation serializes visible IDs and both commands lock their mutable scope'
);

insert into auth.users (id, email) values
  (
    '18000000-0000-0000-0000-000000000001',
    'cashier-periodic@poseidon.test'
  ),
  (
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic@poseidon.test'
  ),
  (
    '18000000-0000-0000-0000-000000000003',
    'outsider-periodic@poseidon.test'
  ),
  (
    '18000000-0000-0000-0000-000000000004',
    'admin-periodic@poseidon.test'
  );

insert into public.profiles (
  id,
  legacy_id,
  username,
  display_name,
  role,
  status
) values
  (
    '18000000-0000-0000-0000-000000000001',
    'cashier-periodic',
    'cashier-periodic',
    'Cajero Periodico',
    'CAJERO',
    'ACTIVO'
  ),
  (
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'manager-periodic',
    'Encargado Periodico',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '18000000-0000-0000-0000-000000000003',
    'outsider-periodic',
    'outsider-periodic',
    'Encargado Ajeno Periodico',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '18000000-0000-0000-0000-000000000004',
    'admin-periodic',
    'admin-periodic',
    'Administrador Periodico',
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
    '28000000-0000-0000-0000-000000000001',
    'periodic-local-1',
    '81',
    'Poseidon Periodico',
    true
  ),
  (
    '28000000-0000-0000-0000-000000000002',
    'periodic-local-2',
    '82',
    'Local Periodico Ajeno',
    false
  );

insert into public.user_locals (user_id, local_id) values
  (
    '18000000-0000-0000-0000-000000000001',
    '28000000-0000-0000-0000-000000000001'
  ),
  (
    '18000000-0000-0000-0000-000000000002',
    '28000000-0000-0000-0000-000000000001'
  ),
  (
    '18000000-0000-0000-0000-000000000003',
    '28000000-0000-0000-0000-000000000002'
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
  nominal_salary
) values (
  '38000000-0000-0000-0000-000000000001',
  'periodic-staff',
  '801',
  '28000000-0000-0000-0000-000000000001',
  'Persona',
  'Periodica',
  'PERIODIC-DOC-1',
  '2025-01-01',
  'ENCARGADO_A',
  'MENSUAL',
  1000
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
) values (
  '48000000-0000-0000-0000-000000000001',
  'periodic-machine',
  '802',
  'Maquina Periodica',
  'LOCAL',
  '28000000-0000-0000-0000-000000000001',
  'Poseidon Periodico',
  150,
  50,
  'ACTIVA'
);

insert into public.expense_categories (
  id,
  legacy_id,
  name
) values (
  '68000000-0000-0000-0000-000000000001',
  'periodic-category',
  'Categoria Periodica'
);

insert into public.expense_subcategories (
  id,
  legacy_id,
  category_id,
  name
) values (
  '68000000-0000-0000-0000-000000000002',
  'periodic-subcategory',
  '68000000-0000-0000-0000-000000000001',
  'Subcategoria Periodica'
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
    '58000000-0000-0000-0000-000000000001',
    'periodic-local-cash',
    'LOCAL_EFECTIVO',
    '28000000-0000-0000-0000-000000000001',
    null,
    'Poseidon Periodico / Efectivo'
  ),
  (
    '58000000-0000-0000-0000-000000000002',
    'periodic-local-bank',
    'LOCAL_BANCO',
    '28000000-0000-0000-0000-000000000001',
    null,
    'Poseidon Periodico / Banco'
  ),
  (
    '58000000-0000-0000-0000-000000000003',
    'periodic-principal-cash',
    'PRINCIPAL_EFECTIVO',
    null,
    null,
    'Principal Periodico / Efectivo'
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
  cash_difference,
  bank_difference,
  difference_status
) values
  (
    '78000000-0000-0000-0000-000000000001',
    'periodic-balance-july',
    'PERIODIC-BAL-1',
    '28000000-0000-0000-0000-000000000001',
    '2026-07-10',
    'CERRADO',
    100,
    0,
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'ENCARGADO',
    '2026-07-10T10:00:00Z',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'ENCARGADO',
    '2026-07-10T23:00:00Z',
    96,
    2,
    -3,
    2,
    'PENDIENTE'
  ),
  (
    '78000000-0000-0000-0000-000000000002',
    'periodic-balance-june',
    'PERIODIC-BAL-2',
    '28000000-0000-0000-0000-000000000001',
    '2026-06-20',
    'CERRADO',
    50,
    0,
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'ENCARGADO',
    '2026-06-20T10:00:00Z',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'ENCARGADO',
    '2026-06-20T23:00:00Z',
    50,
    0,
    0,
    0,
    null
  );

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
  updated_by,
  updated_by_legacy_id
) values (
  '88000000-0000-0000-0000-000000000001',
  'periodic-reading',
  '78000000-0000-0000-0000-000000000001',
  '28000000-0000-0000-0000-000000000001',
  '48000000-0000-0000-0000-000000000001',
  0,
  150,
  0,
  50,
  100,
  'CARGADA',
  '18000000-0000-0000-0000-000000000002',
  'manager-periodic'
);

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
  amount,
  description,
  status,
  created_by,
  created_by_legacy_id,
  created_at
) values
  (
    '98000000-0000-0000-0000-000000000001',
    'periodic-expense-cash',
    '78000000-0000-0000-0000-000000000001',
    '28000000-0000-0000-0000-000000000001',
    '58000000-0000-0000-0000-000000000001',
    '68000000-0000-0000-0000-000000000001',
    '68000000-0000-0000-0000-000000000002',
    'Categoria Periodica',
    'Subcategoria Periodica',
    30,
    'Gasto de Caja',
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-10T12:00:00Z'
  ),
  (
    '98000000-0000-0000-0000-000000000002',
    'periodic-expense-principal',
    null,
    '28000000-0000-0000-0000-000000000001',
    '58000000-0000-0000-0000-000000000003',
    '68000000-0000-0000-0000-000000000001',
    '68000000-0000-0000-0000-000000000002',
    'Categoria Periodica',
    'Subcategoria Periodica',
    40,
    'Gasto de Principal',
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-12T12:00:00Z'
  ),
  (
    '98000000-0000-0000-0000-000000000003',
    'periodic-expense-outside',
    null,
    '28000000-0000-0000-0000-000000000001',
    '58000000-0000-0000-0000-000000000003',
    '68000000-0000-0000-0000-000000000001',
    '68000000-0000-0000-0000-000000000002',
    'Categoria Periodica',
    'Subcategoria Periodica',
    500,
    'Fuera de periodo',
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-08-12T12:00:00Z'
  );

insert into public.salary_settlements (
  id,
  legacy_id,
  period_month,
  balance_id,
  staff_id,
  staff_name_snapshot,
  local_id,
  payment_account_id,
  base_salary,
  advances,
  extra_amount,
  aguinaldo,
  vacation_salary,
  other_deductions,
  total_to_pay,
  concept,
  notes,
  status,
  origin,
  created_by,
  created_by_legacy_id,
  created_by_name_snapshot,
  annulled_by,
  annulled_by_legacy_id,
  annulled_by_name_snapshot,
  annulled_at,
  created_at
) values
  (
    'c8000000-0000-0000-0000-000000000001',
    'periodic-salary-cash',
    '2026-07-01',
    '78000000-0000-0000-0000-000000000001',
    '38000000-0000-0000-0000-000000000001',
    'Persona Periodica',
    '28000000-0000-0000-0000-000000000001',
    '58000000-0000-0000-0000-000000000001',
    0,
    0,
    0,
    0,
    0,
    0,
    20,
    'SALARIO',
    'Salario Caja',
    'CONFIRMADA',
    'CAJA',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'Encargado Periodico',
    null,
    null,
    null,
    null,
    '2026-07-10T13:00:00Z'
  ),
  (
    'c8000000-0000-0000-0000-000000000002',
    'periodic-salary-monthly',
    '2026-07-01',
    null,
    '38000000-0000-0000-0000-000000000001',
    'Persona Periodica',
    '28000000-0000-0000-0000-000000000001',
    '58000000-0000-0000-0000-000000000003',
    0,
    0,
    0,
    0,
    0,
    0,
    50,
    'SALARIO',
    'Imputado por periodo',
    'CONFIRMADA',
    'LIQUIDACION',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'Encargado Periodico',
    null,
    null,
    null,
    null,
    '2026-08-05T13:00:00Z'
  ),
  (
    'c8000000-0000-0000-0000-000000000003',
    'periodic-salary-weekly',
    '2026-06-01',
    null,
    '38000000-0000-0000-0000-000000000001',
    'Persona Periodica',
    '28000000-0000-0000-0000-000000000001',
    '58000000-0000-0000-0000-000000000003',
    0,
    0,
    0,
    0,
    0,
    0,
    25,
    'SALARIO',
    'Imputado por fecha',
    'CONFIRMADA',
    'LIQUIDACION',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'Encargado Periodico',
    null,
    null,
    null,
    null,
    '2026-07-11T13:00:00Z'
  ),
  (
    'c8000000-0000-0000-0000-000000000004',
    'periodic-salary-advance',
    '2026-07-01',
    null,
    '38000000-0000-0000-0000-000000000001',
    'Persona Periodica',
    '28000000-0000-0000-0000-000000000001',
    '58000000-0000-0000-0000-000000000003',
    0,
    10,
    0,
    0,
    0,
    0,
    0,
    'ADELANTO',
    'Adelanto por periodo',
    'CONFIRMADA',
    'LIQUIDACION',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'Encargado Periodico',
    null,
    null,
    null,
    null,
    '2026-08-06T13:00:00Z'
  ),
  (
    'c8000000-0000-0000-0000-000000000005',
    'periodic-salary-discount',
    '2026-07-01',
    null,
    '38000000-0000-0000-0000-000000000001',
    'Persona Periodica',
    '28000000-0000-0000-0000-000000000001',
    '58000000-0000-0000-0000-000000000003',
    0,
    0,
    0,
    0,
    0,
    99,
    0,
    'DESCUENTO',
    'Descuento sin salida',
    'CONFIRMADA',
    'LIQUIDACION',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'Encargado Periodico',
    null,
    null,
    null,
    null,
    '2026-08-07T13:00:00Z'
  ),
  (
    'c8000000-0000-0000-0000-000000000006',
    'periodic-salary-annulled',
    '2026-07-01',
    null,
    '38000000-0000-0000-0000-000000000001',
    'Persona Periodica',
    '28000000-0000-0000-0000-000000000001',
    '58000000-0000-0000-0000-000000000003',
    0,
    0,
    0,
    0,
    0,
    0,
    500,
    'SALARIO',
    'Anulado',
    'ANULADA',
    'LIQUIDACION',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'Encargado Periodico',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    'Encargado Periodico',
    '2026-07-20T13:00:00Z',
    '2026-07-20T12:00:00Z'
  );

insert into public.transfers (
  id,
  legacy_id,
  balance_id,
  local_id,
  receipt,
  beneficiary_name,
  amount,
  destination_account,
  status,
  created_by,
  created_by_legacy_id,
  created_at
) values (
  'a8000000-0000-0000-0000-000000000001',
  'periodic-transfer',
  '78000000-0000-0000-0000-000000000001',
  '28000000-0000-0000-0000-000000000001',
  'REC-PERIODIC',
  'Beneficiario Periodico',
  7,
  'Cuenta Periodica',
  'ACTIVO',
  '18000000-0000-0000-0000-000000000002',
  'manager-periodic',
  '2026-07-10T14:00:00Z'
);

insert into public.gifts (
  id,
  legacy_id,
  balance_id,
  local_id,
  type,
  cash_amount,
  credit_amount,
  reference,
  description,
  status,
  created_by,
  created_by_legacy_id,
  created_at
) values (
  'b8000000-0000-0000-0000-000000000001',
  'periodic-gift',
  '78000000-0000-0000-0000-000000000001',
  '28000000-0000-0000-0000-000000000001',
  'MIXTO',
  10,
  5,
  'REG-PERIODIC',
  'Regalo Periodico',
  'ACTIVO',
  '18000000-0000-0000-0000-000000000002',
  'manager-periodic',
  '2026-07-10T15:00:00Z'
);

insert into public.treasury_transfers (
  id,
  legacy_id,
  balance_id,
  local_id,
  type,
  medium,
  timing,
  amount,
  status,
  created_by,
  created_by_legacy_id,
  created_at
) values
  (
    'd8000000-0000-0000-0000-000000000001',
    'periodic-treasury-linked',
    '78000000-0000-0000-0000-000000000001',
    '28000000-0000-0000-0000-000000000001',
    'RETIRO_CAJA',
    'EFECTIVO',
    'OPERATIVO',
    25,
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-10T16:00:00Z'
  ),
  (
    'd8000000-0000-0000-0000-000000000002',
    'periodic-treasury-closing',
    '78000000-0000-0000-0000-000000000001',
    '28000000-0000-0000-0000-000000000001',
    'RETIRO_CAJA',
    'EFECTIVO',
    'CIERRE',
    5,
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-10T22:00:00Z'
  ),
  (
    'd8000000-0000-0000-0000-000000000003',
    'periodic-treasury-opening',
    '78000000-0000-0000-0000-000000000001',
    '28000000-0000-0000-0000-000000000001',
    'APORTE_CAJA',
    'EFECTIVO',
    'APERTURA',
    100,
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-10T09:00:00Z'
  ),
  (
    'd8000000-0000-0000-0000-000000000004',
    'periodic-treasury-unlinked-in',
    null,
    '28000000-0000-0000-0000-000000000001',
    'APORTE_CAJA',
    'EFECTIVO',
    'OPERATIVO',
    30,
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-14T12:00:00Z'
  ),
  (
    'd8000000-0000-0000-0000-000000000005',
    'periodic-treasury-unlinked-out',
    null,
    '28000000-0000-0000-0000-000000000001',
    'RETIRO_CAJA',
    'BANCO',
    'OPERATIVO',
    40,
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-15T12:00:00Z'
  );

insert into public.capital_movements (
  id,
  legacy_id,
  balance_id,
  local_id,
  type,
  medium,
  timing,
  person,
  amount,
  note,
  status,
  created_by,
  created_by_legacy_id,
  created_at
) values
  (
    'f8000000-0000-0000-0000-000000000001',
    'periodic-legacy-withdrawal',
    '78000000-0000-0000-0000-000000000001',
    '28000000-0000-0000-0000-000000000001',
    'RETIRO',
    'EFECTIVO',
    'OPERATIVO',
    'MATHIAS',
    4,
    'Retiro legacy',
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-10T17:00:00Z'
  ),
  (
    'f8000000-0000-0000-0000-000000000002',
    'periodic-legacy-contribution',
    '78000000-0000-0000-0000-000000000001',
    '28000000-0000-0000-0000-000000000001',
    'APORTE',
    'TRANSFERENCIA',
    'OPERATIVO',
    'RICARDO',
    6,
    'Aporte legacy',
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-10T18:00:00Z'
  );

insert into public.partner_movements (
  id,
  legacy_id,
  balance_id,
  local_id,
  partner,
  type,
  medium,
  amount,
  note,
  status,
  created_by,
  created_by_legacy_id,
  created_at
) values
  (
    'e8000000-0000-0000-0000-000000000001',
    'periodic-partner-in',
    null,
    '28000000-0000-0000-0000-000000000001',
    'MATHIAS',
    'APORTE_SOCIO',
    'EFECTIVO',
    1000,
    'Aporte patrimonial',
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-16T12:00:00Z'
  ),
  (
    'e8000000-0000-0000-0000-000000000002',
    'periodic-partner-out',
    null,
    '28000000-0000-0000-0000-000000000001',
    'RICARDO',
    'RETIRO_SOCIO',
    'BANCO',
    200,
    'Retiro patrimonial',
    'ACTIVO',
    '18000000-0000-0000-0000-000000000002',
    'manager-periodic',
    '2026-07-17T12:00:00Z'
  );

select set_config(
  'request.jwt.claim.sub',
  '18000000-0000-0000-0000-000000000002',
  true
);

select is(
  (public.poseidon_session_context() ->> 'schema_version')::integer,
  4,
  'session context advertises remote schema 4'
);

select is(
  pg_catalog.jsonb_build_object(
    'profile_id',
    public.poseidon_session_context() #>> '{profile,id}',
    'role',
    public.poseidon_session_context() #>> '{profile,role}',
    'local_count',
    pg_catalog.jsonb_array_length(
      public.poseidon_session_context() -> 'locals'
    )
  ),
  '{
    "profile_id":"18000000-0000-0000-0000-000000000002",
    "role":"ENCARGADO",
    "local_count":1
  }'::jsonb,
  'schema 4 preserves the authenticated profile and authorized locals contract'
);

select set_config(
  'request.jwt.claim.sub',
  '18000000-0000-0000-0000-000000000001',
  true
);

select throws_ok(
  $$
    select public.poseidon_create_periodic_closure(
      'periodic-create-cashier-0001',
      'CAJERO',
      '28000000-0000-0000-0000-000000000001',
      '{
        "type":"MENSUAL",
        "startDate":"2026-07-01",
        "endDate":"2026-07-31",
        "note":""
      }'::jsonb
    )
  $$,
  'periodic closure creation requires a control function'
);

select set_config(
  'request.jwt.claim.sub',
  '18000000-0000-0000-0000-000000000003',
  true
);

select throws_ok(
  $$
    select public.poseidon_create_periodic_closure(
      'periodic-create-outsider-001',
      'ENCARGADO',
      '28000000-0000-0000-0000-000000000001',
      '{
        "type":"MENSUAL",
        "startDate":"2026-07-01",
        "endDate":"2026-07-31",
        "note":""
      }'::jsonb
    )
  $$,
  'authenticated user is not assigned to the local'
);

select set_config(
  'request.jwt.claim.sub',
  '18000000-0000-0000-0000-000000000002',
  true
);

select throws_ok(
  $$
    select public.poseidon_create_periodic_closure(
      'periodic-create-invalid-range',
      'ENCARGADO',
      '28000000-0000-0000-0000-000000000001',
      '{
        "type":"MENSUAL",
        "startDate":"2026-07-31",
        "endDate":"2026-07-01",
        "note":""
      }'::jsonb
    )
  $$,
  'periodic closure start date cannot be after end date'
);

select throws_ok(
  $$
    select public.poseidon_create_periodic_closure(
      'periodic-create-empty-range-01',
      'ENCARGADO',
      '28000000-0000-0000-0000-000000000001',
      '{
        "type":"MENSUAL",
        "startDate":"2026-09-01",
        "endDate":"2026-09-30",
        "note":""
      }'::jsonb
    )
  $$,
  'no closed cash balances exist in the requested period'
);

select is(
  (
    public.poseidon_create_periodic_closure(
      'periodic-create-july-0000001',
      'ENCARGADO',
      '28000000-0000-0000-0000-000000000001',
      '{
        "type":"MENSUAL",
        "startDate":"2026-07-01",
        "endDate":"2026-07-31",
        "note":"Cierre mensual de julio"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'manager creates the monthly periodic snapshot'
);

select is(
  (
    select pg_catalog.jsonb_build_object(
      'result_machines', pc.result_machines,
      'total_expenses', pc.total_expenses,
      'total_salaries', pc.total_salaries,
      'total_gifts', pc.total_gifts,
      'total_outflows', pc.total_outflows,
      'commercial_result', pc.commercial_result,
      'total_transfers', pc.total_transfers
    )
    from public.periodic_closures pc
    where pc.visible_id = 'PER-1'
  ),
  '{
    "result_machines":100,
    "total_expenses":70,
    "total_salaries":80,
    "total_gifts":15,
    "total_outflows":165,
    "commercial_result":-65,
    "total_transfers":7
  }'::jsonb,
  'economic consolidation excludes transfers and partner movements from commercial result'
);

select is(
  (
    select pg_catalog.jsonb_build_object(
      'caja_to_principal', pc.total_caja_to_principal,
      'principal_to_caja', pc.total_principal_to_caja,
      'withdrawals', pc.total_withdrawals,
      'contributions', pc.total_contributions,
      'partner_contributions', pc.total_partner_contributions,
      'partner_withdrawals', pc.total_partner_withdrawals,
      'cash_difference', pc.cash_difference,
      'bank_difference', pc.bank_difference,
      'pending_differences', pc.pending_differences
    )
    from public.periodic_closures pc
    where pc.visible_id = 'PER-1'
  ),
  '{
    "caja_to_principal":74,
    "principal_to_caja":36,
    "withdrawals":74,
    "contributions":36,
    "partner_contributions":1000,
    "partner_withdrawals":200,
    "cash_difference":-3,
    "bank_difference":2,
    "pending_differences":1
  }'::jsonb,
  'financial consolidation reports transfers, partners and differences separately'
);

select is(
  (
    select pg_catalog.jsonb_agg(
      ss.legacy_id order by ss.period_month, ss.created_at, ss.id
    )
    from public.periodic_closure_salary_settlements pcss
    join public.periodic_closures pc on pc.id = pcss.closure_id
    join public.salary_settlements ss on ss.id = pcss.settlement_id
    where pc.visible_id = 'PER-1'
  ),
  '[
    "periodic-salary-monthly",
    "periodic-salary-advance",
    "periodic-salary-discount"
  ]'::jsonb,
  'monthly closure selects Principal salaries by worked period and keeps zero-cash discounts associated'
);

select is(
  (
    select pg_catalog.jsonb_build_object(
      'balances',
      pg_catalog.jsonb_array_length(
        cr.response_payload #> '{value,balance_ids}'
      ),
      'expenses',
      pg_catalog.jsonb_array_length(
        cr.response_payload #> '{value,principal_expense_ids}'
      ),
      'salaries',
      pg_catalog.jsonb_array_length(
        cr.response_payload
          #> '{value,principal_salary_settlement_ids}'
      ),
      'treasury',
      pg_catalog.jsonb_array_length(
        cr.response_payload #> '{value,treasury_transfer_ids}'
      ),
      'partners',
      pg_catalog.jsonb_array_length(
        cr.response_payload #> '{value,partner_movement_ids}'
      )
    )
    from public.command_requests cr
    where cr.command_name = 'create_periodic_closure'
      and cr.idempotency_key = 'periodic-create-july-0000001'
  ),
  '{
    "balances":1,
    "expenses":1,
    "salaries":3,
    "treasury":2,
    "partners":2
  }'::jsonb,
  'command response includes every explicit source ID collection'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      (
        select count(*)
        from public.periodic_closure_balances pcb
        where pcb.closure_id = pc.id
      ),
      (
        select count(*)
        from public.periodic_closure_expenses pce
        where pce.closure_id = pc.id
      ),
      (
        select count(*)
        from public.periodic_closure_salary_settlements pcss
        where pcss.closure_id = pc.id
      ),
      (
        select count(*)
        from public.periodic_closure_treasury_transfers pctt
        where pctt.closure_id = pc.id
      ),
      (
        select count(*)
        from public.periodic_closure_partner_movements pcpm
        where pcpm.closure_id = pc.id
      )
    )
    from public.periodic_closures pc
    where pc.visible_id = 'PER-1'
  ),
  '[1,1,3,2,2]'::jsonb,
  'association tables persist the frozen source IDs'
);

select ok(
  not exists (
    select 1
    from (
      select pcb.closure_id, pcb.local_id
      from public.periodic_closure_balances pcb
      union all
      select pce.closure_id, pce.local_id
      from public.periodic_closure_expenses pce
      union all
      select pcss.closure_id, pcss.local_id
      from public.periodic_closure_salary_settlements pcss
      union all
      select pctt.closure_id, pctt.local_id
      from public.periodic_closure_treasury_transfers pctt
      union all
      select pcpm.closure_id, pcpm.local_id
      from public.periodic_closure_partner_movements pcpm
    ) linked
    join public.periodic_closures pc on pc.id = linked.closure_id
    where linked.local_id <> pc.local_id
  ),
  'every frozen association belongs to the closure local'
);

select is(
  (select count(*)::integer from public.account_movements),
  0,
  'periodic consolidation creates no monetary ledger movements'
);

select is(
  (
    select pg_catalog.jsonb_build_object(
      'action', ae.action,
      'actor_id', ae.actor_id,
      'actual_role', ae.actual_role,
      'requested_function', ae.requested_function,
      'local_id', ae.primary_local_id,
      'reason', ae.reason,
      'balance_ids',
      pg_catalog.jsonb_array_length(ae.new_value -> 'balance_ids')
    )
    from public.audit_events ae
    where ae.action = 'Generar cierre periodico'
  ),
  '{
    "action":"Generar cierre periodico",
    "actor_id":"18000000-0000-0000-0000-000000000002",
    "actual_role":"ENCARGADO",
    "requested_function":"ENCARGADO",
    "local_id":"28000000-0000-0000-0000-000000000001",
    "reason":"Cierre mensual de julio",
    "balance_ids":1
  }'::jsonb,
  'creation audit derives identity and preserves the frozen associations'
);

select is(
  public.poseidon_create_periodic_closure(
    'periodic-create-july-0000001',
    'ENCARGADO',
    '28000000-0000-0000-0000-000000000001',
    '{
      "type":"MENSUAL",
      "startDate":"2026-07-01",
      "endDate":"2026-07-31",
      "note":"Cierre mensual de julio"
    }'::jsonb
  ),
  (
    select cr.response_payload
    from public.command_requests cr
    where cr.command_name = 'create_periodic_closure'
      and cr.idempotency_key = 'periodic-create-july-0000001'
  ),
  'exact creation replay returns the stored response'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      (
        select count(*)
        from public.periodic_closures pc
        where pc.visible_id = 'PER-1'
      ),
      (
        select count(*)
        from public.audit_events ae
        where ae.action = 'Generar cierre periodico'
      ),
      (
        select count(*)
        from public.command_requests cr
        where cr.command_name = 'create_periodic_closure'
          and cr.idempotency_key = 'periodic-create-july-0000001'
      )
    )
  ),
  '[1,1,1]'::jsonb,
  'creation replay duplicates neither snapshot, audit nor command claim'
);

select throws_ok(
  $$
    select public.poseidon_create_periodic_closure(
      'periodic-create-july-0000001',
      'ENCARGADO',
      '28000000-0000-0000-0000-000000000001',
      '{
        "type":"MENSUAL",
        "startDate":"2026-07-01",
        "endDate":"2026-07-31",
        "note":"Payload diferente"
      }'::jsonb
    )
  $$,
  'idempotency key was already used with a different request'
);

select is(
  (
    public.poseidon_create_periodic_closure(
      'periodic-create-weekly-00001',
      'ENCARGADO',
      '28000000-0000-0000-0000-000000000001',
      '{
        "type":"SEMANAL",
        "startDate":"2026-07-08",
        "endDate":"2026-07-14",
        "note":"Cierre semanal superpuesto"
      }'::jsonb
    ) #>> '{value,visible_id}'
  ),
  'PER-2',
  'different closure types may cover common dates without a false overlap rejection'
);

select is(
  (
    select pg_catalog.jsonb_agg(
      ss.legacy_id order by ss.created_at, ss.id
    )
    from public.periodic_closure_salary_settlements pcss
    join public.periodic_closures pc on pc.id = pcss.closure_id
    join public.salary_settlements ss on ss.id = pcss.settlement_id
    where pc.visible_id = 'PER-2'
  ),
  '["periodic-salary-weekly"]'::jsonb,
  'non-monthly closure selects Principal salaries by real movement date'
);

select throws_ok(
  $$
    update public.periodic_closures
    set total_expenses = total_expenses + 1
    where visible_id = 'PER-1'
  $$,
  'periodic closure snapshots are immutable'
);

select set_config(
  'request.jwt.claim.sub',
  '18000000-0000-0000-0000-000000000004',
  true
);

select throws_ok(
  $$
    select public.poseidon_annul_periodic_closure(
      'periodic-annul-no-reason-001',
      'ADMINISTRADOR',
      '28000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'closureId',
        (
          select pc.id
          from public.periodic_closures pc
          where pc.visible_id = 'PER-1'
        ),
        'reason',
        ' '
      )
    )
  $$,
  'periodic closure annulment requires a reason'
);

select is(
  (
    public.poseidon_annul_periodic_closure(
      'periodic-annul-july-0000001',
      'ADMINISTRADOR',
      '28000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'closureId',
        (
          select pc.id
          from public.periodic_closures pc
          where pc.visible_id = 'PER-1'
        ),
        'reason',
        'Periodo seleccionado por error'
      )
    ) #>> '{value,status}'
  ),
  'ANULADO',
  'administrator annuls a periodic closure through the authorized local'
);

select is(
  (
    select pg_catalog.jsonb_build_object(
      'status', pc.status,
      'commercial_result', pc.commercial_result,
      'balances',
      (
        select count(*)
        from public.periodic_closure_balances pcb
        where pcb.closure_id = pc.id
      ),
      'expenses',
      (
        select count(*)
        from public.periodic_closure_expenses pce
        where pce.closure_id = pc.id
      ),
      'salaries',
      (
        select count(*)
        from public.periodic_closure_salary_settlements pcss
        where pcss.closure_id = pc.id
      ),
      'treasury',
      (
        select count(*)
        from public.periodic_closure_treasury_transfers pctt
        where pctt.closure_id = pc.id
      ),
      'partners',
      (
        select count(*)
        from public.periodic_closure_partner_movements pcpm
        where pcpm.closure_id = pc.id
      )
    )
    from public.periodic_closures pc
    where pc.visible_id = 'PER-1'
  ),
  '{
    "status":"ANULADO",
    "commercial_result":-65,
    "balances":1,
    "expenses":1,
    "salaries":3,
    "treasury":2,
    "partners":2
  }'::jsonb,
  'annulment changes only status and preserves the complete frozen photo'
);

select is(
  (
    select pg_catalog.jsonb_build_object(
      'actor_id', ae.actor_id,
      'actual_role', ae.actual_role,
      'requested_function', ae.requested_function,
      'reason', ae.reason,
      'previous_status', ae.previous_value ->> 'status',
      'new_status', ae.new_value ->> 'status',
      'previous_balances',
      pg_catalog.jsonb_array_length(
        ae.previous_value -> 'balance_ids'
      ),
      'new_balances',
      pg_catalog.jsonb_array_length(ae.new_value -> 'balance_ids')
    )
    from public.audit_events ae
    where ae.action = 'Anular cierre periodico'
  ),
  '{
    "actor_id":"18000000-0000-0000-0000-000000000004",
    "actual_role":"ADMINISTRADOR",
    "requested_function":"ADMINISTRADOR",
    "reason":"Periodo seleccionado por error",
    "previous_status":"GENERADO",
    "new_status":"ANULADO",
    "previous_balances":1,
    "new_balances":1
  }'::jsonb,
  'annulment audit preserves before and after snapshots with real identity'
);

select is(
  public.poseidon_annul_periodic_closure(
    'periodic-annul-july-0000001',
    'ADMINISTRADOR',
    '28000000-0000-0000-0000-000000000001',
    pg_catalog.jsonb_build_object(
      'closureId',
      (
        select pc.id
        from public.periodic_closures pc
        where pc.visible_id = 'PER-1'
      ),
      'reason',
      'Periodo seleccionado por error'
    )
  ),
  (
    select cr.response_payload
    from public.command_requests cr
    where cr.command_name = 'annul_periodic_closure'
      and cr.idempotency_key = 'periodic-annul-july-0000001'
  ),
  'exact annulment replay returns the stored response'
);

select throws_ok(
  $$
    select public.poseidon_annul_periodic_closure(
      'periodic-annul-july-second-01',
      'ADMINISTRADOR',
      '28000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'closureId',
        (
          select pc.id
          from public.periodic_closures pc
          where pc.visible_id = 'PER-1'
        ),
        'reason',
        'Segundo intento'
      )
    )
  $$,
  'periodic closure is already annulled'
);

select * from finish();
rollback;
