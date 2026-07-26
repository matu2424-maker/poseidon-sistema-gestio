begin;

create function private.reject_nonfinite_numeric()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_column text;
  v_value text;
begin
  foreach v_column in array tg_argv
  loop
    v_value := to_jsonb(new) ->> v_column;
    if v_value in ('NaN', 'Infinity', '-Infinity') then
      raise exception using
        errcode = '22003',
        message = format('%I.%I must be finite', tg_table_name, v_column);
    end if;
  end loop;
  return new;
end;
$$;

create function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'ACTIVO'
  );
$$;

create function private.current_actual_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.status = 'ACTIVO';
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select private.current_actual_role()) = 'ADMINISTRADOR', false);
$$;

create function private.is_control_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select private.current_actual_role()) in ('ENCARGADO', 'ADMINISTRADOR'),
    false
  );
$$;

create function private.can_access_local(p_local_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_local_id is not null
    and exists (select 1 from public.locals l where l.id = p_local_id)
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.status = 'ACTIVO'
        and (
          p.role = 'ADMINISTRADOR'
          or exists (
            select 1
            from public.user_locals ul
            where ul.user_id = p.id
              and ul.local_id = p_local_id
          )
        )
    );
$$;

create function private.can_access_all_locals(p_local_ids uuid[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'ACTIVO'
      and coalesce(cardinality(p_local_ids), 0) > 0
      and (
        p.role = 'ADMINISTRADOR'
        or not exists (
          select 1
          from unnest(p_local_ids) requested(local_id)
          where not exists (
            select 1
            from public.user_locals ul
            where ul.user_id = p.id
              and ul.local_id = requested.local_id
          )
        )
      )
  );
$$;

create function private.can_access_salary_closure(p_closure_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (select 1 from public.salary_closures sc where sc.id = p_closure_id)
    and (
      (select private.is_admin())
      or (
        exists (
          select 1
          from public.salary_closure_locals scl
          where scl.closure_id = p_closure_id
        )
        and not exists (
          select 1
          from public.salary_closure_locals scl
          where scl.closure_id = p_closure_id
            and not (select private.can_access_local(scl.local_id))
        )
      )
    );
$$;

create function private.can_access_audit_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.audit_events ae on ae.id = p_event_id
    where p.id = (select auth.uid())
      and p.status = 'ACTIVO'
      and (
        p.role = 'ADMINISTRADOR'
        or (
          p.role = 'ENCARGADO'
          and (select private.can_access_all_locals(
            array(
              select ael.local_id
              from public.audit_event_locals ael
              where ael.audit_event_id = ae.id
            )
          ))
        )
        or (
          p.role = 'CAJERO'
          and ae.actor_id = p.id
          and (select private.can_access_all_locals(
            array(
              select ael.local_id
              from public.audit_event_locals ael
              where ael.audit_event_id = ae.id
            )
          ))
        )
      )
  );
$$;

create function private.assert_command_context(
  p_requested_function public.app_role,
  p_local_id uuid default null
)
returns table (
  actor_id uuid,
  actual_role public.app_role,
  requested_function public.app_role,
  local_id uuid,
  server_time timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;

  select *
  into v_profile
  from public.profiles p
  where p.id = v_user_id;

  if not found or v_profile.status <> 'ACTIVO' then
    raise exception using errcode = '42501', message = 'active profile required';
  end if;

  if not (
    (v_profile.role = 'CAJERO' and p_requested_function = 'CAJERO')
    or (v_profile.role = 'ENCARGADO' and p_requested_function in ('CAJERO', 'ENCARGADO'))
    or (v_profile.role = 'ADMINISTRADOR')
  ) then
    raise exception using errcode = '42501', message = 'requested function is not allowed for the authenticated role';
  end if;

  if p_local_id is not null then
    if not exists (select 1 from public.locals l where l.id = p_local_id) then
      raise exception using errcode = '23503', message = 'local not found';
    end if;
    if v_profile.role <> 'ADMINISTRADOR'
       and not exists (
         select 1
         from public.user_locals ul
         where ul.user_id = v_user_id
           and ul.local_id = p_local_id
       ) then
      raise exception using errcode = '42501', message = 'authenticated user is not assigned to the local';
    end if;
  end if;

  return query
    select v_user_id, v_profile.role, p_requested_function, p_local_id, statement_timestamp();
end;
$$;

create function private.account_balance(p_account_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    sum(
      case
        when am.status <> 'ACTIVO' then 0
        when am.direction = 'ENTRADA' then am.amount
        else -am.amount
      end
    ),
    0
  )::numeric
  from public.account_movements am
  where am.account_id = p_account_id;
$$;

create function private.lock_account_balance(p_account_id uuid)
returns numeric
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.current_accounts ca
  where ca.id = p_account_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'current account not found';
  end if;

  return private.account_balance(p_account_id);
end;
$$;

create function private.assert_available_funds(p_account_id uuid, p_amount numeric)
returns numeric
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_balance numeric;
begin
  if p_amount is null
     or p_amount <= 0
     or p_amount::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using errcode = '22023', message = 'amount must be finite and greater than zero';
  end if;

  v_balance := private.lock_account_balance(p_account_id);
  if v_balance < p_amount then
    raise exception using errcode = '23514', message = 'insufficient funds';
  end if;

  return v_balance;
end;
$$;

create function private.claim_command(
  p_requested_function public.app_role,
  p_local_id uuid,
  p_command_name text,
  p_idempotency_key text,
  p_request_hash text
)
returns public.command_requests
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor record;
  v_request public.command_requests%rowtype;
begin
  select *
  into v_actor
  from private.assert_command_context(p_requested_function, p_local_id);

  insert into public.command_requests (
    actor_id,
    actual_role,
    requested_function,
    command_name,
    local_id,
    idempotency_key,
    request_hash
  )
  values (
    v_actor.actor_id,
    v_actor.actual_role,
    p_requested_function,
    p_command_name,
    p_local_id,
    p_idempotency_key,
    lower(p_request_hash)
  )
  on conflict (actor_id, command_name, idempotency_key) do nothing
  returning * into v_request;

  if v_request.id is null then
    select *
    into v_request
    from public.command_requests cr
    where cr.actor_id = v_actor.actor_id
      and cr.command_name = p_command_name
      and cr.idempotency_key = p_idempotency_key
    for update;

    if v_request.request_hash <> lower(p_request_hash)
       or v_request.requested_function <> p_requested_function
       or v_request.local_id is distinct from p_local_id then
      raise exception using
        errcode = '22023',
        message = 'idempotency key was already used with a different request';
    end if;
  end if;

  return v_request;
end;
$$;

create function private.finish_command(
  p_command_request_id uuid,
  p_status public.command_request_status,
  p_response_payload jsonb default null,
  p_error_code text default null
)
returns public.command_requests
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_request public.command_requests%rowtype;
begin
  if p_status not in ('APLICADO', 'FALLIDO') then
    raise exception using errcode = '22023', message = 'a completed command must be APPLIED or FAILED';
  end if;

  update public.command_requests cr
  set
    status = p_status,
    response_payload = p_response_payload,
    error_code = p_error_code,
    completed_at = statement_timestamp()
  where cr.id = p_command_request_id
    and cr.actor_id = auth.uid()
    and cr.status = 'PENDIENTE'
  returning * into v_request;

  if v_request.id is null then
    raise exception using errcode = '55000', message = 'pending command request not found for the authenticated actor';
  end if;

  return v_request;
end;
$$;

comment on function private.assert_command_context(public.app_role, uuid) is
  'Derives actor and actual role from auth.uid(); requested function and local are validated, never trusted as actor identity.';
comment on function private.claim_command(public.app_role, uuid, text, text, text) is
  'Internal idempotency claim for a specific transactional command. It does not accept or persist an AppData snapshot.';

create trigger staff_reject_nonfinite
before insert or update on public.staff
for each row execute function private.reject_nonfinite_numeric(
  'nominal_salary',
  'salary_advance_balance',
  'vacation_days',
  'used_vacation_days',
  'estimated_aguinaldo',
  'estimated_vacation_salary'
);
create trigger salary_history_reject_nonfinite
before insert or update on public.salary_history
for each row execute function private.reject_nonfinite_numeric(
  'previous_nominal_salary',
  'new_nominal_salary'
);
create trigger machines_reject_nonfinite
before insert or update on public.machines
for each row execute function private.reject_nonfinite_numeric('last_in', 'last_out');
create trigger cash_balances_reject_nonfinite
before insert or update on public.cash_balances
for each row execute function private.reject_nonfinite_numeric(
  'initial_cash',
  'initial_bank',
  'declared_cash',
  'declared_bank',
  'next_cash_base',
  'next_bank_base',
  'final_transfer_to_principal_cash',
  'final_transfer_to_principal_bank',
  'cash_difference',
  'bank_difference'
);
create trigger machine_readings_reject_nonfinite
before insert or update on public.machine_readings
for each row execute function private.reject_nonfinite_numeric(
  'in_previous',
  'in_actual',
  'out_previous',
  'out_actual',
  'result'
);
create trigger expenses_reject_nonfinite
before insert or update on public.expenses
for each row execute function private.reject_nonfinite_numeric('amount');
create trigger transfers_reject_nonfinite
before insert or update on public.transfers
for each row execute function private.reject_nonfinite_numeric('amount');
create trigger gifts_reject_nonfinite
before insert or update on public.gifts
for each row execute function private.reject_nonfinite_numeric('cash_amount', 'credit_amount');
create trigger capital_movements_reject_nonfinite
before insert or update on public.capital_movements
for each row execute function private.reject_nonfinite_numeric('amount');
create trigger treasury_transfers_reject_nonfinite
before insert or update on public.treasury_transfers
for each row execute function private.reject_nonfinite_numeric('amount');
create trigger partner_movements_reject_nonfinite
before insert or update on public.partner_movements
for each row execute function private.reject_nonfinite_numeric('amount');
create trigger account_movements_reject_nonfinite
before insert or update on public.account_movements
for each row execute function private.reject_nonfinite_numeric('amount');
create trigger salary_closures_reject_nonfinite
before insert or update on public.salary_closures
for each row execute function private.reject_nonfinite_numeric(
  'total_base',
  'total_extras',
  'total_bonuses',
  'total_deductions',
  'total_salaries',
  'total_salary_paid',
  'total_advances',
  'total_base_covered',
  'total_liquidated',
  'total_pending'
);
create trigger salary_settlements_reject_nonfinite
before insert or update on public.salary_settlements
for each row execute function private.reject_nonfinite_numeric(
  'base_salary',
  'advances',
  'extra_amount',
  'aguinaldo',
  'vacation_salary',
  'other_deductions',
  'total_to_pay'
);
create trigger salary_closure_employee_reject_nonfinite
before insert or update on public.salary_closure_employee_snapshots
for each row execute function private.reject_nonfinite_numeric(
  'base_salary',
  'salary_paid',
  'advances',
  'extra_amount',
  'bonuses',
  'deductions',
  'total_amount',
  'base_covered_amount',
  'liquidated_amount',
  'pending_amount'
);
create trigger salary_closure_settlement_reject_nonfinite
before insert or update on public.salary_closure_settlement_snapshots
for each row execute function private.reject_nonfinite_numeric('amount');
create trigger periodic_closures_reject_nonfinite
before insert or update on public.periodic_closures
for each row execute function private.reject_nonfinite_numeric(
  'result_machines',
  'total_expenses',
  'total_salaries',
  'total_gifts',
  'total_outflows',
  'commercial_result',
  'total_transfers',
  'total_withdrawals',
  'total_contributions',
  'total_caja_to_principal',
  'total_principal_to_caja',
  'total_partner_contributions',
  'total_partner_withdrawals',
  'cash_difference',
  'bank_difference'
);

revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_control_user() to authenticated;
grant execute on function private.can_access_local(uuid) to authenticated;
grant execute on function private.can_access_all_locals(uuid[]) to authenticated;
grant execute on function private.can_access_salary_closure(uuid) to authenticated;
grant execute on function private.can_access_audit_event(uuid) to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
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
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
  end loop;
end;
$$;

create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
);

create policy user_locals_select_self_or_admin
on public.user_locals
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin())
);

