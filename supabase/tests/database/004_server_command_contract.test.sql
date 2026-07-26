begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(10);

insert into auth.users (id, email) values
  ('12000000-0000-0000-0000-000000000001', 'manager-command@poseidon.test'),
  ('12000000-0000-0000-0000-000000000002', 'inactive-command@poseidon.test');

insert into public.profiles (id, legacy_id, username, display_name, role, status) values
  (
    '12000000-0000-0000-0000-000000000001',
    'manager-command',
    'manager-command',
    'Encargado comandos',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '12000000-0000-0000-0000-000000000002',
    'inactive-command',
    'inactive-command',
    'Usuario inactivo',
    'CAJERO',
    'INACTIVO'
  );

insert into public.locals (id, legacy_id, visible_id, name, is_primary) values
  ('22000000-0000-0000-0000-000000000001', '1', '1', 'Poseidon', true),
  ('22000000-0000-0000-0000-000000000002', '2', '2', 'Local ajeno', false);

insert into public.user_locals (user_id, local_id) values
  ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001'),
  ('12000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001');

select set_config(
  'request.jwt.claim.sub',
  '12000000-0000-0000-0000-000000000001',
  true
);

select is(
  (
    select actor_id
    from private.assert_command_context(
      'ENCARGADO',
      '22000000-0000-0000-0000-000000000001'
    )
  ),
  '12000000-0000-0000-0000-000000000001'::uuid,
  'the authenticated user is the command actor'
);

select is(
  (
    select actual_role::text
    from private.assert_command_context(
      'CAJERO',
      '22000000-0000-0000-0000-000000000001'
    )
  ),
  'ENCARGADO',
  'a manager may explicitly request the cashier function without changing actual role'
);

select throws_ok(
  $$
    select *
    from private.assert_command_context(
      'ADMINISTRADOR',
      '22000000-0000-0000-0000-000000000001'
    )
  $$,
  'a manager cannot request the administrator function'
);

select throws_ok(
  $$
    select *
    from private.assert_command_context(
      'ENCARGADO',
      '22000000-0000-0000-0000-000000000002'
    )
  $$,
  'a non-admin cannot operate an unassigned local'
);

select set_config(
  'request.jwt.claim.sub',
  '12000000-0000-0000-0000-000000000002',
  true
);

select throws_ok(
  $$
    select *
    from private.assert_command_context(
      'CAJERO',
      '22000000-0000-0000-0000-000000000001'
    )
  $$,
  'an inactive profile cannot execute server commands'
);

select set_config(
  'request.jwt.claim.sub',
  '12000000-0000-0000-0000-000000000001',
  true
);

select is(
  (
    select actor_id
    from private.claim_command(
      'ENCARGADO',
      '22000000-0000-0000-0000-000000000001',
      'expense.create',
      'request-key-0001',
      repeat('a', 64)
    )
  ),
  '12000000-0000-0000-0000-000000000001'::uuid,
  'idempotency claims derive their actor from auth.uid()'
);

select is(
  (
    select actual_role::text
    from public.command_requests
    where actor_id = '12000000-0000-0000-0000-000000000001'
      and command_name = 'expense.create'
      and idempotency_key = 'request-key-0001'
  ),
  'ENCARGADO',
  'idempotency records preserve the actual server-derived role'
);

select is(
  (
    select id
    from private.claim_command(
      'ENCARGADO',
      '22000000-0000-0000-0000-000000000001',
      'expense.create',
      'request-key-0001',
      repeat('a', 64)
    )
  ),
  (
    select id
    from public.command_requests
    where actor_id = '12000000-0000-0000-0000-000000000001'
      and command_name = 'expense.create'
      and idempotency_key = 'request-key-0001'
  ),
  'an exact idempotent replay returns the original claim'
);

select throws_ok(
  $$
    select *
    from private.claim_command(
      'ENCARGADO',
      '22000000-0000-0000-0000-000000000001',
      'expense.create',
      'request-key-0001',
      repeat('b', 64)
    )
  $$,
  'an idempotency key cannot be reused with a different request hash'
);

select is(
  (
    select status::text
    from private.finish_command(
      (
        select id
        from public.command_requests
        where actor_id = '12000000-0000-0000-0000-000000000001'
          and command_name = 'expense.create'
          and idempotency_key = 'request-key-0001'
      ),
      'APLICADO',
      '{"ok":true}'::jsonb
    )
  ),
  'APLICADO',
  'only a pending claim belonging to the authenticated actor can be completed'
);

select * from finish();
rollback;
