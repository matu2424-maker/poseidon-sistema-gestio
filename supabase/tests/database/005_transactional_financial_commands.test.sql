begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(50);

select is(
  (
    select count(*)::bigint
    from (
      values
        ('public.poseidon_create_expense(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_create_principal_expense(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_expense(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_review_expense(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_create_treasury_transfer(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_treasury_transfer(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_create_partner_movement(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_partner_movement(text,public.app_role,uuid,jsonb)')
    ) target(signature)
    join pg_catalog.pg_proc p on p.oid = pg_catalog.to_regprocedure(target.signature)
    where p.prosecdef
      and p.provolatile = 'v'
      and p.prorettype = 'jsonb'::regtype
  ),
  8::bigint,
  'all eight financial RPCs exist as volatile SECURITY DEFINER functions returning jsonb'
);

select ok(
  (
    select bool_and(
      has_function_privilege('authenticated', target.signature, 'EXECUTE')
      and not has_function_privilege('anon', target.signature, 'EXECUTE')
    )
    from (
      values
        ('public.poseidon_create_expense(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_create_principal_expense(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_expense(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_review_expense(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_create_treasury_transfer(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_treasury_transfer(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_create_partner_movement(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_annul_partner_movement(text,public.app_role,uuid,jsonb)')
    ) target(signature)
  ),
  'only authenticated receives execution privileges on the public financial RPCs'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.command_request_hash(text,public.app_role,uuid,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'private.claim_command(public.app_role,uuid,text,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'private.append_command_audit(uuid,text,text,text,uuid,jsonb,jsonb,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'private.reverse_account_movements(uuid,uuid,public.account_movement_source[],text[],integer,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot invoke runtime internals directly'
);

select is(
  private.command_request_hash(
    'create_expense',
    'CAJERO',
    '23000000-0000-0000-0000-000000000001',
    '{"amount":300,"category":"Servicios"}'::jsonb
  ),
  private.command_request_hash(
    'create_expense',
    'CAJERO',
    '23000000-0000-0000-0000-000000000001',
    '{"category":"Servicios","amount":300}'::jsonb
  ),
  'request hashing is canonical across JSON object key order'
);

select ok(
  pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'private.claim_command(public.app_role,uuid,text,text,text)'::regprocedure
    ),
    'pg_advisory_xact_lock'
  ) > 0,
  'idempotency claims serialize concurrent actor-command-key attempts with an advisory transaction lock'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint con
    where con.conrelid = 'public.command_requests'::regclass
      and con.contype = 'u'
      and pg_catalog.pg_get_constraintdef(con.oid)
        like 'UNIQUE (actor_id, command_name, idempotency_key)%'
  ),
  'the advisory lock is backed by a durable unique idempotency key'
);

insert into auth.users (id, email) values
  ('13000000-0000-0000-0000-000000000001', 'cashier-runtime@poseidon.test'),
  ('13000000-0000-0000-0000-000000000002', 'manager-runtime@poseidon.test'),
  ('13000000-0000-0000-0000-000000000003', 'outsider-runtime@poseidon.test'),
  ('13000000-0000-0000-0000-000000000004', 'admin-runtime@poseidon.test');

insert into public.profiles (
  id,
  legacy_id,
  username,
  display_name,
  role,
  status
) values
  (
    '13000000-0000-0000-0000-000000000001',
    'cashier-runtime',
    'cashier-runtime',
    'Cajero Runtime',
    'CAJERO',
    'ACTIVO'
  ),
  (
    '13000000-0000-0000-0000-000000000002',
    'manager-runtime',
    'manager-runtime',
    'Encargado Runtime',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '13000000-0000-0000-0000-000000000003',
    'outsider-runtime',
    'outsider-runtime',
    'Encargado Ajeno',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '13000000-0000-0000-0000-000000000004',
    'admin-runtime',
    'admin-runtime',
    'Administrador Runtime',
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
    '23000000-0000-0000-0000-000000000001',
    'runtime-local-1',
    '31',
    'Poseidon Runtime',
    true
  ),
  (
    '23000000-0000-0000-0000-000000000002',
    'runtime-local-2',
    '32',
    'Local Runtime Ajeno',
    false
  );