create policy locals_select_by_assignment
on public.locals
for select
to authenticated
using ((select private.can_access_local(id)));

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'clients',
    'cash_balances',
    'machine_readings',
    'transfers',
    'gifts',
    'gift_clients',
    'capital_movements',
    'treasury_transfers'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.can_access_local(local_id)))',
      v_table || '_select_by_local',
      v_table
    );
  end loop;
end;
$$;

create policy staff_select_by_control_local
on public.staff
for select
to authenticated
using (
  (select private.is_control_user())
  and (select private.can_access_local(local_id))
);

create policy expenses_select_by_scope
on public.expenses
for select
to authenticated
using (
  (select private.can_access_local(local_id))
  and (
    (select private.is_control_user())
    or balance_id is not null
  )
);

create policy attachments_select_by_local
on public.attachments
for select
to authenticated
using (
  (select private.can_access_local(owner_local_id))
  and (
    (select private.is_control_user())
    or owner_type in ('LOCAL', 'CLIENTE_FOTO', 'CLIENTE_DOCUMENTO')
    or (
      owner_type = 'GASTO_COMPROBANTE'
      and exists (
        select 1
        from public.expenses e
        where e.id = expense_id
          and e.balance_id is not null
      )
    )
  )
);

create policy expense_categories_select_active_users
on public.expense_categories
for select
to authenticated
using ((select private.is_active_user()));

