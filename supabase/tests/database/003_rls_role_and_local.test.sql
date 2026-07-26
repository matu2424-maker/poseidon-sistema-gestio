begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(23);

insert into auth.users (id, email) values
  ('11000000-0000-0000-0000-000000000001', 'cashier@poseidon.test'),
  ('11000000-0000-0000-0000-000000000002', 'manager@poseidon.test'),
  ('11000000-0000-0000-0000-000000000003', 'admin@poseidon.test'),
  ('11000000-0000-0000-0000-000000000004', 'inactive@poseidon.test');

insert into public.profiles (id, legacy_id, username, display_name, role, status) values
  ('11000000-0000-0000-0000-000000000001', 'cashier', 'cashier', 'Cajero SQL', 'CAJERO', 'ACTIVO'),
  ('11000000-0000-0000-0000-000000000002', 'manager', 'manager', 'Encargado SQL', 'ENCARGADO', 'ACTIVO'),
  ('11000000-0000-0000-0000-000000000003', 'admin', 'admin', 'Administrador SQL', 'ADMINISTRADOR', 'ACTIVO'),
  ('11000000-0000-0000-0000-000000000004', 'inactive', 'inactive', 'Inactivo SQL', 'CAJERO', 'INACTIVO');

insert into public.locals (id, legacy_id, visible_id, name, is_primary) values
  ('21000000-0000-0000-0000-000000000001', '1', '1', 'Poseidon', true),
  ('21000000-0000-0000-0000-000000000002', '2', '2', 'Local ajeno', false);

insert into public.user_locals (user_id, local_id) values
  ('11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000001');

insert into public.staff (
  id, legacy_id, visible_id, local_id, first_name, last_name, document_id,
  hire_date, position, salary_type
) values
  (
    '61000000-0000-0000-0000-000000000001',
    'staff-local-1',
    '1',
    '21000000-0000-0000-0000-000000000001',
    'Ana',
    'Poseidon',
    'STAFF-RLS-1',
    '2026-01-01',
    'CAJERO_A',
    'MENSUAL'
  ),
  (
    '61000000-0000-0000-0000-000000000002',
    'staff-local-2',
    '2',
    '21000000-0000-0000-0000-000000000002',
    'Berta',
    'Ajena',
    'STAFF-RLS-2',
    '2026-01-01',
    'CAJERO_A',
    'MENSUAL'
  );

insert into public.clients (
  id, legacy_id, visible_id, local_id, name, document_type, document_id
) values
  (
    '31000000-0000-0000-0000-000000000001',
    'client-1',
    '1',
    '21000000-0000-0000-0000-000000000001',
    'Cliente Poseidon',
    'CEDULA',
    'DOC-RLS-1'
  ),
  (
    '31000000-0000-0000-0000-000000000002',
    'client-2',
    '2',
    '21000000-0000-0000-0000-000000000002',
    'Cliente ajeno',
    'PASAPORTE',
    'DOC-RLS-2'
  );

insert into public.current_accounts (
  id, legacy_id, kind, local_id, staff_id, name
) values
  (
    '71000000-0000-0000-0000-000000000001',
    'account-local-cash',
    'LOCAL_EFECTIVO',
    '21000000-0000-0000-0000-000000000001',
    null,
    'Caja / Efectivo'
  ),
  (
    '71000000-0000-0000-0000-000000000002',
    'account-staff',
    'PERSONAL',
    '21000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    'Cuenta personal Ana'
  ),
  (
    '71000000-0000-0000-0000-000000000003',
    'account-principal-cash',
    'PRINCIPAL_EFECTIVO',
    null,
    null,
    'Principal / Efectivo'
  );

insert into public.cash_balances (
  id, legacy_id, visible_id, local_id, operating_date, initial_cash,
  opened_by, opened_by_legacy_id, opened_by_role
) values (
  '72000000-0000-0000-0000-000000000001',
  'balance-rls-1',
  'POSE-RLS-1',
  '21000000-0000-0000-0000-000000000001',
  '2026-07-26',
  1000,
  '11000000-0000-0000-0000-000000000001',
  'cashier',
  'CAJERO'
);

insert into public.expense_categories (id, legacy_id, name)
values ('73000000-0000-0000-0000-000000000001', 'category-rls', 'Servicios');

insert into public.expense_subcategories (id, legacy_id, category_id, name)
values (
  '73000000-0000-0000-0000-000000000002',
  'subcategory-rls',
  '73000000-0000-0000-0000-000000000001',
  'Internet'
);

insert into public.expenses (
  id, legacy_id, balance_id, local_id, payment_account_id, category_id,
  subcategory_id, category_name_snapshot, subcategory_name_snapshot, amount,
  created_by, created_by_legacy_id
) values
  (
    '74000000-0000-0000-0000-000000000001',
    'expense-cash',
    '72000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0000-000000000002',
    'Servicios',
    'Internet',
    100,
    '11000000-0000-0000-0000-000000000001',
    'cashier'
  ),
  (
    '74000000-0000-0000-0000-000000000002',
    'expense-principal',
    null,
    '21000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000003',
    '73000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0000-000000000002',
    'Servicios',
    'Internet',
    200,
    '11000000-0000-0000-0000-000000000002',
    'manager'
  );

