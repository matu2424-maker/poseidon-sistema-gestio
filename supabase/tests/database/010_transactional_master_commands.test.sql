begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_catalog;

select plan(66);

select is(
  (
    select count(*)::bigint
    from (
      values
        ('public.poseidon_save_local(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_delete_local(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_save_machine(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_reset_machine_counters(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_move_machine_to_workshop(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_delete_machine(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_assign_machines_to_local(text,public.app_role,uuid,jsonb)')
    ) target(signature)
    join pg_catalog.pg_proc p
      on p.oid = pg_catalog.to_regprocedure(target.signature)
    where p.prosecdef
      and p.provolatile = 'v'
      and p.prorettype = 'jsonb'::regtype
  ),
  7::bigint,
  'the seven master RPCs are volatile SECURITY DEFINER functions returning jsonb'
);

select ok(
  (
    select pg_catalog.bool_and(
      pg_catalog.has_function_privilege('authenticated', target.signature, 'EXECUTE')
      and not pg_catalog.has_function_privilege('anon', target.signature, 'EXECUTE')
    )
    from (
      values
        ('public.poseidon_save_local(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_delete_local(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_save_machine(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_reset_machine_counters(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_move_machine_to_workshop(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_delete_machine(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_assign_machines_to_local(text,public.app_role,uuid,jsonb)')
    ) target(signature)
  ),
  'only authenticated may execute the master RPCs'
);

select ok(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'private.master_uuid_array(jsonb,text,boolean)',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'private.assert_master_administrator(uuid)',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'private.master_machine_is_tombstoned(uuid)',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'private.master_local_is_tombstoned(uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute private master helpers'
);

select has_trigger(
  'public',
  'machine_history',
  'machine_history_append_only',
  'machine history and QUITADA tombstones remain append-only'
);

select has_trigger(
  'public',
  'audit_events',
  'audit_events_append_only',
  'master audit and local tombstones remain append-only'
);

select ok(
  pg_catalog.strpos(
    pg_catalog.lower(
      pg_catalog.pg_get_functiondef(
        'public.poseidon_delete_local(text,public.app_role,uuid,jsonb)'::regprocedure
      )
    ),
    'delete from public.locals'
  ) = 0
  and pg_catalog.strpos(
    pg_catalog.lower(
      pg_catalog.pg_get_functiondef(
        'public.poseidon_delete_machine(text,public.app_role,uuid,jsonb)'::regprocedure
      )
    ),
    'delete from public.machines'
  ) = 0,
  'master removal commands never physically delete locals or machines'
);

select ok(
  (
    select pg_catalog.bool_and(
      pg_catalog.strpos(
        pg_catalog.lower(pg_catalog.pg_get_functiondef(p.oid)),
        'for update'
      ) > 0
    )
    from (
      values
        ('public.poseidon_save_local(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_delete_local(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_save_machine(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_reset_machine_counters(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_move_machine_to_workshop(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_delete_machine(text,public.app_role,uuid,jsonb)'),
        ('public.poseidon_assign_machines_to_local(text,public.app_role,uuid,jsonb)')
    ) target(signature)
    join pg_catalog.pg_proc p
      on p.oid = pg_catalog.to_regprocedure(target.signature)
  ),
  'all master commands lock their mutable master rows'
);

insert into auth.users (id, email) values
  ('15000000-0000-0000-0000-000000000001', 'cashier-masters@poseidon.test'),
  ('15000000-0000-0000-0000-000000000002', 'manager-masters@poseidon.test'),
  ('15000000-0000-0000-0000-000000000003', 'admin-masters@poseidon.test'),
  ('15000000-0000-0000-0000-000000000004', 'inactive-admin-masters@poseidon.test');

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
    'cashier-masters',
    'cashier-masters',
    'Cajero Maestros',
    'CAJERO',
    'ACTIVO'
  ),
  (
    '15000000-0000-0000-0000-000000000002',
    'manager-masters',
    'manager-masters',
    'Encargado Maestros',
    'ENCARGADO',
    'ACTIVO'
  ),
  (
    '15000000-0000-0000-0000-000000000003',
    'admin-masters',
    'admin-masters',
    'Administrador Maestros',
    'ADMINISTRADOR',
    'ACTIVO'
  ),
  (
    '15000000-0000-0000-0000-000000000004',
    'inactive-admin-masters',
    'inactive-admin-masters',
    'Administrador Inactivo Maestros',
    'ADMINISTRADOR',
    'INACTIVO'
  );