insert into public.user_locals (user_id, local_id) values
  (
    '13000000-0000-0000-0000-000000000001',
    '23000000-0000-0000-0000-000000000001'
  ),
  (
    '13000000-0000-0000-0000-000000000002',
    '23000000-0000-0000-0000-000000000001'
  ),
  (
    '13000000-0000-0000-0000-000000000003',
    '23000000-0000-0000-0000-000000000002'
  );

insert into public.expense_categories (id, legacy_id, name)
values (
  '33000000-0000-0000-0000-000000000001',
  'runtime-category',
  'Servicios Runtime'
);

insert into public.expense_subcategories (
  id,
  legacy_id,
  category_id,
  name
) values (
  '33000000-0000-0000-0000-000000000002',
  'runtime-subcategory',
  '33000000-0000-0000-0000-000000000001',
  'Internet Runtime'
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
    '53000000-0000-0000-0000-000000000001',
    'runtime-local-cash',
    'LOCAL_EFECTIVO',
    '23000000-0000-0000-0000-000000000001',
    null,
    'Poseidon Runtime - Caja / Efectivo'
  ),
  (
    '53000000-0000-0000-0000-000000000002',
    'runtime-local-bank',
    'LOCAL_BANCO',
    '23000000-0000-0000-0000-000000000001',
    null,
    'Poseidon Runtime - Caja / Banco'
  ),
  (
    '53000000-0000-0000-0000-000000000003',
    'runtime-principal-cash',
    'PRINCIPAL_EFECTIVO',
    null,
    null,
    'Principal Runtime / Efectivo'
  ),
  (
    '53000000-0000-0000-0000-000000000004',
    'runtime-principal-bank',
    'PRINCIPAL_BANCO',
    null,
    null,
    'Principal Runtime / Banco'
  ),
  (
    '53000000-0000-0000-0000-000000000005',
    'runtime-partner-mathias',
    'SOCIO',
    null,
    'MATHIAS',
    'Socio Runtime / Mathias'
  ),
  (
    '53000000-0000-0000-0000-000000000006',
    'runtime-partner-ricardo',
    'SOCIO',
    null,
    'RICARDO',
    'Socio Runtime / Ricardo'
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
  '63000000-0000-0000-0000-000000000001',
  'runtime-balance-open',
  'POSE-RUNTIME-1',
  '23000000-0000-0000-0000-000000000001',
  '2026-07-26',
  300,
  100,
  '13000000-0000-0000-0000-000000000001',
  'cashier-runtime',
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
    '73000000-0000-0000-0000-000000000001',
    'runtime-fund-local-cash',
    '53000000-0000-0000-0000-000000000001',
    '23000000-0000-0000-0000-000000000001',
    'APORTE',
    'runtime-funding-local-cash',
    'ENTRADA',
    'SALDO_INICIAL',
    300,
    'Saldo inicial de Caja / Efectivo',
    '13000000-0000-0000-0000-000000000004',
    'admin-runtime'
  ),
  (
    '73000000-0000-0000-0000-000000000002',
    'runtime-fund-local-bank',
    '53000000-0000-0000-0000-000000000002',
    '23000000-0000-0000-0000-000000000001',
    'APORTE',
    'runtime-funding-local-bank',
    'ENTRADA',
    'SALDO_INICIAL',
    100,
    'Saldo inicial de Caja / Banco',
    '13000000-0000-0000-0000-000000000004',
    'admin-runtime'
  ),
  (
    '73000000-0000-0000-0000-000000000003',
    'runtime-fund-principal-cash',
    '53000000-0000-0000-0000-000000000003',
    '23000000-0000-0000-0000-000000000001',
    'APORTE_SOCIO',
    'runtime-funding-principal-cash',
    'ENTRADA',
    'SALDO_INICIAL',
    1000,
    'Saldo inicial de Principal / Efectivo',
    '13000000-0000-0000-0000-000000000004',
    'admin-runtime'
  ),
  (
    '73000000-0000-0000-0000-000000000004',
    'runtime-fund-principal-bank',
    '53000000-0000-0000-0000-000000000004',
    '23000000-0000-0000-0000-000000000001',
    'APORTE_SOCIO',
    'runtime-funding-principal-bank',
    'ENTRADA',
    'SALDO_INICIAL',
    500,
    'Saldo inicial de Principal / Banco',
    '13000000-0000-0000-0000-000000000004',
    'admin-runtime'
  );