insert into public.attachments (
  legacy_id, owner_type, owner_local_id, expense_id, storage_path, file_name,
  mime_type, size_bytes, uploaded_by_legacy_id
) values
  (
    'attachment-cash-expense',
    'GASTO_COMPROBANTE',
    '21000000-0000-0000-0000-000000000001',
    '74000000-0000-0000-0000-000000000001',
    'expenses/cash/receipt.pdf',
    'cash.pdf',
    'application/pdf',
    100,
    'cashier'
  ),
  (
    'attachment-principal-expense',
    'GASTO_COMPROBANTE',
    '21000000-0000-0000-0000-000000000001',
    '74000000-0000-0000-0000-000000000002',
    'expenses/principal/receipt.pdf',
    'principal.pdf',
    'application/pdf',
    100,
    'manager'
  );

insert into public.machines (
  id, legacy_id, visible_id, name, current_location_kind,
  current_local_id, location_label
) values
  (
    '41000000-0000-0000-0000-000000000001',
    'machine-local-1',
    '1',
    'Maquina Poseidon',
    'LOCAL',
    '21000000-0000-0000-0000-000000000001',
    'Poseidon'
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    'machine-local-2',
    '2',
    'Maquina ajena',
    'LOCAL',
    '21000000-0000-0000-0000-000000000002',
    'Local ajeno'
  ),
  (
    '41000000-0000-0000-0000-000000000003',
    'machine-workshop',
    '3',
    'Maquina Taller',
    'TALLER',
    null,
    'Taller'
  );

insert into public.audit_events (
  id, legacy_id, actor_id, actor_legacy_id, actor_name_snapshot,
  actual_role, requested_function, action, entity_type, entity_id,
  primary_local_id
) values
  (
    '51000000-0000-0000-0000-000000000001',
    'audit-cashier',
    '11000000-0000-0000-0000-000000000001',
    'cashier',
    'Cajero SQL',
    'CAJERO',
    'CAJERO',
    'Crear gasto',
    'Gasto',
    'expense-1',
    '21000000-0000-0000-0000-000000000001'
  ),
  (
    '51000000-0000-0000-0000-000000000002',
    'audit-manager',
    '11000000-0000-0000-0000-000000000002',
    'manager',
    'Encargado SQL',
    'ENCARGADO',
    'ENCARGADO',
    'Revisar gasto',
    'Gasto',
    'expense-1',
    '21000000-0000-0000-0000-000000000001'
  ),
  (
    '51000000-0000-0000-0000-000000000003',
    'audit-multilocal',
    '11000000-0000-0000-0000-000000000002',
    'manager',
    'Encargado SQL',
    'ENCARGADO',
    'ENCARGADO',
    'Evento multilocal',
    'Cierre',
    'closure-1',
    '21000000-0000-0000-0000-000000000001'
  );

insert into public.audit_event_locals (audit_event_id, local_id) values
  ('51000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001'),
  ('51000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001'),
  ('51000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001'),
  ('51000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000002';

select is((select count(*) from public.locals), 1::bigint, 'manager sees only assigned locals');
select is((select count(*) from public.clients), 1::bigint, 'manager sees only clients of assigned locals');
select is((select count(*) from public.machines), 1::bigint, 'manager cannot see workshop or unassigned machines');
select is((select count(*) from public.profiles), 1::bigint, 'manager reads only the own profile');
select is((select count(*) from public.audit_events), 2::bigint, 'manager sees all audit events in the assigned local');
select is((select count(*) from public.staff), 1::bigint, 'manager sees staff only in assigned locals');
select is((select count(*) from public.current_accounts), 3::bigint, 'manager sees local, personal and principal accounts');
select is((select count(*) from public.expenses), 2::bigint, 'manager sees Caja and Principal expenses for the assigned local');
select is((select count(*) from public.attachments), 2::bigint, 'manager sees Caja and Principal expense attachments');
select throws_ok(
  $$insert into public.expenses (legacy_id) values ('forbidden-write')$$,
  'manager cannot write an operational table directly'
);
select throws_ok(
  $$select * from public.command_requests$$,
  'manager cannot read idempotency internals'
);

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000001';

select is((select count(*) from public.locals), 1::bigint, 'cashier sees the assigned local');
select is((select count(*) from public.audit_events), 1::bigint, 'cashier sees only own audit events in the assigned local');
select is((select count(*) from public.audit_event_locals), 1::bigint, 'cashier cannot infer scope of other audit events');
select is((select count(*) from public.staff), 0::bigint, 'cashier cannot read sensitive staff rows');
select is((select count(*) from public.current_accounts), 1::bigint, 'cashier sees Caja accounts but not personal or Principal accounts');
select is((select count(*) from public.expenses), 1::bigint, 'cashier sees Caja expenses but not Principal expenses');
select is((select count(*) from public.attachments), 1::bigint, 'cashier cannot read attachments from Principal expenses');

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000003';

select is((select count(*) from public.locals), 2::bigint, 'administrator sees every local');
select is((select count(*) from public.clients), 2::bigint, 'administrator sees clients from every local');
select is((select count(*) from public.machines), 3::bigint, 'administrator also sees workshop machines');
select is((select count(*) from public.audit_events), 3::bigint, 'administrator sees multilocal audit events');

set local request.jwt.claim.sub = '11000000-0000-0000-0000-000000000004';

select is((select count(*) from public.locals), 0::bigint, 'inactive users cannot read assigned operational data');

select * from finish();
rollback;