insert into public.locals (
  id,
  legacy_id,
  visible_id,
  name,
  status,
  is_primary
) values
  (
    '25000000-0000-0000-0000-000000000001',
    'masters-local-primary',
    '71',
    'Principal Maestros',
    'ACTIVO',
    true
  ),
  (
    '25000000-0000-0000-0000-000000000002',
    'masters-local-assign',
    '72',
    'Asignacion Maestros',
    'ACTIVO',
    false
  ),
  (
    '25000000-0000-0000-0000-000000000003',
    'masters-local-close',
    '73',
    'Cierre Maestros',
    'ACTIVO',
    false
  ),
  (
    '25000000-0000-0000-0000-000000000004',
    'masters-local-open',
    '74',
    'Caja Abierta Maestros',
    'ACTIVO',
    false
  ),
  (
    '25000000-0000-0000-0000-000000000005',
    'masters-local-delete',
    '75',
    'Baja Maestros',
    'ACTIVO',
    false
  ),
  (
    '25000000-0000-0000-0000-000000000006',
    'masters-local-closed',
    '76',
    'Cerrado Maestros',
    'CERRADO',
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
  );

insert into public.current_accounts (
  id,
  legacy_id,
  kind,
  local_id,
  name,
  status
) values
  (
    '55000000-0000-0000-0000-000000000001',
    'masters-close-cash',
    'LOCAL_EFECTIVO',
    '25000000-0000-0000-0000-000000000003',
    'Cierre Maestros - Caja / Efectivo',
    'ACTIVA'
  ),
  (
    '55000000-0000-0000-0000-000000000002',
    'masters-close-bank',
    'LOCAL_BANCO',
    '25000000-0000-0000-0000-000000000003',
    'Cierre Maestros - Caja / Banco',
    'ACTIVA'
  ),
  (
    '55000000-0000-0000-0000-000000000003',
    'masters-delete-cash',
    'LOCAL_EFECTIVO',
    '25000000-0000-0000-0000-000000000005',
    'Baja Maestros - Caja / Efectivo',
    'ACTIVA'
  ),
  (
    '55000000-0000-0000-0000-000000000004',
    'masters-delete-bank',
    'LOCAL_BANCO',
    '25000000-0000-0000-0000-000000000005',
    'Baja Maestros - Caja / Banco',
    'ACTIVA'
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
    '35000000-0000-0000-0000-000000000001',
    'masters-workshop-one',
    '801',
    'Taller Uno',
    'TALLER',
    null,
    'Taller',
    0,
    0,
    'ACTIVA'
  ),
  (
    '35000000-0000-0000-0000-000000000002',
    'masters-workshop-two',
    '802',
    'Taller Dos',
    'TALLER',
    null,
    'Taller',
    10,
    5,
    'ACTIVA'
  ),
  (
    '35000000-0000-0000-0000-000000000003',
    'masters-workshop-disuse',
    '803',
    'Taller Desuso',
    'TALLER',
    null,
    'Taller',
    0,
    0,
    'DESUSO'
  ),
  (
    '35000000-0000-0000-0000-000000000004',
    'masters-close-machine',
    '804',
    'Maquina Cierre',
    'LOCAL',
    '25000000-0000-0000-0000-000000000003',
    'Cierre Maestros',
    100,
    40,
    'ACTIVA'
  ),
  (
    '35000000-0000-0000-0000-000000000005',
    'masters-open-machine',
    '805',
    'Maquina Caja Abierta',
    'LOCAL',
    '25000000-0000-0000-0000-000000000004',
    'Caja Abierta Maestros',
    90,
    40,
    'ACTIVA'
  ),
  (
    '35000000-0000-0000-0000-000000000006',
    'masters-reading-machine',
    '806',
    'Maquina con Recaudacion',
    'TALLER',
    null,
    'Taller',
    10,
    3,
    'ACTIVA'
  ),
  (
    '35000000-0000-0000-0000-000000000007',
    'masters-reset-machine',
    '807',
    'Maquina Reset',
    'LOCAL',
    '25000000-0000-0000-0000-000000000002',
    'Asignacion Maestros',
    100,
    50,
    'ACTIVA'
  ),
  (
    '35000000-0000-0000-0000-000000000008',
    'masters-delete-machine',
    '808',
    'Maquina Baja',
    'TALLER',
    null,
    'Taller',
    20,
    10,
    'ACTIVA'
  ),
  (
    '35000000-0000-0000-0000-000000000009',
    'masters-move-machine',
    '809',
    'Maquina Traslado',
    'LOCAL',
    '25000000-0000-0000-0000-000000000002',
    'Asignacion Maestros',
    30,
    15,
    'ACTIVA'
  ),
  (
    '35000000-0000-0000-0000-000000000010',
    'masters-delete-local-machine',
    '810',
    'Maquina Baja Local',
    'LOCAL',
    '25000000-0000-0000-0000-000000000005',
    'Baja Maestros',
    40,
    20,
    'ACTIVA'
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
  opened_by_role
) values
  (
    '45000000-0000-0000-0000-000000000001',
    'masters-open-balance',
    'MASTERS-OPEN-1',
    '25000000-0000-0000-0000-000000000004',
    '2026-07-26',
    'EN_PROCESO',
    0,
    0,
    '15000000-0000-0000-0000-000000000003',
    'admin-masters',
    'ADMINISTRADOR'
  ),
  (
    '45000000-0000-0000-0000-000000000002',
    'masters-historical-balance',
    'MASTERS-HIST-1',
    '25000000-0000-0000-0000-000000000001',
    '2026-07-25',
    'CERRADO',
    0,
    0,
    '15000000-0000-0000-0000-000000000003',
    'admin-masters',
    'ADMINISTRADOR'
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
  '46000000-0000-0000-0000-000000000001',
  'masters-reading-one',
  '45000000-0000-0000-0000-000000000002',
  '25000000-0000-0000-0000-000000000001',
  '35000000-0000-0000-0000-000000000006',
  0,
  10,
  0,
  3,
  7,
  'CARGADA',
  '15000000-0000-0000-0000-000000000003',
  'admin-masters'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000001',
  true
);

