begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(17);

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'sql-owner@poseidon.test');

insert into public.profiles (id, legacy_id, username, display_name, role)
values (
  '10000000-0000-0000-0000-000000000001',
  'admin-sql',
  'admin-sql',
  'Administrador SQL',
  'ADMINISTRADOR'
);

insert into public.locals (id, legacy_id, visible_id, name, is_primary) values
  ('20000000-0000-0000-0000-000000000001', '1', '1', 'Poseidon', true),
  ('20000000-0000-0000-0000-000000000002', '2', '2', 'Segundo local', false);

select throws_ok(
  $$insert into public.locals (legacy_id, visible_id, name) values ('bad-local', 'ABC', 'Invalido')$$,
  'local visible IDs must be short numeric values'
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
) values
  (
    '30000000-0000-0000-0000-000000000001',
    'staff-1',
    '1',
    '20000000-0000-0000-0000-000000000001',
    'Ana',
    'Prueba',
    'DOC-SQL-1',
    '2026-01-01',
    'CAJERO_A',
    'MENSUAL',
    50000
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'staff-2',
    '1',
    '20000000-0000-0000-0000-000000000002',
    'Berta',
    'Segundo',
    'DOC-SQL-2',
    '2026-01-01',
    'CAJERO_A',
    'MENSUAL',
    45000
  );

insert into public.expense_categories (id, legacy_id, name)
values ('40000000-0000-0000-0000-000000000001', 'category-1', 'Servicios');

insert into public.expense_subcategories (id, legacy_id, category_id, name)
values (
  '40000000-0000-0000-0000-000000000002',
  'subcategory-1',
  '40000000-0000-0000-0000-000000000001',
  'Internet'
);

insert into public.current_accounts (
  id,
  legacy_id,
  kind,
  local_id,
  name
) values (
  '50000000-0000-0000-0000-000000000001',
  'account-local-1-efectivo',
  'LOCAL_EFECTIVO',
  '20000000-0000-0000-0000-000000000001',
  'Caja / Efectivo'
);

insert into public.cash_balances (
  id,
  legacy_id,
  visible_id,
  local_id,
  operating_date,
  initial_cash,
  opened_by,
  opened_by_legacy_id,
  opened_by_role
) values (
  '60000000-0000-0000-0000-000000000001',
  'balance-1',
  'POSE-1',
  '20000000-0000-0000-0000-000000000001',
  '2026-07-26',
  1000,
  '10000000-0000-0000-0000-000000000001',
  'admin-sql',
  'CAJERO'
);

select throws_ok(
  $$
    insert into public.cash_balances (
      legacy_id, visible_id, local_id, operating_date, initial_cash,
      opened_by, opened_by_legacy_id, opened_by_role
    ) values (
      'balance-2', 'POSE-2', '20000000-0000-0000-0000-000000000001',
      '2026-07-27', 1000, '10000000-0000-0000-0000-000000000001',
      'admin-sql', 'CAJERO'
    )
  $$,
  'a local cannot have two open cash balances'
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
  created_by,
  created_by_legacy_id
) values (
  '61000000-0000-0000-0000-000000000001',
  'expense-append-only',
  '60000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  'Servicios',
  'Internet',
  100,
  '10000000-0000-0000-0000-000000000001',
  'admin-sql'
);

select throws_ok(
  $$delete from public.expenses where legacy_id = 'expense-append-only'$$,
  'operational expenses cannot be deleted'
);

select throws_ok(
  $$delete from public.cash_balances where legacy_id = 'balance-1'$$,
  'cash balances cannot be deleted'
);

insert into public.machines (
  id,
  legacy_id,
  visible_id,
  name,
  current_location_kind,
  current_local_id,
  location_label
) values (
  '70000000-0000-0000-0000-000000000001',
  'machine-1',
  '1',
  'Maquina SQL',
  'LOCAL',
  '20000000-0000-0000-0000-000000000001',
  'Poseidon'
);

select throws_ok(
  $$
    insert into public.machines (
      legacy_id, visible_id, name, current_location_kind,
      current_local_id, location_label, status
    ) values (
      'machine-bad', '2', 'Desuso invalida', 'LOCAL',
      '20000000-0000-0000-0000-000000000001', 'Poseidon', 'DESUSO'
    )
  $$,
  'a machine can be marked as disused only in the workshop'
);

select throws_ok(
  $$
    insert into public.machine_readings (
      legacy_id, balance_id, local_id, machine_id, in_previous,
      in_actual, out_previous, out_actual, result, updated_by,
      updated_by_legacy_id
    ) values (
      'reading-bad-counter',
      '60000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      '70000000-0000-0000-0000-000000000001',
      1000, 999, 500, 500, -1,
      '10000000-0000-0000-0000-000000000001',
      'admin-sql'
    )
  $$,
  'IN and OUT readings cannot go backwards'
);

select throws_ok(
  $$
    insert into public.machine_readings (
      legacy_id, balance_id, local_id, machine_id, in_previous,
      in_actual, out_previous, out_actual, result, updated_by,
      updated_by_legacy_id
    ) values (
      'reading-cross-local',
      '60000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      '70000000-0000-0000-0000-000000000001',
      1000, 1000, 500, 500, 0,
      '10000000-0000-0000-0000-000000000001',
      'admin-sql'
    )
  $$,
  'a reading cannot bind a balance to another local'
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
  '80000000-0000-0000-0000-000000000001',
  'movement-1',
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'APORTE',
  'test-source',
  'ENTRADA',
  'APORTE_PRUEBA',
  1000,
  'Aporte de prueba',
  '10000000-0000-0000-0000-000000000001',
  'admin-sql'
);