select set_config(
  'request.jwt.claim.sub',
  '13000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_create_principal_expense(
      'reject-cashier-principal-0001',
      'CAJERO',
      '23000000-0000-0000-0000-000000000001',
      '{
        "medium":"BANCO",
        "category":"Servicios Runtime",
        "subcategory":"Internet Runtime",
        "amount":100
      }'::jsonb
    )
  $sql$,
  'a cashier function cannot create a Principal expense'
);

reset role;

select is(
  (
    select count(*)::bigint
    from public.expenses
  )
  + (
    select count(*)::bigint
    from public.command_requests
  )
  + (
    select count(*)::bigint
    from public.audit_events
  ),
  0::bigint,
  'a rejected role/function request leaves no entity, command claim, or audit row'
);

select set_config(
  'request.jwt.claim.sub',
  '13000000-0000-0000-0000-000000000002',
  true
);
set local role authenticated;

select throws_ok(
  $sql$
    select public.poseidon_create_expense(
      'reject-manager-function-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"63000000-0000-0000-0000-000000000001",
        "category":"Servicios Runtime",
        "subcategory":"Internet Runtime",
        "amount":10
      }'::jsonb
    )
  $sql$,
  'a manager must explicitly request the cashier function for a cash expense'
);

select throws_ok(
  $sql$
    select public.poseidon_create_principal_expense(
      'reject-manager-admin-function-0001',
      'ADMINISTRADOR',
      '23000000-0000-0000-0000-000000000001',
      '{
        "medium":"BANCO",
        "category":"Servicios Runtime",
        "subcategory":"Internet Runtime",
        "amount":10
      }'::jsonb
    )
  $sql$,
  'an Encargado cannot impersonate the administrator function'
);

select throws_ok(
  $sql$
    select public.poseidon_create_principal_expense(
      'reject-manager-local-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000002',
      '{
        "medium":"BANCO",
        "category":"Servicios Runtime",
        "subcategory":"Internet Runtime",
        "amount":10
      }'::jsonb
    )
  $sql$,
  'a manager cannot operate an unassigned local'
);

reset role;

select is(
  (select count(*) from public.command_requests),
  0::bigint,
  'function and local authorization failures roll back their idempotency claims'
);

select set_config(
  'request.jwt.claim.sub',
  '13000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select ok(
  (
    public.poseidon_create_expense(
      'cash-expense-exact-0001',
      'CAJERO',
      '23000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"63000000-0000-0000-0000-000000000001",
        "category":"Servicios Runtime",
        "subcategory":"Internet Runtime",
        "amount":300,
        "description":"Consume el disponible exacto"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  'authenticated cashier creates a cash expense for the exact available balance'
);

reset role;

select ok(
  exists (
    select 1
    from public.expenses e
    where e.balance_id = '63000000-0000-0000-0000-000000000001'
      and e.local_id = '23000000-0000-0000-0000-000000000001'
      and e.payment_account_id = '53000000-0000-0000-0000-000000000001'
      and e.category_name_snapshot = 'Servicios Runtime'
      and e.subcategory_name_snapshot = 'Internet Runtime'
      and e.amount = 300
      and e.status = 'ACTIVO'
  ),
  'cash expense stores its active balance, local, payment account, and classification snapshots'
);

select ok(
  private.account_balance('53000000-0000-0000-0000-000000000001') = 0
  and (
    select coalesce(sum(e.amount), 0)
    from public.expenses e
    where e.status = 'ACTIVO'
  ) = 300
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'GASTO'
      and am.source_id = (
        select e.id::text
        from public.expenses e
        where e.balance_id = '63000000-0000-0000-0000-000000000001'
      )
  ) = 1,
  'exact availability reaches zero while economic expense and one ledger outflow agree'
);

select is(
  public.poseidon_create_expense(
    'cash-expense-exact-0001',
    'CAJERO',
    '23000000-0000-0000-0000-000000000001',
    '{
      "description":"Consume el disponible exacto",
      "amount":300,
      "subcategory":"Internet Runtime",
      "category":"Servicios Runtime",
      "balanceId":"63000000-0000-0000-0000-000000000001"
    }'::jsonb
  ),
  (
    select cr.response_payload
    from public.command_requests cr
    where cr.actor_id = '13000000-0000-0000-0000-000000000001'
      and cr.command_name = 'create_expense'
      and cr.idempotency_key = 'cash-expense-exact-0001'
  ),
  'an exact replay returns the stored command response'
);