create policy expense_subcategories_select_active_users
on public.expense_subcategories
for select
to authenticated
using ((select private.is_active_user()));

create policy machines_select_by_location
on public.machines
for select
to authenticated
using (
  (select private.is_admin())
  or (
    current_location_kind = 'LOCAL'
    and (select private.can_access_local(current_local_id))
  )
);

create policy machine_history_select_by_location
on public.machine_history
for select
to authenticated
using (
  (select private.is_admin())
  or (
    location_kind = 'LOCAL'
    and (select private.can_access_local(local_id))
  )
);

create policy current_accounts_select_by_scope
on public.current_accounts
for select
to authenticated
using (
  (
    local_id is not null
    and (select private.can_access_local(local_id))
    and (
      (select private.is_control_user())
      or kind in ('LOCAL_EFECTIVO', 'LOCAL_BANCO')
    )
  )
  or (
    kind in ('TRANSFERENCIAS', 'PRINCIPAL_EFECTIVO', 'PRINCIPAL_BANCO', 'SOCIO')
    and (select private.is_control_user())
  )
);

create policy account_movements_select_by_scope
on public.account_movements
for select
to authenticated
using (
  (select private.is_admin())
  or (
    local_id is not null
    and (select private.can_access_local(local_id))
    and (
      (select private.is_control_user())
      or actor_id = (select auth.uid())
    )
  )
);