select throws_ok(
  $$update public.account_movements set amount = 1 where legacy_id = 'movement-1'$$,
  'financial ledger rows cannot be updated'
);

select throws_ok(
  $$delete from public.account_movements where legacy_id = 'movement-1'$$,
  'financial ledger rows cannot be deleted'
);

select throws_ok(
  $$
    insert into public.account_movements (
      legacy_id, account_id, local_id, source_type, source_id, direction,
      concept, amount, detail, actor_legacy_id
    ) values (
      'movement-nan',
      '50000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      'APORTE', 'test-nan', 'ENTRADA', 'NAN', 'NaN',
      'No debe confirmar', 'admin-sql'
    )
  $$,
  'financial amounts must be finite'
);

insert into public.account_movements (
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
  actor_legacy_id,
  reversal_of
) values (
  'movement-1-reversal',
  '50000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'AJUSTE',
  'test-source',
  'SALIDA',
  'REVERSO_APORTE_PRUEBA',
  1000,
  'Reverso de prueba',
  '10000000-0000-0000-0000-000000000001',
  'admin-sql',
  '80000000-0000-0000-0000-000000000001'
);

select pass('an append-only reversal can be inserted');

select throws_ok(
  $$
    insert into public.account_movements (
      legacy_id, account_id, local_id, source_type, source_id, direction,
      concept, amount, detail, actor_legacy_id, reversal_of
    ) values (
      'movement-1-reversal-duplicate',
      '50000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      'AJUSTE', 'test-source', 'SALIDA', 'REVERSO_DUPLICADO', 1000,
      'No debe confirmar', 'admin-sql',
      '80000000-0000-0000-0000-000000000001'
    )
  $$,
  'an original ledger row can have only one reversal'
);

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
  entity_id
) values (
  '90000000-0000-0000-0000-000000000001',
  'audit-1',
  '10000000-0000-0000-0000-000000000001',
  'admin-sql',
  'Administrador SQL',
  'ADMINISTRADOR',
  'ADMINISTRADOR',
  'Prueba',
  'Cuenta',
  'movement-1'
);

select throws_ok(
  $$update public.audit_events set action = 'Alterada' where legacy_id = 'audit-1'$$,
  'audit events cannot be updated'
);

select throws_ok(
  $$
    insert into public.salary_settlements (
      legacy_id, period_month, balance_id, staff_id, staff_name_snapshot,
      local_id, payment_account_id, concept, origin, created_by_legacy_id,
      created_by_name_snapshot
    ) values (
      'salary-invalid-origin', '2026-07-01',
      '60000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001', 'Ana Prueba',
      '20000000-0000-0000-0000-000000000001',
      '50000000-0000-0000-0000-000000000001',
      'SALARIO', 'LIQUIDACION', 'admin-sql', 'Administrador SQL'
    )
  $$,
  'Principal salary settlements cannot be linked to a cash balance'
);

insert into public.salary_closures (
  id,
  legacy_id,
  visible_id,
  period_month,
  start_date,
  end_date,
  period_label,
  kind,
  status,
  note,
  created_by,
  created_by_legacy_id,
  created_by_name_snapshot,
  closed_by,
  closed_by_legacy_id,
  closed_by_name_snapshot,
  closed_at
) values (
  '62000000-0000-0000-0000-000000000001',
  'salary-closure-1',
  'SAL-2026-07',
  '2026-07-01',
  '2026-07-01',
  '2026-07-31',
  'Julio 2026',
  'ORDINARIO',
  'CERRADO',
  'Cierre de prueba',
  '10000000-0000-0000-0000-000000000001',
  'admin-sql',
  'Administrador SQL',
  '10000000-0000-0000-0000-000000000001',
  'admin-sql',
  'Administrador SQL',
  '2026-08-01T10:00:00Z'
);

insert into public.salary_closure_locals (closure_id, local_id)
values (
  '62000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001'
);

select throws_ok(
  $$
    insert into public.salary_closure_employee_snapshots (
      closure_id, staff_id, staff_name_snapshot, position_snapshot, local_id,
      salary_type, base_salary, salary_paid, advances, extra_amount, bonuses,
      deductions, total_amount, base_covered_amount, liquidated_amount,
      pending_amount
    ) values (
      '62000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002',
      'Berta Segundo',
      'Cajera/o',
      '20000000-0000-0000-0000-000000000002',
      'MENSUAL',
      45000, 0, 0, 0, 0, 0, 45000, 0, 0, 45000
    )
  $$,
  'salary snapshots cannot introduce a local outside the closure scope'
);

select throws_ok(
  $$
    insert into public.command_requests (
      actor_id, actual_role, requested_function, command_name, local_id,
      idempotency_key, request_hash
    ) values (
      '10000000-0000-0000-0000-000000000001',
      'ADMINISTRADOR',
      'ADMINISTRADOR',
      'test.command',
      '20000000-0000-0000-0000-000000000001',
      'test-key-123',
      'not-a-sha256'
    )
  $$,
  'idempotency requests require a SHA-256 request hash'
);

select throws_ok(
  $$
    insert into public.attachments (
      legacy_id,
      owner_type,
      owner_local_id,
      storage_bucket,
      storage_path,
      file_name,
      mime_type,
      size_bytes,
      uploaded_by_legacy_id
    ) values (
      'attachment-public',
      'LOCAL',
      '20000000-0000-0000-0000-000000000001',
      'public-assets',
      'locals/1/photo.jpg',
      'photo.jpg',
      'image/jpeg',
      1000,
      'admin-sql'
    )
  $$,
  'attachment metadata cannot target a non-private bucket'
);

select * from finish();
rollback;