select throws_ok(
  $sql$
    select public.poseidon_create_expense(
      'cash-expense-exact-0001',
      'CAJERO',
      '23000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"63000000-0000-0000-0000-000000000001",
        "category":"Servicios Runtime",
        "subcategory":"Internet Runtime",
        "amount":299,
        "description":"Consume el disponible exacto"
      }'::jsonb
    )
  $sql$,
  'an idempotency key cannot be reused with a changed payload'
);

select ok(
  (select count(*) from public.expenses) = 1
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'GASTO'
  ) = 1
  and (
    select count(*)
    from public.command_requests cr
    where cr.command_name = 'create_expense'
  ) = 1,
  'replay and hash mismatch do not duplicate entity, ledger, or command claim'
);

select ok(
  exists (
    select 1
    from public.audit_events ae
    join public.command_requests cr on cr.id = ae.command_request_id
    join public.audit_event_locals ael on ael.audit_event_id = ae.id
    where cr.command_name = 'create_expense'
      and ae.actor_id = '13000000-0000-0000-0000-000000000001'
      and ae.actor_legacy_id = 'cashier-runtime'
      and ae.actor_name_snapshot = 'Cajero Runtime'
      and ae.actual_role = 'CAJERO'
      and ae.requested_function = 'CAJERO'
      and ae.primary_local_id = '23000000-0000-0000-0000-000000000001'
      and ael.local_id = ae.primary_local_id
  ),
  'audit actor, actual role, requested function, and local derive from authenticated command context'
);

select set_config(
  'request.jwt.claim.sub',
  '13000000-0000-0000-0000-000000000002',
  true
);

select ok(
  (
    public.poseidon_review_expense(
      'review-cash-expense-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'expenseId',
        (
          select e.id::text
          from public.expenses e
          where e.balance_id = '63000000-0000-0000-0000-000000000001'
        ),
        'status',
        'REVISADO',
        'note',
        'Comprobante controlado'
      )
    ) ->> 'ok'
  )::boolean,
  'manager reviews an expense through the dedicated RPC'
);

select ok(
  exists (
    select 1
    from public.expenses e
    where e.balance_id = '63000000-0000-0000-0000-000000000001'
      and e.review_status = 'REVISADO'
      and e.reviewed_by = '13000000-0000-0000-0000-000000000002'
      and e.reviewed_by_legacy_id = 'manager-runtime'
      and e.review_note = 'Comprobante controlado'
  )
  and private.account_balance('53000000-0000-0000-0000-000000000001') = 0
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'GASTO'
  ) = 1,
  'review changes metadata and audit actor without changing funds or ledger'
);

select set_config(
  'request.jwt.claim.sub',
  '13000000-0000-0000-0000-000000000001',
  true
);

select ok(
  (
    public.poseidon_annul_expense(
      'annul-cash-expense-0001',
      'CAJERO',
      '23000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'expenseId',
        (
          select e.id::text
          from public.expenses e
          where e.balance_id = '63000000-0000-0000-0000-000000000001'
        ),
        'balanceId',
        '63000000-0000-0000-0000-000000000001'
      )
    ) ->> 'ok'
  )::boolean,
  'cashier annuls an expense while its balance remains open'
);

select ok(
  exists (
    select 1
    from public.expenses e
    where e.balance_id = '63000000-0000-0000-0000-000000000001'
      and e.status = 'ANULADO'
  )
  and (
    select count(*)
    from public.account_movements original
    where original.source_type = 'GASTO'
      and original.reversal_of is null
      and original.status = 'ACTIVO'
      and exists (
        select 1
        from public.account_movements reversal
        where reversal.reversal_of = original.id
          and reversal.direction = 'ENTRADA'
          and reversal.amount = original.amount
      )
  ) = 1,
  'annulment keeps the active original ledger row and appends its opposite linked reversal'
);