select throws_ok(
  $$
    select public.poseidon_save_machine(
      'masters-cashier-denied-0001',
      'CAJERO',
      null,
      '{"visibleId":"898","name":"No autorizado","localId":"taller","status":"ACTIVA"}'::jsonb
    )
  $$,
  'master data commands require the administrator role and function'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000002',
  true
);

select throws_ok(
  $$
    select public.poseidon_save_local(
      'masters-manager-denied-0001',
      'ENCARGADO',
      null,
      '{"visibleId":"78","name":"No autorizado","status":"ACTIVO"}'::jsonb
    )
  $$,
  'master data commands require the administrator role and function'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000003',
  true
);

select throws_ok(
  $$
    select public.poseidon_save_local(
      'masters-admin-function-denied-1',
      'ENCARGADO',
      null,
      '{"visibleId":"78","name":"Funcion incorrecta","status":"ACTIVO"}'::jsonb
    )
  $$,
  'master data commands require the administrator role and function'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000004',
  true
);

select throws_ok(
  $$
    select public.poseidon_save_machine(
      'masters-inactive-admin-denied1',
      'ADMINISTRADOR',
      null,
      '{"visibleId":"898","name":"Inactiva","localId":"taller","status":"ACTIVA"}'::jsonb
    )
  $$,
  'active profile required'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      count(*) filter (where l.visible_id = '78'),
      (
        select count(*)
        from public.machines m
        where m.visible_id = '898'
      ),
      (
        select count(*)
        from public.command_requests cr
        where cr.idempotency_key like 'masters-%-denied%'
      )
    )
    from public.locals l
  ),
  '[0,0,0]'::jsonb,
  'authorization rejections create no master rows or command requests'
);

select set_config(
  'request.jwt.claim.sub',
  '15000000-0000-0000-0000-000000000003',
  true
);

select is(
  (
    public.poseidon_save_local(
      'masters-create-local-0000001',
      'ADMINISTRADOR',
      null,
      '{
        "visibleId":"77",
        "name":"Nuevo Maestros",
        "tenantName":"Locatario",
        "phone":"099123456",
        "email":"nuevo@poseidon.test",
        "address":"",
        "googleMapsUrl":"https://maps.example/masters",
        "status":"ACTIVO",
        "selectedWorkshopMachineIds":[
          "35000000-0000-0000-0000-000000000001"
        ]
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'administrator creates a local atomically'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      l.visible_id,
      l.name,
      l.tenant_name,
      l.address,
      l.status,
      pg_catalog.jsonb_typeof(pg_catalog.to_jsonb(l.id))
    )
    from public.locals l
    where l.visible_id = '77'
  ),
  '["77","Nuevo Maestros","Locatario","Sin direccion","ACTIVO","string"]'::jsonb,
  'local creation stores normalized master fields and a UUID identity'
);

select is(
  (
    select pg_catalog.jsonb_build_object(
      'count',
      count(*),
      'active',
      count(*) filter (where ca.status = 'ACTIVA'),
      'kinds',
      pg_catalog.jsonb_agg(ca.kind order by ca.kind)
    )
    from public.current_accounts ca
    where ca.local_id = (
      select l.id from public.locals l where l.visible_id = '77'
    )
  ),
  '{"count":2,"active":2,"kinds":["LOCAL_EFECTIVO","LOCAL_BANCO"]}'::jsonb,
  'local creation creates its two active current accounts'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      m.current_location_kind,
      m.current_local_id,
      m.location_label
    )
    from public.machines m
    where m.id = '35000000-0000-0000-0000-000000000001'
  ),
  (
    select pg_catalog.jsonb_build_array('LOCAL', l.id, l.name)
    from public.locals l
    where l.visible_id = '77'
  ),
  'selected workshop machine is assigned to the new local'
);

