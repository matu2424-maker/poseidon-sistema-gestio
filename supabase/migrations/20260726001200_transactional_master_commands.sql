begin;

create function private.master_uuid_array(
  p_value jsonb,
  p_label text,
  p_required boolean default false
)
returns uuid[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_values uuid[] := array[]::uuid[];
  v_item text;
  v_uuid uuid;
begin
  if p_value is null or p_value = 'null'::jsonb then
    if p_required then
      raise exception using
        errcode = '22023',
        message = pg_catalog.format('%s must contain at least one UUID', p_label);
    end if;
    return v_values;
  end if;

  if pg_catalog.jsonb_typeof(p_value) <> 'array' then
    raise exception using
      errcode = '22023',
      message = pg_catalog.format('%s must be a JSON array', p_label);
  end if;

  for v_item in
    select item.value
    from pg_catalog.jsonb_array_elements_text(p_value) as item(value)
  loop
    v_item := pg_catalog.btrim(v_item);
    if v_item !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception using
        errcode = '22023',
        message = pg_catalog.format('%s must contain only UUIDs', p_label);
    end if;

    v_uuid := v_item::uuid;
    if not (v_uuid = any(v_values)) then
      v_values := pg_catalog.array_append(v_values, v_uuid);
    end if;
  end loop;

  if p_required and pg_catalog.cardinality(v_values) = 0 then
    raise exception using
      errcode = '22023',
      message = pg_catalog.format('%s must contain at least one UUID', p_label);
  end if;

  return v_values;
end;
$$;

create function private.master_payload_machine_id(p_payload jsonb)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_reference text;
begin
  v_reference := pg_catalog.btrim(
    coalesce(p_payload ->> 'machineId', p_payload ->> 'machine_id', '')
  );
  if v_reference !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception using errcode = '22023', message = 'machineId must be a UUID';
  end if;
  return v_reference::uuid;
end;
$$;

create function private.assert_master_administrator(p_command_request_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
begin
  select *
  into v_request
  from public.command_requests cr
  where cr.id = p_command_request_id
    and cr.actor_id = auth.uid()
    and cr.status = 'PENDIENTE';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'pending authenticated master command not found';
  end if;

  if v_request.actual_role <> 'ADMINISTRADOR'
     or v_request.requested_function <> 'ADMINISTRADOR' then
    raise exception using
      errcode = '42501',
      message = 'master data commands require the administrator role and function';
  end if;
end;
$$;

create function private.master_machine_is_tombstoned(p_machine_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.machine_history mh
    where mh.machine_id = p_machine_id
      and mh.action = 'QUITADA'
  );
$$;

create function private.master_local_is_tombstoned(p_local_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.audit_events ae
    where ae.entity_type = 'Local'
      and ae.entity_id = p_local_id::text
      and ae.action = 'Quitar local'
  );
$$;

create function private.append_master_machine_history(
  p_command_request_id uuid,
  p_machine public.machines,
  p_location_kind public.machine_location_kind,
  p_local_id uuid,
  p_action public.machine_history_action,
  p_detail text,
  p_created_at timestamptz
)
returns public.machine_history
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_profile public.profiles%rowtype;
  v_history_id uuid := extensions.gen_random_uuid();
  v_history public.machine_history%rowtype;
begin
  select *
  into v_request
  from public.command_requests cr
  where cr.id = p_command_request_id
    and cr.actor_id = auth.uid()
    and cr.status = 'PENDIENTE';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'pending authenticated master command not found for history append';
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'active authenticated history actor not found';
  end if;

  if (p_location_kind = 'LOCAL' and p_local_id is null)
     or (p_location_kind = 'TALLER' and p_local_id is not null) then
    raise exception using errcode = '22023', message = 'invalid machine history location';
  end if;

  insert into public.machine_history (
    id,
    legacy_id,
    machine_id,
    machine_legacy_id,
    machine_visible_id,
    machine_name_snapshot,
    location_kind,
    local_id,
    action,
    detail,
    actor_id,
    actor_legacy_id,
    created_at
  )
  values (
    v_history_id,
    'machine-history-' || v_history_id::text,
    p_machine.id,
    p_machine.legacy_id,
    p_machine.visible_id,
    p_machine.name,
    p_location_kind,
    p_local_id,
    p_action,
    pg_catalog.btrim(coalesce(p_detail, '')),
    v_profile.id,
    v_profile.legacy_id,
    p_created_at
  )
  returning * into v_history;

  return v_history;
end;
$$;

create function private.append_master_audit(
  p_command_request_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_primary_local_id uuid,
  p_local_ids uuid[],
  p_previous_value jsonb,
  p_new_value jsonb,
  p_reason text default ''
)
returns public.audit_events
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_profile public.profiles%rowtype;
  v_event_id uuid := extensions.gen_random_uuid();
  v_event public.audit_events%rowtype;
begin
  select *
  into v_request
  from public.command_requests cr
  where cr.id = p_command_request_id
    and cr.actor_id = auth.uid()
    and cr.status = 'PENDIENTE';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'pending authenticated master command not found for audit append';
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'active authenticated audit actor not found';
  end if;

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
    entity_id,
    primary_local_id,
    previous_value,
    new_value,
    reason,
    command_request_id
  )
  values (
    v_event_id,
    'audit-' || v_event_id::text,
    v_profile.id,
    v_profile.legacy_id,
    v_profile.display_name,
    v_request.actual_role,
    v_request.requested_function,
    pg_catalog.btrim(p_action),
    pg_catalog.btrim(p_entity_type),
    pg_catalog.btrim(p_entity_id),
    p_primary_local_id,
    coalesce(p_previous_value, '{}'::jsonb),
    coalesce(p_new_value, '{}'::jsonb),
    pg_catalog.btrim(coalesce(p_reason, '')),
    v_request.id
  )
  returning * into v_event;

  insert into public.audit_event_locals (audit_event_id, local_id)
  select v_event.id, scope.local_id
  from (
    select distinct requested.local_id
    from pg_catalog.unnest(
      coalesce(p_local_ids, array[]::uuid[])
    ) as requested(local_id)
    where requested.local_id is not null
  ) scope;

  return v_event;
end;
$$;

create function public.poseidon_save_local(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_existing public.locals%rowtype;
  v_local public.locals%rowtype;
  v_machine public.machines%rowtype;
  v_next_machine public.machines%rowtype;
  v_selected_ids uuid[];
  v_selected_count integer := 0;
  v_visible_id text;
  v_legacy_id text;
  v_name text;
  v_tenant_name text;
  v_phone text;
  v_email text;
  v_address text;
  v_google_maps_url text;
  v_status_text text;
  v_status public.local_status;
  v_local_id uuid;
  v_closes_local boolean := false;
  v_moved_ids jsonb := '[]'::jsonb;
  v_previous jsonb := '{}'::jsonb;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'save_local',
    p_idempotency_key,
    private.command_request_hash('save_local', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  perform private.assert_master_administrator(v_request.id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  if p_local_id is not null then
    select *
    into v_existing
    from public.locals l
    where l.id = p_local_id
    for update;

    if not found then
      raise exception using errcode = '23503', message = 'local not found';
    end if;
    if private.master_local_is_tombstoned(v_existing.id) then
      raise exception using errcode = '55000', message = 'the local was logically removed';
    end if;
    v_previous := pg_catalog.to_jsonb(v_existing);
  end if;

  v_visible_id := pg_catalog.btrim(
    coalesce(
      p_payload ->> 'visibleId',
      p_payload ->> 'visible_id',
      p_payload ->> 'id',
      v_existing.visible_id,
      ''
    )
  );
  v_name := pg_catalog.btrim(coalesce(p_payload ->> 'name', v_existing.name, ''));
  v_tenant_name := pg_catalog.btrim(
    coalesce(p_payload ->> 'tenantName', p_payload ->> 'tenant_name', v_existing.tenant_name, '')
  );
  v_phone := pg_catalog.btrim(coalesce(p_payload ->> 'phone', v_existing.phone, ''));
  v_email := pg_catalog.btrim(coalesce(p_payload ->> 'email', v_existing.email, ''));
  v_address := pg_catalog.btrim(coalesce(p_payload ->> 'address', v_existing.address, ''));
  v_google_maps_url := pg_catalog.btrim(
    coalesce(
      p_payload ->> 'googleMapsUrl',
      p_payload ->> 'google_maps_url',
      v_existing.google_maps_url,
      ''
    )
  );
  v_status_text := pg_catalog.upper(
    pg_catalog.btrim(coalesce(p_payload ->> 'status', v_existing.status::text, 'ACTIVO'))
  );

  if v_visible_id !~ '^[0-9]{1,9}$' or v_name = '' then
    raise exception using
      errcode = '22023',
      message = 'short numeric visibleId and name are required';
  end if;
  if v_phone <> '' and v_phone !~ '^[0-9]+$' then
    raise exception using errcode = '22023', message = 'phone must contain only digits';
  end if;
  if v_email <> ''
     and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'email is invalid';
  end if;

  begin
    v_status := v_status_text::public.local_status;
  exception
    when invalid_text_representation then
      raise exception using errcode = '22023', message = 'invalid local status';
  end;

  v_selected_ids := private.master_uuid_array(
    coalesce(
      p_payload -> 'selectedWorkshopMachineIds',
      p_payload -> 'selected_workshop_machine_ids'
    ),
    'selectedWorkshopMachineIds'
  );

  if p_local_id is not null and pg_catalog.cardinality(v_selected_ids) > 0 then
    raise exception using
      errcode = '22023',
      message = 'workshop machines may only be selected while creating a local';
  end if;
  if v_status = 'CERRADO' and pg_catalog.cardinality(v_selected_ids) > 0 then
    raise exception using
      errcode = '55000',
      message = 'machines cannot be assigned to a closed local';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('poseidon-master-local-visible:' || v_visible_id, 0)
  );

  if v_existing.id is not null and v_visible_id <> v_existing.visible_id then
    raise exception using errcode = '22023', message = 'local visibleId cannot be changed';
  end if;
  if exists (
    select 1
    from public.locals l
    where l.visible_id = v_visible_id
      and l.id is distinct from v_existing.id
  ) then
    raise exception using errcode = '23505', message = 'local visibleId already exists';
  end if;

  if v_existing.id is null then
    v_local_id := extensions.gen_random_uuid();
    v_legacy_id := pg_catalog.btrim(
      coalesce(p_payload ->> 'legacyId', p_payload ->> 'legacy_id', v_visible_id)
    );
    if v_legacy_id = '' then
      raise exception using errcode = '22023', message = 'local legacyId cannot be blank';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('poseidon-master-local-legacy:' || v_legacy_id, 0)
    );
    if exists (select 1 from public.locals l where l.legacy_id = v_legacy_id) then
      raise exception using errcode = '23505', message = 'local legacyId already exists';
    end if;

    for v_machine in
      select m.*
      from public.machines m
      where m.id = any(v_selected_ids)
      order by m.id
      for update
    loop
      v_selected_count := v_selected_count + 1;
      if v_machine.current_location_kind <> 'TALLER'
         or v_machine.current_local_id is not null
         or v_machine.status = 'DESUSO'
         or private.master_machine_is_tombstoned(v_machine.id) then
        raise exception using
          errcode = '55000',
          message = 'only available workshop machines may be assigned';
      end if;
    end loop;

    if v_selected_count <> pg_catalog.cardinality(v_selected_ids) then
      raise exception using errcode = '23503', message = 'selected workshop machine not found';
    end if;

    insert into public.locals (
      id,
      legacy_id,
      visible_id,
      name,
      tenant_name,
      phone,
      email,
      address,
      google_maps_url,
      status
    )
    values (
      v_local_id,
      v_legacy_id,
      v_visible_id,
      v_name,
      v_tenant_name,
      v_phone,
      v_email,
      coalesce(nullif(v_address, ''), 'Sin direccion'),
      v_google_maps_url,
      v_status
    )
    returning * into v_local;

    insert into public.current_accounts (
      id,
      legacy_id,
      kind,
      local_id,
      name,
      status
    )
    values
      (
        extensions.gen_random_uuid(),
        'account-local-' || v_local.legacy_id || '-efectivo',
        'LOCAL_EFECTIVO',
        v_local.id,
        v_local.name || ' - Caja / Efectivo',
        case
          when v_local.status = 'CERRADO' then 'INACTIVA'::public.current_account_status
          else 'ACTIVA'::public.current_account_status
        end
      ),
      (
        extensions.gen_random_uuid(),
        'account-local-' || v_local.legacy_id || '-banco',
        'LOCAL_BANCO',
        v_local.id,
        v_local.name || ' - Caja / Banco',
        case
          when v_local.status = 'CERRADO' then 'INACTIVA'::public.current_account_status
          else 'ACTIVA'::public.current_account_status
        end
      );

    for v_machine in
      select m.*
      from public.machines m
      where m.id = any(v_selected_ids)
      order by m.id
    loop
      update public.machines m
      set
        current_location_kind = 'LOCAL',
        current_local_id = v_local.id,
        location_label = v_local.name
      where m.id = v_machine.id
      returning * into v_next_machine;

      perform private.append_master_machine_history(
        v_request.id,
        v_next_machine,
        'LOCAL',
        v_local.id,
        'MOVIDA',
        'Asignada desde Taller',
        v_created_at
      );
      perform private.append_master_machine_history(
        v_request.id,
        v_machine,
        'TALLER',
        null,
        'MOVIDA',
        'Movida al local ' || v_local.name,
        v_created_at
      );
      v_moved_ids := v_moved_ids || pg_catalog.jsonb_build_array(v_machine.id);
    end loop;

    perform private.append_master_audit(
      v_request.id,
      'Crear local',
      'Local',
      v_local.id::text,
      v_local.id,
      array[v_local.id],
      '{}'::jsonb,
      pg_catalog.jsonb_build_object(
        'local',
        pg_catalog.to_jsonb(v_local),
        'machinesAssigned',
        v_moved_ids
      )
    );
  else
    v_local_id := v_existing.id;
    v_legacy_id := v_existing.legacy_id;
    if coalesce(p_payload ->> 'legacyId', p_payload ->> 'legacy_id', v_legacy_id) <> v_legacy_id then
      raise exception using errcode = '22023', message = 'local legacyId cannot be changed';
    end if;

    v_closes_local := v_existing.status <> 'CERRADO' and v_status = 'CERRADO';
    if v_status = 'CERRADO'
       and exists (
         select 1
         from public.cash_balances cb
         where cb.local_id = v_existing.id
           and cb.status = 'EN_PROCESO'
       ) then
      raise exception using
        errcode = '55000',
        message = 'the local cannot be closed while it has an open cash balance';
    end if;

    update public.locals l
    set
      name = v_name,
      tenant_name = v_tenant_name,
      phone = v_phone,
      email = v_email,
      address = coalesce(nullif(v_address, ''), 'Sin direccion'),
      google_maps_url = v_google_maps_url,
      status = v_status
    where l.id = v_existing.id
    returning * into v_local;

    insert into public.current_accounts (
      id,
      legacy_id,
      kind,
      local_id,
      name,
      status
    )
    select
      extensions.gen_random_uuid(),
      'account-local-' || v_local.legacy_id || '-efectivo',
      'LOCAL_EFECTIVO',
      v_local.id,
      v_local.name || ' - Caja / Efectivo',
      case
        when v_local.status = 'CERRADO' then 'INACTIVA'::public.current_account_status
        else 'ACTIVA'::public.current_account_status
      end
    where not exists (
      select 1
      from public.current_accounts ca
      where ca.local_id = v_local.id
        and ca.kind = 'LOCAL_EFECTIVO'
    );

    insert into public.current_accounts (
      id,
      legacy_id,
      kind,
      local_id,
      name,
      status
    )
    select
      extensions.gen_random_uuid(),
      'account-local-' || v_local.legacy_id || '-banco',
      'LOCAL_BANCO',
      v_local.id,
      v_local.name || ' - Caja / Banco',
      case
        when v_local.status = 'CERRADO' then 'INACTIVA'::public.current_account_status
        else 'ACTIVA'::public.current_account_status
      end
    where not exists (
      select 1
      from public.current_accounts ca
      where ca.local_id = v_local.id
        and ca.kind = 'LOCAL_BANCO'
    );

    update public.current_accounts ca
    set
      name = v_local.name
        || case
             when ca.kind = 'LOCAL_EFECTIVO' then ' - Caja / Efectivo'
             else ' - Caja / Banco'
           end,
      status = case
        when v_local.status = 'CERRADO' then 'INACTIVA'::public.current_account_status
        else 'ACTIVA'::public.current_account_status
      end
    where ca.local_id = v_local.id
      and ca.kind in ('LOCAL_EFECTIVO', 'LOCAL_BANCO');

    if v_status = 'CERRADO' then
      for v_machine in
        select m.*
        from public.machines m
        where m.current_local_id = v_local.id
        order by m.id
        for update
      loop
        update public.machines m
        set
          current_location_kind = 'TALLER',
          current_local_id = null,
          location_label = 'Taller'
        where m.id = v_machine.id
        returning * into v_next_machine;

        perform private.append_master_machine_history(
          v_request.id,
          v_machine,
          'LOCAL',
          v_local.id,
          'MOVIDA',
          'Enviada a Taller por cierre de local',
          v_created_at
        );
        perform private.append_master_machine_history(
          v_request.id,
          v_next_machine,
          'TALLER',
          null,
          'MOVIDA',
          'Recibida por cierre de ' || v_local.name,
          v_created_at
        );
        v_moved_ids := v_moved_ids || pg_catalog.jsonb_build_array(v_machine.id);
      end loop;
    end if;

    perform private.append_master_audit(
      v_request.id,
      case when v_closes_local then 'Cerrar local' else 'Modificar local' end,
      'Local',
      v_local.id::text,
      v_local.id,
      array[v_local.id],
      v_previous,
      pg_catalog.jsonb_build_object(
        'local',
        pg_catalog.to_jsonb(v_local),
        'machinesMovedToWorkshop',
        v_moved_ids
      )
    );
  end if;

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_local),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_delete_local(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_existing public.locals%rowtype;
  v_local public.locals%rowtype;
  v_machine public.machines%rowtype;
  v_next_machine public.machines%rowtype;
  v_moved_ids jsonb := '[]'::jsonb;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'delete_local',
    p_idempotency_key,
    private.command_request_hash('delete_local', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  perform private.assert_master_administrator(v_request.id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  select *
  into v_existing
  from public.locals l
  where l.id = p_local_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'local not found';
  end if;
  if v_existing.is_primary then
    raise exception using errcode = '55000', message = 'the primary local cannot be removed';
  end if;
  if private.master_local_is_tombstoned(v_existing.id) then
    raise exception using errcode = '55000', message = 'the local was already logically removed';
  end if;
  if exists (
    select 1
    from public.cash_balances cb
    where cb.local_id = v_existing.id
      and cb.status = 'EN_PROCESO'
  ) then
    raise exception using
      errcode = '55000',
      message = 'the local cannot be removed while it has an open cash balance';
  end if;

  update public.locals l
  set status = 'CERRADO'
  where l.id = v_existing.id
  returning * into v_local;

  update public.current_accounts ca
  set status = 'INACTIVA'
  where ca.local_id = v_local.id
    and ca.kind in ('LOCAL_EFECTIVO', 'LOCAL_BANCO');

  for v_machine in
    select m.*
    from public.machines m
    where m.current_local_id = v_local.id
    order by m.id
    for update
  loop
    update public.machines m
    set
      current_location_kind = 'TALLER',
      current_local_id = null,
      location_label = 'Taller'
    where m.id = v_machine.id
    returning * into v_next_machine;

    perform private.append_master_machine_history(
      v_request.id,
      v_machine,
      'LOCAL',
      v_local.id,
      'MOVIDA',
      'Devuelta a Taller por baja de local',
      v_created_at
    );
    perform private.append_master_machine_history(
      v_request.id,
      v_next_machine,
      'TALLER',
      null,
      'MOVIDA',
      'Recibida desde local ' || v_local.name,
      v_created_at
    );
    v_moved_ids := v_moved_ids || pg_catalog.jsonb_build_array(v_machine.id);
  end loop;

  perform private.append_master_audit(
    v_request.id,
    'Quitar local',
    'Local',
    v_local.id::text,
    v_local.id,
    array[v_local.id],
    pg_catalog.to_jsonb(v_existing),
    pg_catalog.jsonb_build_object(
      'local',
      pg_catalog.to_jsonb(v_local),
      'tombstone',
      true,
      'machinesMovedToWorkshop',
      v_moved_ids
    )
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_local),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_save_machine(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_probe public.machines%rowtype;
  v_existing public.machines%rowtype;
  v_machine public.machines%rowtype;
  v_target_local public.locals%rowtype;
  v_machine_reference text;
  v_target_reference text;
  v_machine_id uuid;
  v_target_local_id uuid;
  v_visible_id text;
  v_legacy_id text;
  v_name text;
  v_location_label text;
  v_status_text text;
  v_status public.machine_status;
  v_last_in_text text;
  v_last_out_text text;
  v_last_in numeric;
  v_last_out numeric;
  v_notes text;
  v_moves_machine boolean := false;
  v_changes_counters boolean := false;
  v_changes_metadata boolean := false;
  v_source_label text;
  v_target_label text;
  v_scope_ids uuid[];
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'save_machine',
    p_idempotency_key,
    private.command_request_hash('save_machine', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  perform private.assert_master_administrator(v_request.id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;

  v_machine_reference := pg_catalog.btrim(
    coalesce(p_payload ->> 'machineId', p_payload ->> 'machine_id', '')
  );
  if v_machine_reference <> '' then
    v_machine_id := private.master_payload_machine_id(p_payload);
    select *
    into v_probe
    from public.machines m
    where m.id = v_machine_id;

    if not found then
      raise exception using errcode = '23503', message = 'machine not found';
    end if;
  else
    v_machine_id := extensions.gen_random_uuid();
  end if;

  if p_payload ? 'localId' or p_payload ? 'local_id' then
    v_target_reference := pg_catalog.btrim(
      coalesce(p_payload ->> 'localId', p_payload ->> 'local_id', '')
    );
    if v_target_reference = '' or pg_catalog.lower(v_target_reference) = 'taller' then
      v_target_local_id := null;
    elsif v_target_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      v_target_local_id := v_target_reference::uuid;
    else
      raise exception using
        errcode = '22023',
        message = 'localId must be a UUID or taller';
    end if;
  else
    v_target_local_id := p_local_id;
  end if;

  if p_local_id is distinct from v_target_local_id then
    raise exception using
      errcode = '22023',
      message = 'the command local must match the machine target local';
  end if;
  if v_machine_reference = '' and v_target_local_id is not null then
    raise exception using
      errcode = '55000',
      message = 'new machines must be created in the workshop';
  end if;

  if v_machine_reference <> '' then
    perform 1
    from public.locals l
    where l.id = any(
      pg_catalog.array_remove(
        array[v_probe.current_local_id, v_target_local_id],
        null
      )
    )
    order by l.id
    for update;

    select *
    into v_existing
    from public.machines m
    where m.id = v_machine_id
    for update;

    if v_existing.current_location_kind <> v_probe.current_location_kind
       or v_existing.current_local_id is distinct from v_probe.current_local_id then
      raise exception using
        errcode = '40001',
        message = 'machine location changed concurrently; retry the command';
    end if;
    if private.master_machine_is_tombstoned(v_existing.id) then
      raise exception using errcode = '55000', message = 'the machine was logically removed';
    end if;
  end if;

  if v_target_local_id is not null then
    select *
    into v_target_local
    from public.locals l
    where l.id = v_target_local_id;

    if not found then
      raise exception using errcode = '23503', message = 'machine target local not found';
    end if;
    if v_target_local.status = 'CERRADO'
       or private.master_local_is_tombstoned(v_target_local.id) then
      raise exception using
        errcode = '55000',
        message = 'machines cannot be moved to a closed local';
    end if;
  end if;

  v_visible_id := pg_catalog.btrim(
    coalesce(
      p_payload ->> 'visibleId',
      p_payload ->> 'visible_id',
      v_existing.visible_id,
      ''
    )
  );
  v_name := pg_catalog.btrim(coalesce(p_payload ->> 'name', v_existing.name, ''));
  v_status_text := pg_catalog.upper(
    pg_catalog.btrim(coalesce(p_payload ->> 'status', v_existing.status::text, 'ACTIVA'))
  );
  v_last_in_text := pg_catalog.btrim(
    coalesce(p_payload ->> 'lastIn', p_payload ->> 'last_in', v_existing.last_in::text, '0')
  );
  v_last_out_text := pg_catalog.btrim(
    coalesce(p_payload ->> 'lastOut', p_payload ->> 'last_out', v_existing.last_out::text, '0')
  );
  v_notes := pg_catalog.btrim(coalesce(p_payload ->> 'notes', v_existing.notes, ''));

  if v_visible_id !~ '^[0-9]{1,9}$' or v_name = '' then
    raise exception using
      errcode = '22023',
      message = 'short numeric visibleId and name are required';
  end if;

  begin
    v_status := v_status_text::public.machine_status;
  exception
    when invalid_text_representation then
      raise exception using errcode = '22023', message = 'invalid machine status';
  end;

  begin
    v_last_in := v_last_in_text::numeric;
    v_last_out := v_last_out_text::numeric;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'machine counters must be valid numbers';
  end;

  if v_last_in < 0
     or v_last_out < 0
     or v_last_in::text in ('NaN', 'Infinity', '-Infinity')
     or v_last_out::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using
      errcode = '22023',
      message = 'machine counters must be finite and nonnegative';
  end if;
  if v_status = 'DESUSO' and v_target_local_id is not null then
    raise exception using
      errcode = '55000',
      message = 'DESUSO is only allowed in the workshop';
  end if;

  if v_target_local_id is null then
    v_location_label := 'Taller';
  else
    v_location_label := pg_catalog.btrim(
      coalesce(
        p_payload ->> 'location',
        p_payload ->> 'locationLabel',
        p_payload ->> 'location_label',
        case
          when v_existing.current_local_id = v_target_local_id then v_existing.location_label
          else v_target_local.name
        end,
        v_target_local.name
      )
    );
    if v_location_label = '' then
      v_location_label := v_target_local.name;
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('poseidon-master-machine-visible:' || v_visible_id, 0)
  );
  if exists (
    select 1
    from public.machines m
    where m.visible_id = v_visible_id
      and m.id is distinct from v_existing.id
  ) then
    raise exception using errcode = '23505', message = 'machine visibleId already exists';
  end if;

  if v_machine_reference = '' then
    v_legacy_id := pg_catalog.btrim(
      coalesce(
        p_payload ->> 'legacyId',
        p_payload ->> 'legacy_id',
        'machine-' || v_machine_id::text
      )
    );
    if v_legacy_id = '' then
      raise exception using errcode = '22023', message = 'machine legacyId cannot be blank';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('poseidon-master-machine-legacy:' || v_legacy_id, 0)
    );
    if exists (select 1 from public.machines m where m.legacy_id = v_legacy_id) then
      raise exception using errcode = '23505', message = 'machine legacyId already exists';
    end if;

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
      status,
      notes
    )
    values (
      v_machine_id,
      v_legacy_id,
      v_visible_id,
      v_name,
      'TALLER',
      null,
      'Taller',
      0,
      0,
      v_status,
      v_notes
    )
    returning * into v_machine;

    perform private.append_master_machine_history(
      v_request.id,
      v_machine,
      'TALLER',
      null,
      'AGREGADA',
      'Alta de maquina en taller',
      v_created_at
    );
    perform private.append_master_audit(
      v_request.id,
      'Crear maquina',
      'Maquina',
      v_machine.id::text,
      null,
      array[]::uuid[],
      '{}'::jsonb,
      pg_catalog.to_jsonb(v_machine)
    );
  else
    if coalesce(p_payload ->> 'legacyId', p_payload ->> 'legacy_id', v_existing.legacy_id)
       <> v_existing.legacy_id then
      raise exception using errcode = '22023', message = 'machine legacyId cannot be changed';
    end if;

    v_moves_machine :=
      v_existing.current_location_kind
        <> case when v_target_local_id is null then 'TALLER' else 'LOCAL' end::public.machine_location_kind
      or v_existing.current_local_id is distinct from v_target_local_id;
    v_changes_counters :=
      v_existing.last_in <> v_last_in
      or v_existing.last_out <> v_last_out;
    v_changes_metadata :=
      v_existing.visible_id <> v_visible_id
      or v_existing.name <> v_name
      or v_existing.location_label <> v_location_label
      or v_existing.status <> v_status
      or v_existing.notes <> v_notes;

    if v_existing.current_local_id is not null
       and (v_moves_machine or v_changes_counters)
       and exists (
         select 1
         from public.cash_balances cb
         where cb.local_id = v_existing.current_local_id
           and cb.status = 'EN_PROCESO'
       ) then
      raise exception using
        errcode = '55000',
        message = 'the machine cannot move or change counters while its local has an open cash balance';
    end if;
    if v_moves_machine
       and v_target_local_id is not null
       and exists (
         select 1
         from public.cash_balances cb
         where cb.local_id = v_target_local_id
           and cb.status = 'EN_PROCESO'
       ) then
      raise exception using
        errcode = '55000',
        message = 'the machine cannot enter a local with an open cash balance';
    end if;

    v_source_label := case
      when v_existing.current_local_id is null then 'Taller'
      else (
        select l.name
        from public.locals l
        where l.id = v_existing.current_local_id
      )
    end;
    v_target_label := coalesce(v_target_local.name, 'Taller');
    v_scope_ids := pg_catalog.array_remove(
      array[v_existing.current_local_id, v_target_local_id],
      null
    );

    update public.machines m
    set
      visible_id = v_visible_id,
      name = v_name,
      current_location_kind = case
        when v_target_local_id is null then 'TALLER'::public.machine_location_kind
        else 'LOCAL'::public.machine_location_kind
      end,
      current_local_id = v_target_local_id,
      location_label = v_location_label,
      last_in = v_last_in,
      last_out = v_last_out,
      status = v_status,
      notes = v_notes
    where m.id = v_existing.id
    returning * into v_machine;

    if v_moves_machine then
      perform private.append_master_machine_history(
        v_request.id,
        v_existing,
        v_existing.current_location_kind,
        v_existing.current_local_id,
        'MOVIDA',
        'Movida a ' || v_target_label,
        v_created_at
      );
      perform private.append_master_machine_history(
        v_request.id,
        v_machine,
        v_machine.current_location_kind,
        v_machine.current_local_id,
        'MOVIDA',
        'Recibida desde ' || v_source_label,
        v_created_at
      );
    end if;

    if v_changes_counters then
      perform private.append_master_machine_history(
        v_request.id,
        v_machine,
        v_machine.current_location_kind,
        v_machine.current_local_id,
        'CONTADORES',
        'Ajuste admin: IN '
          || v_existing.last_in::text
          || ' -> '
          || v_machine.last_in::text
          || ', OUT '
          || v_existing.last_out::text
          || ' -> '
          || v_machine.last_out::text,
        v_created_at
      );
    end if;

    if (not v_moves_machine and not v_changes_counters) or v_changes_metadata then
      perform private.append_master_machine_history(
        v_request.id,
        v_machine,
        v_machine.current_location_kind,
        v_machine.current_local_id,
        'MODIFICADA',
        'Edicion administrativa',
        v_created_at
      );
    end if;

    perform private.append_master_audit(
      v_request.id,
      'Modificar maquina',
      'Maquina',
      v_machine.id::text,
      coalesce(v_target_local_id, v_existing.current_local_id),
      v_scope_ids,
      pg_catalog.to_jsonb(v_existing),
      pg_catalog.to_jsonb(v_machine)
    );
  end if;

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_machine),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_reset_machine_counters(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_probe public.machines%rowtype;
  v_existing public.machines%rowtype;
  v_machine public.machines%rowtype;
  v_machine_id uuid;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'reset_machine_counters',
    p_idempotency_key,
    private.command_request_hash(
      'reset_machine_counters',
      p_actor_function,
      p_local_id,
      p_payload
    )
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  perform private.assert_master_administrator(v_request.id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;
  v_machine_id := private.master_payload_machine_id(p_payload);

  select *
  into v_probe
  from public.machines m
  where m.id = v_machine_id;

  if not found then
    raise exception using errcode = '23503', message = 'machine not found';
  end if;
  if p_local_id is distinct from v_probe.current_local_id then
    raise exception using
      errcode = '22023',
      message = 'the command local must match the machine current local';
  end if;

  if p_local_id is not null then
    perform 1
    from public.locals l
    where l.id = p_local_id
    for update;
  end if;

  select *
  into v_existing
  from public.machines m
  where m.id = v_machine_id
  for update;

  if v_existing.current_local_id is distinct from v_probe.current_local_id
     or v_existing.current_location_kind <> v_probe.current_location_kind then
    raise exception using
      errcode = '40001',
      message = 'machine location changed concurrently; retry the command';
  end if;
  if private.master_machine_is_tombstoned(v_existing.id) then
    raise exception using errcode = '55000', message = 'the machine was logically removed';
  end if;
  if v_existing.current_local_id is not null
     and exists (
       select 1
       from public.cash_balances cb
       where cb.local_id = v_existing.current_local_id
         and cb.status = 'EN_PROCESO'
     ) then
    raise exception using
      errcode = '55000',
      message = 'machine counters cannot be reset while its local has an open cash balance';
  end if;

  update public.machines m
  set
    last_in = 0,
    last_out = 0
  where m.id = v_existing.id
  returning * into v_machine;

  perform private.append_master_machine_history(
    v_request.id,
    v_machine,
    v_machine.current_location_kind,
    v_machine.current_local_id,
    'RESET',
    'Reset admin: IN '
      || v_existing.last_in::text
      || ' -> 0, OUT '
      || v_existing.last_out::text
      || ' -> 0',
    v_created_at
  );
  perform private.append_master_audit(
    v_request.id,
    'Reset contadores',
    'Maquina',
    v_machine.id::text,
    v_machine.current_local_id,
    pg_catalog.array_remove(array[v_machine.current_local_id], null),
    pg_catalog.to_jsonb(v_existing),
    pg_catalog.to_jsonb(v_machine)
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_machine),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_move_machine_to_workshop(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_probe public.machines%rowtype;
  v_existing public.machines%rowtype;
  v_machine public.machines%rowtype;
  v_local public.locals%rowtype;
  v_machine_id uuid;
  v_detail text;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'move_machine_to_workshop',
    p_idempotency_key,
    private.command_request_hash(
      'move_machine_to_workshop',
      p_actor_function,
      p_local_id,
      p_payload
    )
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  perform private.assert_master_administrator(v_request.id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;
  v_machine_id := private.master_payload_machine_id(p_payload);
  v_detail := pg_catalog.btrim(coalesce(p_payload ->> 'detail', 'Enviada a Taller'));

  select *
  into v_probe
  from public.machines m
  where m.id = v_machine_id;

  if not found then
    raise exception using errcode = '23503', message = 'machine not found';
  end if;
  if v_probe.current_location_kind = 'TALLER' or v_probe.current_local_id is null then
    raise exception using errcode = '55000', message = 'the machine is already in the workshop';
  end if;
  if p_local_id is distinct from v_probe.current_local_id then
    raise exception using
      errcode = '22023',
      message = 'the command local must match the machine current local';
  end if;

  select *
  into v_local
  from public.locals l
  where l.id = p_local_id
  for update;

  select *
  into v_existing
  from public.machines m
  where m.id = v_machine_id
  for update;

  if v_existing.current_local_id is distinct from v_probe.current_local_id
     or v_existing.current_location_kind <> v_probe.current_location_kind then
    raise exception using
      errcode = '40001',
      message = 'machine location changed concurrently; retry the command';
  end if;
  if private.master_machine_is_tombstoned(v_existing.id) then
    raise exception using errcode = '55000', message = 'the machine was logically removed';
  end if;
  if exists (
    select 1
    from public.cash_balances cb
    where cb.local_id = v_existing.current_local_id
      and cb.status = 'EN_PROCESO'
  ) then
    raise exception using
      errcode = '55000',
      message = 'the machine cannot move to the workshop while its local has an open cash balance';
  end if;

  update public.machines m
  set
    current_location_kind = 'TALLER',
    current_local_id = null,
    location_label = 'Taller'
  where m.id = v_existing.id
  returning * into v_machine;

  perform private.append_master_machine_history(
    v_request.id,
    v_existing,
    'LOCAL',
    v_existing.current_local_id,
    'MOVIDA',
    coalesce(nullif(v_detail, ''), 'Enviada a Taller'),
    v_created_at
  );
  perform private.append_master_machine_history(
    v_request.id,
    v_machine,
    'TALLER',
    null,
    'MOVIDA',
    'Recibida desde ' || v_local.name,
    v_created_at
  );
  perform private.append_master_audit(
    v_request.id,
    'Enviar maquina al taller',
    'Maquina',
    v_machine.id::text,
    v_existing.current_local_id,
    array[v_existing.current_local_id],
    pg_catalog.to_jsonb(v_existing),
    pg_catalog.to_jsonb(v_machine)
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_machine),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_delete_machine(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_existing public.machines%rowtype;
  v_machine public.machines%rowtype;
  v_machine_id uuid;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'delete_machine',
    p_idempotency_key,
    private.command_request_hash('delete_machine', p_actor_function, p_local_id, p_payload)
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  perform private.assert_master_administrator(v_request.id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;
  if p_local_id is not null then
    raise exception using
      errcode = '22023',
      message = 'machine deletion is a workshop command without a local';
  end if;
  v_machine_id := private.master_payload_machine_id(p_payload);

  select *
  into v_existing
  from public.machines m
  where m.id = v_machine_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'machine not found';
  end if;
  if private.master_machine_is_tombstoned(v_existing.id) then
    raise exception using errcode = '55000', message = 'the machine was already logically removed';
  end if;
  if v_existing.current_location_kind <> 'TALLER'
     or v_existing.current_local_id is not null then
    raise exception using
      errcode = '55000',
      message = 'the machine must be in the workshop before removal';
  end if;
  if exists (
    select 1
    from public.machine_readings mr
    where mr.machine_id = v_existing.id
  ) then
    raise exception using
      errcode = '55000',
      message = 'a machine with cash readings cannot be removed';
  end if;

  update public.machines m
  set
    current_location_kind = 'TALLER',
    current_local_id = null,
    location_label = 'Taller',
    status = 'DESUSO'
  where m.id = v_existing.id
  returning * into v_machine;

  perform private.append_master_machine_history(
    v_request.id,
    v_machine,
    'TALLER',
    null,
    'QUITADA',
    'Baja logica desde taller',
    v_created_at
  );
  perform private.append_master_audit(
    v_request.id,
    'Eliminar maquina',
    'Maquina',
    v_machine.id::text,
    null,
    array[]::uuid[],
    pg_catalog.to_jsonb(v_existing),
    pg_catalog.jsonb_build_object(
      'machine',
      pg_catalog.to_jsonb(v_machine),
      'tombstone',
      true
    )
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', pg_catalog.to_jsonb(v_machine),
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_assign_machines_to_local(
  p_idempotency_key text,
  p_actor_function public.app_role,
  p_local_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
  v_local public.locals%rowtype;
  v_machine public.machines%rowtype;
  v_next_machine public.machines%rowtype;
  v_machine_ids uuid[];
  v_found_count integer := 0;
  v_assigned jsonb := '[]'::jsonb;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'assign_machines_to_local',
    p_idempotency_key,
    private.command_request_hash(
      'assign_machines_to_local',
      p_actor_function,
      p_local_id,
      p_payload
    )
  );

  if v_request.status = 'APLICADO' then
    return v_request.response_payload;
  elsif v_request.status = 'FALLIDO' then
    if v_request.response_payload is not null then
      return v_request.response_payload;
    end if;
    raise exception using errcode = '55000', message = 'the previous command attempt failed';
  end if;

  perform private.assert_master_administrator(v_request.id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'payload must be a JSON object';
  end if;
  if p_local_id is null then
    raise exception using errcode = '22023', message = 'assignment local is required';
  end if;

  v_machine_ids := private.master_uuid_array(
    coalesce(p_payload -> 'machineIds', p_payload -> 'machine_ids'),
    'machineIds',
    true
  );

  select *
  into v_local
  from public.locals l
  where l.id = p_local_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'local not found';
  end if;
  if v_local.status = 'CERRADO'
     or private.master_local_is_tombstoned(v_local.id) then
    raise exception using
      errcode = '55000',
      message = 'machines cannot be assigned to a closed local';
  end if;
  if exists (
    select 1
    from public.cash_balances cb
    where cb.local_id = v_local.id
      and cb.status = 'EN_PROCESO'
  ) then
    raise exception using
      errcode = '55000',
      message = 'machines cannot be assigned while the local has an open cash balance';
  end if;

  for v_machine in
    select m.*
    from public.machines m
    where m.id = any(v_machine_ids)
    order by m.id
    for update
  loop
    v_found_count := v_found_count + 1;
    if v_machine.current_location_kind <> 'TALLER'
       or v_machine.current_local_id is not null
       or v_machine.status = 'DESUSO'
       or private.master_machine_is_tombstoned(v_machine.id) then
      raise exception using
        errcode = '55000',
        message = 'only available workshop machines may be assigned';
    end if;
  end loop;

  if v_found_count <> pg_catalog.cardinality(v_machine_ids) then
    raise exception using errcode = '23503', message = 'selected workshop machine not found';
  end if;

  for v_machine in
    select m.*
    from public.machines m
    where m.id = any(v_machine_ids)
    order by m.id
  loop
    update public.machines m
    set
      current_location_kind = 'LOCAL',
      current_local_id = v_local.id,
      location_label = v_local.name
    where m.id = v_machine.id
    returning * into v_next_machine;

    perform private.append_master_machine_history(
      v_request.id,
      v_next_machine,
      'LOCAL',
      v_local.id,
      'MOVIDA',
      'Asignada desde Taller',
      v_created_at
    );
    perform private.append_master_machine_history(
      v_request.id,
      v_machine,
      'TALLER',
      null,
      'MOVIDA',
      'Movida al local ' || v_local.name,
      v_created_at
    );
    v_assigned := v_assigned || pg_catalog.jsonb_build_array(
      pg_catalog.to_jsonb(v_next_machine)
    );
  end loop;

  perform private.append_master_audit(
    v_request.id,
    'Asignar maquinas a local',
    'Local',
    v_local.id::text,
    v_local.id,
    array[v_local.id],
    '{}'::jsonb,
    pg_catalog.jsonb_build_object(
      'localId',
      v_local.id,
      'machineIds',
      v_machine_ids
    )
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok', true,
    'value', v_assigned,
    'revision', v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

revoke all on function private.master_uuid_array(jsonb, text, boolean)
from public, anon, authenticated;
revoke all on function private.master_payload_machine_id(jsonb)
from public, anon, authenticated;
revoke all on function private.assert_master_administrator(uuid)
from public, anon, authenticated;
revoke all on function private.master_machine_is_tombstoned(uuid)
from public, anon, authenticated;
revoke all on function private.master_local_is_tombstoned(uuid)
from public, anon, authenticated;
revoke all on function private.append_master_machine_history(
  uuid,
  public.machines,
  public.machine_location_kind,
  uuid,
  public.machine_history_action,
  text,
  timestamptz
)
from public, anon, authenticated;
revoke all on function private.append_master_audit(
  uuid,
  text,
  text,
  text,
  uuid,
  uuid[],
  jsonb,
  jsonb,
  text
)
from public, anon, authenticated;

revoke all on function public.poseidon_save_local(text, public.app_role, uuid, jsonb)
from public, anon;
revoke all on function public.poseidon_delete_local(text, public.app_role, uuid, jsonb)
from public, anon;
revoke all on function public.poseidon_save_machine(text, public.app_role, uuid, jsonb)
from public, anon;
revoke all on function public.poseidon_reset_machine_counters(text, public.app_role, uuid, jsonb)
from public, anon;
revoke all on function public.poseidon_move_machine_to_workshop(text, public.app_role, uuid, jsonb)
from public, anon;
revoke all on function public.poseidon_delete_machine(text, public.app_role, uuid, jsonb)
from public, anon;
revoke all on function public.poseidon_assign_machines_to_local(text, public.app_role, uuid, jsonb)
from public, anon;

grant execute on function public.poseidon_save_local(text, public.app_role, uuid, jsonb)
to authenticated;
grant execute on function public.poseidon_delete_local(text, public.app_role, uuid, jsonb)
to authenticated;
grant execute on function public.poseidon_save_machine(text, public.app_role, uuid, jsonb)
to authenticated;
grant execute on function public.poseidon_reset_machine_counters(text, public.app_role, uuid, jsonb)
to authenticated;
grant execute on function public.poseidon_move_machine_to_workshop(text, public.app_role, uuid, jsonb)
to authenticated;
grant execute on function public.poseidon_delete_machine(text, public.app_role, uuid, jsonb)
to authenticated;
grant execute on function public.poseidon_assign_machines_to_local(text, public.app_role, uuid, jsonb)
to authenticated;

comment on function public.poseidon_save_local(text, public.app_role, uuid, jsonb) is
  'Creates or updates a local, its local accounts and workshop assignments atomically as an authenticated administrator.';
comment on function public.poseidon_delete_local(text, public.app_role, uuid, jsonb) is
  'Logically removes a non-primary local, closes its accounts and returns its machines to the workshop without physical deletion.';
comment on function public.poseidon_save_machine(text, public.app_role, uuid, jsonb) is
  'Creates a workshop machine or atomically updates its authorized master data, location, counters, history and audit.';
comment on function public.poseidon_reset_machine_counters(text, public.app_role, uuid, jsonb) is
  'Resets machine counters only without an open local cash balance and appends machine history and audit.';
comment on function public.poseidon_move_machine_to_workshop(text, public.app_role, uuid, jsonb) is
  'Moves one machine from its locked local to the workshop with paired history and audit.';
comment on function public.poseidon_delete_machine(text, public.app_role, uuid, jsonb) is
  'Creates an append-only QUITADA tombstone for an unread workshop machine and retains the master row as DESUSO.';
comment on function public.poseidon_assign_machines_to_local(text, public.app_role, uuid, jsonb) is
  'Atomically assigns a nonempty set of available workshop machines to one locked non-closed local.';

commit;