select ok(
  private.account_balance('53000000-0000-0000-0000-000000000001') = 300
  and (
    select coalesce(sum(e.amount), 0)
    from public.expenses e
    where e.status = 'ACTIVO'
  ) = 0,
  'cash expense annulment restores funds and removes the entity from active economic result'
);

select throws_ok(
  $sql$
    update public.account_movements
    set detail = 'No permitido'
    where reversal_of is not null
  $sql$,
  'appended reversal rows remain immutable'
);

select is(
  (
    select pg_catalog.jsonb_array_length(
      public.poseidon_annul_expense(
        'annul-cash-expense-0001',
        'CAJERO',
        '23000000-0000-0000-0000-000000000001',
        pg_catalog.jsonb_build_object(
          'expenseId',
          (
            select e.id::text
            from public.expenses e
            where e.balance_id = '63000000-0000-0000-0000-000000000001'
          ),
          'balanceId',
          '63000000-0000-0000-0000-000000000001'
        )
      ) -> 'ledger'
    )
  ),
  1,
  'expense annulment replay returns its original one-row reversal result'
);

select set_config(
  'request.jwt.claim.sub',
  '13000000-0000-0000-0000-000000000002',
  true
);

select throws_ok(
  $sql$
    select public.poseidon_create_principal_expense(
      'principal-expense-excess-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      '{
        "medium":"BANCO",
        "category":"Servicios Runtime",
        "subcategory":"Internet Runtime",
        "amount":501
      }'::jsonb
    )
  $sql$,
  'a Principal expense above available funds is rejected'
);

select ok(
  private.account_balance('53000000-0000-0000-0000-000000000004') = 500
  and (select count(*) from public.expenses) = 1
  and not exists (
    select 1
    from public.command_requests cr
    where cr.idempotency_key = 'principal-expense-excess-0001'
  ),
  'insufficient Principal funds reject before entity, ledger, audit, or durable command mutation'
);

select ok(
  (
    public.poseidon_create_principal_expense(
      'principal-expense-create-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      '{
        "medium":"BANCO",
        "category":"Servicios Runtime",
        "subcategory":"Internet Runtime",
        "amount":100,
        "description":"Gasto administrativo"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  'manager creates an administrative expense from Principal'
);

select ok(
  exists (
    select 1
    from public.expenses e
    where e.balance_id is null
      and e.payment_account_id = '53000000-0000-0000-0000-000000000004'
      and e.amount = 100
      and e.review_status = 'PENDIENTE'
  )
  and private.account_balance('53000000-0000-0000-0000-000000000004') = 400
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'GASTO'
      and am.account_id = '53000000-0000-0000-0000-000000000004'
  ) = 1,
  'Principal expense has no balanceId and its economic entity agrees with one Principal ledger outflow'
);

select ok(
  (
    public.poseidon_annul_expense(
      'principal-expense-annul-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'expenseId',
        (
          select e.id::text
          from public.expenses e
          where e.balance_id is null
        ),
        'reason',
        'Comprobante incorrecto'
      )
    ) ->> 'ok'
  )::boolean,
  'manager annuls a Principal expense through the shared expense RPC'
);

select ok(
  exists (
    select 1
    from public.expenses e
    where e.balance_id is null
      and e.status = 'ANULADO'
  )
  and private.account_balance('53000000-0000-0000-0000-000000000004') = 500
  and (
    select count(*)
    from public.account_movements am
    where am.account_id = '53000000-0000-0000-0000-000000000004'
      and (
        am.source_type = 'GASTO'
        or am.reversal_of is not null
      )
  ) = 2,
  'Principal annulment preserves the original and restores its paying account with a reversal'
);

select ok(
  (
    public.poseidon_create_treasury_transfer(
      'treasury-create-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"63000000-0000-0000-0000-000000000001",
        "type":"RETIRO_CAJA",
        "medium":"EFECTIVO",
        "amount":100,
        "note":"Retiro operativo"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  'manager creates a Caja to Principal transfer linked to the open balance'
);

select ok(
  exists (
    select 1
    from public.treasury_transfers tt
    where tt.balance_id = '63000000-0000-0000-0000-000000000001'
      and tt.type = 'RETIRO_CAJA'
      and tt.medium = 'EFECTIVO'
      and tt.timing = 'OPERATIVO'
      and tt.status = 'ACTIVO'
  )
  and private.account_balance('53000000-0000-0000-0000-000000000001') = 200
  and private.account_balance('53000000-0000-0000-0000-000000000003') = 1100
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'TRASPASO_CAJA'
  ) = 2,
  'treasury transfer has two ledger legs, preserves medium, and conserves total liquidity'
);

select ok(
  (
    public.poseidon_annul_treasury_transfer(
      'treasury-annul-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'transferId',
        (
          select tt.id::text
          from public.treasury_transfers tt
          where tt.type = 'RETIRO_CAJA'
        ),
        'balanceId',
        '63000000-0000-0000-0000-000000000001',
        'reason',
        'Retiro cancelado'
      )
    ) ->> 'ok'
  )::boolean,
  'manager annuls an operational treasury transfer while its balance is open'
);

select ok(
  exists (
    select 1
    from public.treasury_transfers tt
    where tt.type = 'RETIRO_CAJA'
      and tt.status = 'ANULADO'
  )
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'TRASPASO_CAJA'
       or (
         am.source_type = 'AJUSTE'
         and am.reversal_of in (
           select original.id
           from public.account_movements original
           where original.source_type = 'TRASPASO_CAJA'
         )
       )
  ) = 4
  and private.account_balance('53000000-0000-0000-0000-000000000001') = 300
  and private.account_balance('53000000-0000-0000-0000-000000000003') = 1000,
  'treasury annulment appends two reversals and restores both account balances'
);