select is(
  (
    select count(*)::integer
    from public.machine_history mh
    where mh.machine_id = '35000000-0000-0000-0000-000000000001'
      and mh.action = 'MOVIDA'
  ),
  2,
  'local creation appends paired source and destination machine history'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      ae.actual_role,
      ae.requested_function,
      ae.actor_id,
      (
        select count(*)
        from public.audit_event_locals ael
        where ael.audit_event_id = ae.id
      )
    )
    from public.audit_events ae
    where ae.action = 'Crear local'
      and ae.entity_id = (
        select l.id::text from public.locals l where l.visible_id = '77'
      )
  ),
  '[
    "ADMINISTRADOR",
    "ADMINISTRADOR",
    "15000000-0000-0000-0000-000000000003",
    1
  ]'::jsonb,
  'local audit derives real identity, requested function and frozen local scope'
);

select is(
  public.poseidon_save_local(
    'masters-create-local-0000001',
    'ADMINISTRADOR',
    null,
    '{
      "visibleId":"77",
      "name":"Nuevo Maestros",
      "tenantName":"Locatario",
      "phone":"099123456",
      "email":"nuevo@poseidon.test",
      "address":"",
      "googleMapsUrl":"https://maps.example/masters",
      "status":"ACTIVO",
      "selectedWorkshopMachineIds":[
        "35000000-0000-0000-0000-000000000001"
      ]
    }'::jsonb
  ),
  public.poseidon_save_local(
    'masters-create-local-0000001',
    'ADMINISTRADOR',
    null,
    '{
      "visibleId":"77",
      "name":"Nuevo Maestros",
      "tenantName":"Locatario",
      "phone":"099123456",
      "email":"nuevo@poseidon.test",
      "address":"",
      "googleMapsUrl":"https://maps.example/masters",
      "status":"ACTIVO",
      "selectedWorkshopMachineIds":[
        "35000000-0000-0000-0000-000000000001"
      ]
    }'::jsonb
  ),
  'identical local command replay returns the stored response'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      (select count(*) from public.locals l where l.visible_id = '77'),
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = '35000000-0000-0000-0000-000000000001'
          and mh.action = 'MOVIDA'
      ),
      (
        select count(*)
        from public.audit_events ae
        where ae.action = 'Crear local'
          and ae.entity_id = (
            select l.id::text from public.locals l where l.visible_id = '77'
          )
      ),
      (
        select count(*)
        from public.command_requests cr
        where cr.idempotency_key = 'masters-create-local-0000001'
          and cr.status = 'APLICADO'
      )
    )
  ),
  '[1,2,1,1]'::jsonb,
  'local replay duplicates no entity, history, audit or command request'
);

select throws_ok(
  $$
    select public.poseidon_save_local(
      'masters-create-local-0000001',
      'ADMINISTRADOR',
      null,
      '{"visibleId":"77","name":"Payload distinto","status":"ACTIVO"}'::jsonb
    )
  $$,
  'idempotency key was already used with a different request'
);

select throws_ok(
  $$
    select public.poseidon_save_local(
      'masters-duplicate-local-00001',
      'ADMINISTRADOR',
      null,
      '{"visibleId":"77","name":"ID duplicado","status":"ACTIVO"}'::jsonb
    )
  $$,
  'local visibleId already exists'
);

select throws_ok(
  $$
    select public.poseidon_save_local(
      'masters-invalid-local-phone1',
      'ADMINISTRADOR',
      null,
      '{"visibleId":"79","name":"Telefono invalido","phone":"09A","status":"ACTIVO"}'::jsonb
    )
  $$,
  'phone must contain only digits'
);