create policy salary_closures_select_by_scope
on public.salary_closures
for select
to authenticated
using (
  (select private.is_control_user())
  and (select private.can_access_salary_closure(id))
);

create policy salary_closure_locals_select_by_scope
on public.salary_closure_locals
for select
to authenticated
using (
  (select private.is_control_user())
  and (select private.can_access_salary_closure(closure_id))
);

create policy staff_schedules_select_by_control_local
on public.staff_schedules
for select
to authenticated
using (
  (select private.is_control_user())
  and (select private.can_access_local(local_id))
);

create policy salary_history_select_by_control_local
on public.salary_history
for select
to authenticated
using (
  (select private.is_control_user())
  and (select private.can_access_local(local_id))
);

create policy partner_movements_select_by_control_local
on public.partner_movements
for select
to authenticated
using (
  (select private.is_control_user())
  and (select private.can_access_local(local_id))
);

create policy salary_settlements_select_by_scope
on public.salary_settlements
for select
to authenticated
using (
  (select private.can_access_local(local_id))
  and (
    (select private.is_control_user())
    or (
      origin = 'CAJA'
      and created_by = (select auth.uid())
    )
  )
);

create policy salary_closure_employee_snapshots_select_by_scope
on public.salary_closure_employee_snapshots
for select
to authenticated
using (
  (select private.is_control_user())
  and (select private.can_access_salary_closure(closure_id))
);

create policy salary_closure_settlement_snapshots_select_by_scope
on public.salary_closure_settlement_snapshots
for select
to authenticated
using (
  (select private.is_control_user())
  and (select private.can_access_salary_closure(closure_id))
);

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'periodic_closures',
    'periodic_closure_balances',
    'periodic_closure_expenses',
    'periodic_closure_salary_settlements',
    'periodic_closure_treasury_transfers',
    'periodic_closure_partner_movements'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_control_user()) and (select private.can_access_local(local_id)))',
      v_table || '_select_by_control_local',
      v_table
    );
  end loop;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'cash_balances',
    'machine_readings',
    'expenses',
    'transfers',
    'gifts',
    'gift_clients',
    'capital_movements',
    'treasury_transfers',
    'partner_movements',
    'salary_settlements',
    'periodic_closures'
  ]
  loop
    execute format(
      'create trigger %I before delete on public.%I for each row execute function private.reject_append_only_mutation()',
      v_table || '_no_delete',
      v_table
    );
  end loop;
end;
$$;

create policy audit_events_select_by_scope
on public.audit_events
for select
to authenticated
using ((select private.can_access_audit_event(id)));

create policy audit_event_locals_select_by_scope
on public.audit_event_locals
for select
to authenticated
using ((select private.can_access_audit_event(audit_event_id)));

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select on table
  public.profiles,
  public.locals,
  public.user_locals,
  public.staff,
  public.staff_schedules,
  public.salary_history,
  public.clients,
  public.expense_categories,
  public.expense_subcategories,
  public.machines,
  public.machine_history,
  public.current_accounts,
  public.cash_balances,
  public.machine_readings,
  public.expenses,
  public.transfers,
  public.gifts,
  public.gift_clients,
  public.capital_movements,
  public.treasury_transfers,
  public.partner_movements,
  public.account_movements,
  public.salary_closures,
  public.salary_closure_locals,
  public.salary_settlements,
  public.salary_closure_employee_snapshots,
  public.salary_closure_settlement_snapshots,
  public.periodic_closures,
  public.periodic_closure_balances,
  public.periodic_closure_expenses,
  public.periodic_closure_salary_settlements,
  public.periodic_closure_treasury_transfers,
  public.periodic_closure_partner_movements,
  public.attachments,
  public.audit_events,
  public.audit_event_locals
to authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

comment on table public.command_requests is
  'RLS enabled with no client policy or grant. Only narrowly scoped server commands may claim or complete requests.';

-- This migration is the first one removed during a reverse teardown. Drop RLS
-- policies and private helpers before dropping the tables they reference.

commit;