do $$
begin
  perform public.poseidon_annul_treasury_transfer(
    'treasury-annul-0001',
    'ENCARGADO',
    '23000000-0000-0000-0000-000000000001',
    pg_catalog.jsonb_build_object(
      'transferId',
      (
        select tt.id::text
        from public.treasury_transfers tt
        where tt.type = 'RETIRO_CAJA'
      ),
      'balanceId',
      '63000000-0000-0000-0000-000000000001',
      'reason',
      'Retiro cancelado'
    )
  );
end
$$;

select is(
  (
    select count(*)
    from public.account_movements am
    where am.reversal_of in (
      select original.id
      from public.account_movements original
      where original.source_type = 'TRASPASO_CAJA'
    )
  ),
  2::bigint,
  'treasury annulment replay cannot create duplicate reversals'
);

select throws_ok(
  $sql$
    select public.poseidon_create_treasury_transfer(
      'treasury-excess-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      '{
        "balanceId":"63000000-0000-0000-0000-000000000001",
        "type":"APORTE_CAJA",
        "medium":"EFECTIVO",
        "amount":1001
      }'::jsonb
    )
  $sql$,
  'treasury source account cannot be overdrawn'
);

select ok(
  (select count(*) from public.treasury_transfers) = 1
  and private.account_balance('53000000-0000-0000-0000-000000000001') = 300
  and private.account_balance('53000000-0000-0000-0000-000000000003') = 1000
  and not exists (
    select 1
    from public.command_requests cr
    where cr.idempotency_key = 'treasury-excess-0001'
  ),
  'rejected treasury excess leaves entity, balances, ledger, and command claims unchanged'
);