select is(
  (
    public.poseidon_save_local(
      'masters-edit-local-00000001',
      'ADMINISTRADOR',
      (select l.id from public.locals l where l.visible_id = '77'),
      '{"visibleId":"77","name":"Nuevo Editado","status":"INACTIVO"}'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'administrator edits an existing local'
);

select is(
  (
    select pg_catalog.jsonb_build_array(l.name, l.status)
    from public.locals l
    where l.visible_id = '77'
  ),
  '["Nuevo Editado","INACTIVO"]'::jsonb,
  'local edit persists the requested name and status'
);

select is(
  (
    select pg_catalog.jsonb_build_object(
      'names',
      pg_catalog.jsonb_agg(ca.name order by ca.kind),
      'active',
      count(*) filter (where ca.status = 'ACTIVA')
    )
    from public.current_accounts ca
    where ca.local_id = (
      select l.id from public.locals l where l.visible_id = '77'
    )
  ),
  '{
    "names":[
      "Nuevo Editado - Caja / Efectivo",
      "Nuevo Editado - Caja / Banco"
    ],
    "active":2
  }'::jsonb,
  'local edit synchronizes account names without closing active accounts'
);

select throws_ok(
  $$
    select public.poseidon_save_local(
      'masters-close-open-local-001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000004',
      '{"visibleId":"74","name":"Caja Abierta Maestros","status":"CERRADO"}'::jsonb
    )
  $$,
  'the local cannot be closed while it has an open cash balance'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      l.status,
      m.current_local_id,
      (
        select count(*)
        from public.audit_events ae
        where ae.entity_id = l.id::text
          and ae.action = 'Cerrar local'
      ),
      (
        select count(*)
        from public.command_requests cr
        where cr.idempotency_key = 'masters-close-open-local-001'
      )
    )
    from public.locals l
    join public.machines m
      on m.id = '35000000-0000-0000-0000-000000000005'
    where l.id = '25000000-0000-0000-0000-000000000004'
  ),
  '[
    "ACTIVO",
    "25000000-0000-0000-0000-000000000004",
    0,
    0
  ]'::jsonb,
  'blocked local closure leaves local, machine, audit and idempotency unchanged'
);

select is(
  (
    public.poseidon_save_local(
      'masters-close-local-0000001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000003',
      '{"visibleId":"73","name":"Cierre Maestros","status":"CERRADO"}'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'local without an open cash balance closes successfully'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      m.current_location_kind,
      m.current_local_id,
      m.location_label
    )
    from public.machines m
    where m.id = '35000000-0000-0000-0000-000000000004'
  ),
  '["TALLER",null,"Taller"]'::jsonb,
  'closing a local sends every associated machine to the workshop'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      (
        select count(*)
        from public.current_accounts ca
        where ca.local_id = '25000000-0000-0000-0000-000000000003'
          and ca.status = 'INACTIVA'
      ),
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = '35000000-0000-0000-0000-000000000004'
          and mh.action = 'MOVIDA'
      ),
      (
        select count(*)
        from public.audit_events ae
        where ae.entity_id = '25000000-0000-0000-0000-000000000003'
          and ae.action = 'Cerrar local'
      )
    )
  ),
  '[2,2,1]'::jsonb,
  'local closure atomically deactivates accounts and appends paired history and audit'
);

select throws_ok(
  $$
    select public.poseidon_delete_local(
      'masters-delete-primary-00001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000001',
      '{}'::jsonb
    )
  $$,
  'the primary local cannot be removed'
);

select is(
  (
    public.poseidon_delete_local(
      'masters-delete-local-0000001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000005',
      '{}'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'non-primary local is removed logically'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      l.status,
      (
        select count(*)
        from public.current_accounts ca
        where ca.local_id = l.id
          and ca.status = 'INACTIVA'
      ),
      m.current_location_kind,
      m.current_local_id
    )
    from public.locals l
    join public.machines m
      on m.id = '35000000-0000-0000-0000-000000000010'
    where l.id = '25000000-0000-0000-0000-000000000005'
  ),
  '["CERRADO",2,"TALLER",null]'::jsonb,
  'logical local removal retains the row, closes accounts and returns machines'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      (
        select count(*)
        from public.audit_events ae
        where ae.entity_id = '25000000-0000-0000-0000-000000000005'
          and ae.action = 'Quitar local'
      ),
      (
        select pg_catalog.bool_and((ae.new_value ->> 'tombstone')::boolean)
        from public.audit_events ae
        where ae.entity_id = '25000000-0000-0000-0000-000000000005'
          and ae.action = 'Quitar local'
      ),
      (
        select count(*)
        from public.audit_event_locals ael
        join public.audit_events ae on ae.id = ael.audit_event_id
        where ae.entity_id = '25000000-0000-0000-0000-000000000005'
          and ae.action = 'Quitar local'
      )
    )
  ),
  '[1,true,1]'::jsonb,
  'logical local removal appends one scoped audit tombstone'
);

select throws_ok(
  $$
    select public.poseidon_save_local(
      'masters-edit-deleted-local-01',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000005',
      '{"visibleId":"75","name":"No reabrir","status":"ACTIVO"}'::jsonb
    )
  $$,
  'the local was logically removed'
);

