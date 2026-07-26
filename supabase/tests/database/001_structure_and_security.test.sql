begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(19);

select is(
  (
    select count(*)::bigint
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any (array[
        'profiles',
        'locals',
        'user_locals',
        'staff',
        'staff_schedules',
        'salary_history',
        'clients',
        'expense_categories',
        'expense_subcategories',
        'machines',
        'machine_history',
        'current_accounts',
        'cash_balances',
        'machine_readings',
        'expenses',
        'transfers',
        'gifts',
        'gift_clients',
        'capital_movements',
        'treasury_transfers',
        'partner_movements',
        'account_movements',
        'salary_closures',
        'salary_closure_locals',
        'salary_settlements',
        'salary_closure_employee_snapshots',
        'salary_closure_settlement_snapshots',
        'periodic_closures',
        'periodic_closure_balances',
        'periodic_closure_expenses',
        'periodic_closure_salary_settlements',
        'periodic_closure_treasury_transfers',
        'periodic_closure_partner_movements',
        'attachments',
        'audit_events',
        'audit_event_locals',
        'command_requests'
      ])
  ),
  37::bigint,
  'all 37 Poseidon relational tables exist'
);

select is(
  (
    select count(distinct c.oid)::bigint
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_constraint con on con.conrelid = c.oid and con.contype = 'p'
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname <> 'schema_migrations'
  ),
  37::bigint,
  'every Poseidon table has a primary key'
);

select ok(
  (
    select bool_and(c.relrowsecurity)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any (array[
        'profiles', 'locals', 'user_locals', 'staff', 'staff_schedules',
        'salary_history', 'clients', 'expense_categories', 'expense_subcategories',
        'machines', 'machine_history', 'current_accounts', 'cash_balances',
        'machine_readings', 'expenses', 'transfers', 'gifts', 'gift_clients',
        'capital_movements', 'treasury_transfers', 'partner_movements',
        'account_movements', 'salary_closures', 'salary_closure_locals',
        'salary_settlements', 'salary_closure_employee_snapshots',
        'salary_closure_settlement_snapshots', 'periodic_closures',
        'periodic_closure_balances', 'periodic_closure_expenses',
        'periodic_closure_salary_settlements',
        'periodic_closure_treasury_transfers',
        'periodic_closure_partner_movements', 'attachments', 'audit_events',
        'audit_event_locals', 'command_requests'
      ])
  ),
  'RLS is enabled on every exposed Poseidon table'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint con
    where con.conrelid = 'public.profiles'::regclass
      and con.confrelid = 'auth.users'::regclass
      and con.contype = 'f'
  ),
  'profiles are linked to auth.users'
);

select ok(
  exists (
    select 1
    from storage.buckets b
    where b.id = 'poseidon-private'
      and b.public = false
      and b.file_size_limit = 20971520
  ),
  'attachment metadata targets a private size-limited Storage bucket'
);

select ok(
  to_regclass('public.cash_balances_one_open_per_local_uq') is not null,
  'one-open-cash-per-local partial unique index exists'
);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_catalog.pg_enum e
    join pg_catalog.pg_type t on t.oid = e.enumtypid
    join pg_catalog.pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'week_day'
  ),
  array['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'],
  'staff schedules support every day of the week'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.machine_readings'::regclass
      and contype = 'u'
  ),
  'machine readings have a uniqueness contract'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.account_movements'::regclass
      and tgname = 'account_movements_append_only'
      and not tgisinternal
  ),
  'account ledger has an append-only trigger'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.audit_events'::regclass
      and tgname = 'audit_events_append_only'
      and not tgisinternal
  ),
  'audit log has an append-only trigger'
);

select ok(
  (
    select bool_and(
      not has_table_privilege('authenticated', format('public.%I', target.table_name), 'INSERT')
      and not has_table_privilege('authenticated', format('public.%I', target.table_name), 'UPDATE')
      and not has_table_privilege('authenticated', format('public.%I', target.table_name), 'DELETE')
    )
    from (
      values
        ('current_accounts'),
        ('cash_balances'),
        ('machine_readings'),
        ('expenses'),
        ('transfers'),
        ('gifts'),
        ('gift_clients'),
        ('capital_movements'),
        ('treasury_transfers'),
        ('partner_movements'),
        ('account_movements'),
        ('salary_settlements'),
        ('salary_closures'),
        ('salary_closure_locals'),
        ('salary_closure_employee_snapshots'),
        ('salary_closure_settlement_snapshots'),
        ('periodic_closures'),
        ('periodic_closure_balances'),
        ('periodic_closure_expenses'),
        ('periodic_closure_salary_settlements'),
        ('periodic_closure_treasury_transfers'),
        ('periodic_closure_partner_movements')
    ) as target(table_name)
  ),
  'authenticated clients cannot write financial tables directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.audit_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.audit_events', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.audit_events', 'DELETE'),
  'authenticated clients cannot write audit events directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.command_requests', 'SELECT')
  and not has_table_privilege('authenticated', 'public.command_requests', 'INSERT')
  and not has_table_privilege('authenticated', 'public.command_requests', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.command_requests', 'DELETE'),
  'idempotency records are private to server-side commands'
);

select ok(
  has_table_privilege('authenticated', 'public.locals', 'SELECT'),
  'authenticated users receive only the declared read grant'
);

select ok(
  to_regprocedure('private.assert_command_context(public.app_role,uuid)') is not null,
  'server command authorization helper exists'
);

select ok(
  to_regprocedure('private.claim_command(public.app_role,uuid,text,text,text)') is not null,
  'server idempotency claim helper exists'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'private.assert_command_context(public.app_role,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'private.claim_command(public.app_role,uuid,text,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'private.finish_command(uuid,public.command_request_status,jsonb,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot invoke internal command helpers directly'
);

select is(
  (
    select count(*)::bigint
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname ilike '%appdata%'
  ),
  0::bigint,
  'no generic whole-AppData RPC is exposed'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.machine_readings'::regclass
      and conname = 'machine_readings_balance_fk'
      and contype = 'f'
  )
  and exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.salary_settlements'::regclass
      and conname = 'salary_settlements_balance_fk'
      and contype = 'f'
  ),
  'operational children bind balance and local through composite foreign keys'
);

select * from finish();
rollback;