select ok(
  (
    public.poseidon_create_partner_movement(
      'partner-create-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      '{
        "partner":"MATHIAS",
        "type":"APORTE_SOCIO",
        "medium":"EFECTIVO",
        "amount":50,
        "note":"Aporte patrimonial"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  'manager creates a real partner contribution'
);

select ok(
  exists (
    select 1
    from public.partner_movements pm
    where pm.balance_id is null
      and pm.partner = 'MATHIAS'
      and pm.type = 'APORTE_SOCIO'
      and pm.medium = 'EFECTIVO'
      and pm.status = 'ACTIVO'
  )
  and private.account_balance('53000000-0000-0000-0000-000000000003') = 1050
  and private.account_balance('53000000-0000-0000-0000-000000000005') = 50
  and (
    select count(*)
    from public.account_movements am
    where am.source_type = 'APORTE_SOCIO'
      and am.source_id = (
        select pm.id::text
        from public.partner_movements pm
        where pm.partner = 'MATHIAS'
      )
  ) = 2,
  'partner contribution has no balanceId, changes Principal and partner ledgers, and not economic result'
);

select ok(
  (
    public.poseidon_annul_partner_movement(
      'partner-annul-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      pg_catalog.jsonb_build_object(
        'movementId',
        (
          select pm.id::text
          from public.partner_movements pm
          where pm.partner = 'MATHIAS'
        ),
        'reason',
        'Aporte cancelado'
      )
    ) ->> 'ok'
  )::boolean,
  'manager annuls a partner contribution when Principal can fund the reversal'
);

select ok(
  exists (
    select 1
    from public.partner_movements pm
    where pm.partner = 'MATHIAS'
      and pm.status = 'ANULADO'
  )
  and (
    select count(*)
    from public.account_movements am
    where (
        am.source_type = 'APORTE_SOCIO'
        and am.source_id = (
          select pm.id::text
          from public.partner_movements pm
          where pm.partner = 'MATHIAS'
        )
      )
       or (
         am.source_type = 'AJUSTE'
         and am.reversal_of in (
           select original.id
           from public.account_movements original
           where original.source_type = 'APORTE_SOCIO'
             and original.source_id = (
               select pm.id::text
               from public.partner_movements pm
               where pm.partner = 'MATHIAS'
           )
         )
       )
  ) = 4
  and private.account_balance('53000000-0000-0000-0000-000000000003') = 1000
  and private.account_balance('53000000-0000-0000-0000-000000000005') = 0,
  'partner annulment appends both reversals while initial funding and net balances remain intact'
);

select throws_ok(
  $sql$
    select public.poseidon_create_partner_movement(
      'partner-excess-0001',
      'ENCARGADO',
      '23000000-0000-0000-0000-000000000001',
      '{
        "partner":"RICARDO",
        "type":"RETIRO_SOCIO",
        "medium":"EFECTIVO",
        "amount":1001
      }'::jsonb
    )
  $sql$,
  'partner withdrawal cannot overdraw Principal'
);

select ok(
  (select count(*) from public.partner_movements) = 1
  and private.account_balance('53000000-0000-0000-0000-000000000003') = 1000
  and private.account_balance('53000000-0000-0000-0000-000000000006') = 0
  and not exists (
    select 1
    from public.command_requests cr
    where cr.idempotency_key = 'partner-excess-0001'
  ),
  'rejected partner excess leaves patrimonial and money accounts unchanged'
);

select ok(
  (select count(*) from public.command_requests) = 9
  and not exists (
    select 1
    from public.command_requests cr
    where cr.status <> 'APLICADO'
      or cr.response_payload is null
      or cr.completed_at is null
  ),
  'each successful command has one completed durable idempotency result'
);

select ok(
  (select count(*) from public.audit_events) = 9
  and (select count(*) from public.audit_event_locals) = 9
  and not exists (
    select 1
    from public.audit_events ae
    join public.command_requests cr on cr.id = ae.command_request_id
    where ae.actor_id <> cr.actor_id
      or ae.actual_role <> cr.actual_role
      or ae.requested_function <> cr.requested_function
      or ae.primary_local_id <> cr.local_id
  ),
  'every successful command appends one scoped audit row matching its authenticated claim'
);

select ok(
  not exists (
    select 1
    from public.command_requests cr
    where pg_catalog.jsonb_array_length(cr.response_payload -> 'ledger')
      <> case
           when cr.command_name = 'review_expense' then 0
           when cr.command_name in (
             'create_treasury_transfer',
             'annul_treasury_transfer',
             'create_partner_movement',
             'annul_partner_movement'
           ) then 2
           else 1
         end
  ),
  'stored command results expose the exact ledger rows created by each operation'
);

select ok(
  (
    select coalesce(sum(e.amount), 0)
    from public.expenses e
    where e.status = 'ACTIVO'
  ) = 0
  and private.account_balance('53000000-0000-0000-0000-000000000001') = 300
  and private.account_balance('53000000-0000-0000-0000-000000000002') = 100
  and private.account_balance('53000000-0000-0000-0000-000000000003') = 1000
  and private.account_balance('53000000-0000-0000-0000-000000000004') = 500,
  'final economic result and all four money-account ledgers reconcile to their initial balances'
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
  'no successful or rejected command leaves a money account negative'
);

select * from finish();
rollback;