select is(
  (
    public.poseidon_save_machine(
      'masters-create-machine-00001',
      'ADMINISTRADOR',
      null,
      '{
        "visibleId":"899",
        "name":"Maquina Nueva",
        "localId":"taller",
        "status":"ACTIVA",
        "lastIn":999,
        "lastOut":888,
        "notes":"Alta remota"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'administrator creates a machine'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      m.current_location_kind,
      m.current_local_id,
      m.location_label,
      m.last_in,
      m.last_out,
      m.status
    )
    from public.machines m
    where m.visible_id = '899'
  ),
  '["TALLER",null,"Taller",0,0,"ACTIVA"]'::jsonb,
  'new machine always starts in the workshop with zero counters'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = m.id
          and mh.action = 'AGREGADA'
      ),
      (
        select count(*)
        from public.audit_events ae
        where ae.entity_id = m.id::text
          and ae.action = 'Crear maquina'
      ),
      (
        select count(*)
        from public.audit_event_locals ael
        join public.audit_events ae on ae.id = ael.audit_event_id
        where ae.entity_id = m.id::text
          and ae.action = 'Crear maquina'
      )
    )
    from public.machines m
    where m.visible_id = '899'
  ),
  '[1,1,0]'::jsonb,
  'workshop machine creation appends history and global administrator audit'
);

select throws_ok(
  $$
    select public.poseidon_save_machine(
      'masters-duplicate-machine-001',
      'ADMINISTRADOR',
      null,
      '{"visibleId":"899","name":"ID repetido","localId":"taller","status":"ACTIVA"}'::jsonb
    )
  $$,
  'machine visibleId already exists'
);

select throws_ok(
  $$
    select public.poseidon_save_machine(
      'masters-disuse-local-denied1',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000002',
      '{
        "machineId":"35000000-0000-0000-0000-000000000007",
        "visibleId":"807",
        "name":"Maquina Reset",
        "localId":"25000000-0000-0000-0000-000000000002",
        "status":"DESUSO",
        "lastIn":100,
        "lastOut":50
      }'::jsonb
    )
  $$,
  'DESUSO is only allowed in the workshop'
);

select is(
  (
    public.poseidon_save_machine(
      'masters-edit-machine-0000001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000002',
      '{
        "machineId":"35000000-0000-0000-0000-000000000007",
        "visibleId":"807",
        "name":"Maquina Reset Editada",
        "localId":"25000000-0000-0000-0000-000000000002",
        "location":"Piso principal",
        "status":"ACTIVA",
        "lastIn":150,
        "lastOut":60,
        "notes":"Ajuste autorizado"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'administrator edits machine metadata and counters'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      m.name,
      m.location_label,
      m.last_in,
      m.last_out,
      m.notes
    )
    from public.machines m
    where m.id = '35000000-0000-0000-0000-000000000007'
  ),
  '[
    "Maquina Reset Editada",
    "Piso principal",
    150,
    60,
    "Ajuste autorizado"
  ]'::jsonb,
  'machine edit persists normalized fields and counters'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = m.id
          and mh.action = 'CONTADORES'
      ),
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = m.id
          and mh.action = 'MODIFICADA'
      ),
      (
        select count(*)
        from public.audit_events ae
        where ae.entity_id = m.id::text
          and ae.action = 'Modificar maquina'
      )
    )
    from public.machines m
    where m.id = '35000000-0000-0000-0000-000000000007'
  ),
  '[1,1,1]'::jsonb,
  'machine edit appends counter history, metadata history and audit'
);

select throws_ok(
  $$
    select public.poseidon_reset_machine_counters(
      'masters-reset-open-denied-01',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000004',
      '{"machineId":"35000000-0000-0000-0000-000000000005"}'::jsonb
    )
  $$,
  'machine counters cannot be reset while its local has an open cash balance'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      m.last_in,
      m.last_out,
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = m.id
          and mh.action = 'RESET'
      ),
      (
        select count(*)
        from public.audit_events ae
        where ae.entity_id = m.id::text
          and ae.action = 'Reset contadores'
      ),
      (
        select count(*)
        from public.command_requests cr
        where cr.idempotency_key = 'masters-reset-open-denied-01'
      )
    )
    from public.machines m
    where m.id = '35000000-0000-0000-0000-000000000005'
  ),
  '[90,40,0,0,0]'::jsonb,
  'blocked reset leaves counters, history, audit and idempotency unchanged'
);

select is(
  (
    public.poseidon_reset_machine_counters(
      'masters-reset-machine-000001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000002',
      '{"machineId":"35000000-0000-0000-0000-000000000007"}'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'machine counters reset without an open cash balance'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      m.last_in,
      m.last_out,
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = m.id
          and mh.action = 'RESET'
      ),
      (
        select count(*)
        from public.audit_events ae
        where ae.entity_id = m.id::text
          and ae.action = 'Reset contadores'
      )
    )
    from public.machines m
    where m.id = '35000000-0000-0000-0000-000000000007'
  ),
  '[0,0,1,1]'::jsonb,
  'successful reset stores zero counters and appends history and audit'
);

