begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(9);

insert into auth.users (id, email) values
  ('16000000-0000-4000-8000-000000000001', 'cashier-session@poseidon.test'),
  ('16000000-0000-4000-8000-000000000002', 'manager-session@poseidon.test'),
  ('16000000-0000-4000-8000-000000000003', 'admin-session@poseidon.test');

insert into public.profiles (
  id, legacy_id, username, display_name, role, status
) values
  (
    '16000000-0000-4000-8000-000000000001',
    'cashier-session',
    'cashier-session',
    'Cajero sesion',
    'CAJERO',
    'ACTIVO'
  ),
  (
    '16000000-0000-4000-8000-000000000002',
    'manager-session',
    'manager-session',
    'Encargado sesion',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '16000000-0000-4000-8000-000000000003',
    'admin-session',
    'admin-session',
    'Administrador sesion',
    'ADMINISTRADOR',
    'ACTIVO'
  );

insert into public.locals (
  id, legacy_id, visible_id, name, is_primary
) values
  (
    '26000000-0000-4000-8000-000000000001',
    'session-local-1',
    '11',
    'Poseidon sesion',
    true
  ),
  (
    '26000000-0000-4000-8000-000000000002',
    'session-local-2',
    '12',
    'Local ajeno sesion',
    false
  );

insert into public.user_locals (user_id, local_id) values
  (
    '16000000-0000-4000-8000-000000000001',
    '26000000-0000-4000-8000-000000000001'
  ),
  (
    '16000000-0000-4000-8000-000000000002',
    '26000000-0000-4000-8000-000000000001'
  );

select set_config(
  'request.jwt.claim.sub',
  '16000000-0000-4000-8000-000000000002',
  true
);

select is(
  public.poseidon_session_context() #>> '{profile,id}',
  '16000000-0000-4000-8000-000000000002',
  'session context derives the profile from auth.uid'
);

select is(
  jsonb_array_length(public.poseidon_session_context() -> 'locals'),
  1,
  'manager receives only assigned locals'
);

select set_config(
  'request.jwt.claim.sub',
  '16000000-0000-4000-8000-000000000003',
  true
);

select is(
  jsonb_array_length(public.poseidon_session_context() -> 'locals'),
  2,
  'administrator receives every local through the server context'
);

select is(
  (public.poseidon_session_context() ->> 'schema_version')::integer,
  4,
  'session context declares the remote schema contract'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.poseidon_session_context()',
    'EXECUTE'
  ),
  'authenticated users may execute only the session context RPC'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.poseidon_session_context()',
    'EXECUTE'
  ),
  'anonymous users cannot execute the session context RPC'
);

select has_trigger(
  'public',
  'locals',
  'locals_no_delete',
  'locals preserve historical references through logical state changes'
);

select has_trigger(
  'public',
  'machines',
  'machines_no_delete',
  'machines preserve historical references through logical state changes'
);

select throws_ok(
  $$
    delete from public.locals
    where id = '26000000-0000-4000-8000-000000000002'
  $$,
  'direct master deletion is rejected even for privileged maintenance code'
);

select * from finish();
rollback;