select throws_ok(
  $$
    select public.poseidon_move_machine_to_workshop(
      'masters-move-open-denied-001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000004',
      '{"machineId":"35000000-0000-0000-0000-000000000005"}'::jsonb
    )
  $$,
  'the machine cannot move to the workshop while its local has an open cash balance'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      m.current_location_kind,
      m.current_local_id,
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = m.id
          and mh.action = 'MOVIDA'
      ),
      (
        select count(*)
        from public.audit_events ae
        where ae.entity_id = m.id::text
          and ae.action = 'Enviar maquina al taller'
      )
    )
    from public.machines m
    where m.id = '35000000-0000-0000-0000-000000000005'
  ),
  '[
    "LOCAL",
    "25000000-0000-0000-0000-000000000004",
    0,
    0
  ]'::jsonb,
  'blocked workshop move leaves machine, history and audit unchanged'
);

select is(
  (
    public.poseidon_move_machine_to_workshop(
      'masters-move-machine-0000001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000002',
      '{
        "machineId":"35000000-0000-0000-0000-000000000009",
        "detail":"Enviada a Taller para mantenimiento"
      }'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'machine moves from an unlocked local to the workshop'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      m.current_location_kind,
      m.current_local_id,
      m.location_label,
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = m.id
          and mh.action = 'MOVIDA'
      ),
      (
        select count(*)
        from public.audit_events ae
        where ae.entity_id = m.id::text
          and ae.action = 'Enviar maquina al taller'
      )
    )
    from public.machines m
    where m.id = '35000000-0000-0000-0000-000000000009'
  ),
  '["TALLER",null,"Taller",2,1]'::jsonb,
  'workshop move atomically updates location and appends paired history and audit'
);

select throws_ok(
  $$
    select public.poseidon_delete_machine(
      'masters-delete-local-machine1',
      'ADMINISTRADOR',
      null,
      '{"machineId":"35000000-0000-0000-0000-000000000007"}'::jsonb
    )
  $$,
  'the machine must be in the workshop before removal'
);

select throws_ok(
  $$
    select public.poseidon_delete_machine(
      'masters-delete-reading-denied1',
      'ADMINISTRADOR',
      null,
      '{"machineId":"35000000-0000-0000-0000-000000000006"}'::jsonb
    )
  $$,
  'a machine with cash readings cannot be removed'
);

select is(
  (
    public.poseidon_delete_machine(
      'masters-delete-machine-00001',
      'ADMINISTRADOR',
      null,
      '{"machineId":"35000000-0000-0000-0000-000000000008"}'::jsonb
    ) ->> 'ok'
  )::boolean,
  true,
  'unread workshop machine is removed logically'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      (
        select count(*)
        from public.machines m
        where m.id = '35000000-0000-0000-0000-000000000008'
      ),
      (
        select m.status
        from public.machines m
        where m.id = '35000000-0000-0000-0000-000000000008'
      ),
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = '35000000-0000-0000-0000-000000000008'
          and mh.action = 'QUITADA'
      ),
      (
        select count(*)
        from public.audit_events ae
        where ae.entity_id = '35000000-0000-0000-0000-000000000008'
          and ae.action = 'Eliminar maquina'
          and (ae.new_value ->> 'tombstone')::boolean
      ),
      (
        select count(*)
        from public.audit_event_locals ael
        join public.audit_events ae on ae.id = ael.audit_event_id
        where ae.entity_id = '35000000-0000-0000-0000-000000000008'
          and ae.action = 'Eliminar maquina'
      )
    )
  ),
  '[1,"DESUSO",1,1,0]'::jsonb,
  'machine removal retains a DESUSO row with QUITADA and global audit tombstones'
);

select throws_ok(
  $$
    select public.poseidon_save_machine(
      'masters-edit-deleted-machine1',
      'ADMINISTRADOR',
      null,
      '{
        "machineId":"35000000-0000-0000-0000-000000000008",
        "visibleId":"808",
        "name":"No reactivar",
        "localId":"taller",
        "status":"ACTIVA",
        "lastIn":0,
        "lastOut":0
      }'::jsonb
    )
  $$,
  'the machine was logically removed'
);

select throws_ok(
  $$
    select public.poseidon_assign_machines_to_local(
      'masters-assign-closed-denied1',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000006',
      '{"machineIds":["35000000-0000-0000-0000-000000000002"]}'::jsonb
    )
  $$,
  'machines cannot be assigned to a closed local'
);

select throws_ok(
  $$
    select public.poseidon_assign_machines_to_local(
      'masters-assign-open-denied-01',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000004',
      '{"machineIds":["35000000-0000-0000-0000-000000000002"]}'::jsonb
    )
  $$,
  'machines cannot be assigned while the local has an open cash balance'
);

select throws_ok(
  $$
    select public.poseidon_assign_machines_to_local(
      'masters-assign-mixed-denied1',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000002',
      '{
        "machineIds":[
          "35000000-0000-0000-0000-000000000002",
          "35000000-0000-0000-0000-000000000003"
        ]
      }'::jsonb
    )
  $$,
  'only available workshop machines may be assigned'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      m.current_location_kind,
      m.current_local_id,
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id = m.id
      ),
      (
        select count(*)
        from public.audit_events ae
        join public.command_requests cr on cr.id = ae.command_request_id
        where cr.idempotency_key = 'masters-assign-mixed-denied1'
      ),
      (
        select count(*)
        from public.command_requests cr
        where cr.idempotency_key = 'masters-assign-mixed-denied1'
      )
    )
    from public.machines m
    where m.id = '35000000-0000-0000-0000-000000000002'
  ),
  '["TALLER",null,0,0,0]'::jsonb,
  'mixed assignment rejection is atomic for valid machines, history, audit and idempotency'
);

select is(
  pg_catalog.jsonb_array_length(
    public.poseidon_assign_machines_to_local(
      'masters-assign-success-00001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000002',
      pg_catalog.jsonb_build_object(
        'machineIds',
        pg_catalog.jsonb_build_array(
          '35000000-0000-0000-0000-000000000002',
          (
            select m.id
            from public.machines m
            where m.visible_id = '899'
          ),
          '35000000-0000-0000-0000-000000000002'
        )
      )
    ) -> 'value'
  ),
  2,
  'assignment deduplicates IDs and moves the whole valid set atomically'
);

select is(
  (
    select count(*)::integer
    from public.machines m
    where m.id in (
      '35000000-0000-0000-0000-000000000002',
      (select created.id from public.machines created where created.visible_id = '899')
    )
      and m.current_location_kind = 'LOCAL'
      and m.current_local_id = '25000000-0000-0000-0000-000000000002'
      and m.location_label = 'Asignacion Maestros'
  ),
  2,
  'successful assignment updates every selected machine to the target local'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id in (
          '35000000-0000-0000-0000-000000000002',
          (select m.id from public.machines m where m.visible_id = '899')
        )
          and mh.action = 'MOVIDA'
      ),
      (
        select count(*)
        from public.audit_events ae
        join public.command_requests cr on cr.id = ae.command_request_id
        where cr.idempotency_key = 'masters-assign-success-00001'
          and ae.action = 'Asignar maquinas a local'
      )
    )
  ),
  '[4,1]'::jsonb,
  'bulk assignment appends paired histories and one local audit event'
);

select is(
  (
    select pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_array_length(
        public.poseidon_assign_machines_to_local(
          'masters-assign-success-00001',
          'ADMINISTRADOR',
          '25000000-0000-0000-0000-000000000002',
          pg_catalog.jsonb_build_object(
            'machineIds',
            pg_catalog.jsonb_build_array(
              '35000000-0000-0000-0000-000000000002',
              (
                select m.id
                from public.machines m
                where m.visible_id = '899'
              ),
              '35000000-0000-0000-0000-000000000002'
            )
          )
        ) -> 'value'
      ),
      (
        select count(*)
        from public.machine_history mh
        where mh.machine_id in (
          '35000000-0000-0000-0000-000000000002',
          (select m.id from public.machines m where m.visible_id = '899')
        )
          and mh.action = 'MOVIDA'
      ),
      (
        select count(*)
        from public.audit_events ae
        join public.command_requests cr on cr.id = ae.command_request_id
        where cr.idempotency_key = 'masters-assign-success-00001'
      ),
      (
        select count(*)
        from public.command_requests cr
        where cr.idempotency_key = 'masters-assign-success-00001'
      )
    )
  ),
  '[2,4,1,1]'::jsonb,
  'assignment replay returns the stored result without duplicate effects'
);

select throws_ok(
  $$
    select public.poseidon_assign_machines_to_local(
      'masters-assign-success-00001',
      'ADMINISTRADOR',
      '25000000-0000-0000-0000-000000000002',
      '{"machineIds":["35000000-0000-0000-0000-000000000003"]}'::jsonb
    )
  $$,
  'idempotency key was already used with a different request'
);

select * from finish();
rollback;
