begin;

create function private.salary_period_month(p_period text)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_year integer;
  v_month integer;
begin
  if p_period is null
     or p_period !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception using
      errcode = '22023',
      message = 'salary period must use YYYY-MM';
  end if;

  v_year := pg_catalog.substring(p_period, 1, 4)::integer;
  v_month := pg_catalog.substring(p_period, 6, 2)::integer;
  return pg_catalog.make_date(v_year, v_month, 1);
end;
$$;

create function private.salary_period_label(p_period_month date)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select (
    case pg_catalog.date_part('month', p_period_month)::integer
      when 1 then 'Enero'
      when 2 then 'Febrero'
      when 3 then 'Marzo'
      when 4 then 'Abril'
      when 5 then 'Mayo'
      when 6 then 'Junio'
      when 7 then 'Julio'
      when 8 then 'Agosto'
      when 9 then 'Septiembre'
      when 10 then 'Octubre'
      when 11 then 'Noviembre'
      when 12 then 'Diciembre'
    end
  ) || ' ' || pg_catalog.date_part('year', p_period_month)::integer::text;
$$;

create function private.normalize_salary_concept(p_concept text)
returns public.salary_concept
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_concept text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_concept, '')));
begin
  if v_concept = '' then
    return null;
  elsif v_concept = 'SUELDO' then
    return 'SALARIO';
  elsif v_concept = 'AJUSTE' then
    return 'EXTRA';
  elsif v_concept in (
    'SALARIO',
    'ADELANTO',
    'EXTRA',
    'HORAS_EXTRAS',
    'DESCUENTO',
    'AGUINALDO',
    'SALARIO_VACACIONAL'
  ) then
    return v_concept::public.salary_concept;
  end if;

  raise exception using
    errcode = '22023',
    message = 'unsupported salary concept';
end;
$$;

create function private.salary_settlement_cash_amount(
  p_settlement public.salary_settlements
)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_settlement.id is null then 0
    else case private.normalize_salary_concept(p_settlement.concept::text)
      when 'ADELANTO' then p_settlement.advances
      when 'DESCUENTO' then 0
      else case
        when p_settlement.total_to_pay <> 0 then p_settlement.total_to_pay
        else p_settlement.base_salary
          + p_settlement.extra_amount
          + p_settlement.aguinaldo
          + p_settlement.vacation_salary
      end
    end
  end;
$$;

create function private.salary_settlement_display_amount(
  p_settlement public.salary_settlements
)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_settlement.id is null then 0
    when private.normalize_salary_concept(p_settlement.concept::text) = 'DESCUENTO'
      then p_settlement.other_deductions
    else private.salary_settlement_cash_amount(p_settlement)
  end;
$$;

create function private.lock_salary_periods(p_periods date[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_period date;
begin
  if coalesce(pg_catalog.cardinality(p_periods), 0) = 0 then
    raise exception using
      errcode = '22023',
      message = 'at least one salary period is required';
  end if;

  for v_period in
    select distinct requested.period_month
    from pg_catalog.unnest(p_periods) requested(period_month)
    where requested.period_month is not null
    order by requested.period_month
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'poseidon-salary-period'
          || pg_catalog.chr(31)
          || v_period::text,
        0
      )
    );
  end loop;
end;
$$;

create function private.next_salary_closure_visible_id()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_maximum integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('poseidon-salary-closure-visible-id', 0)
  );

  select coalesce(
    pg_catalog.max(
      case
        when sc.visible_id ~ '^LS-[0-9]+$'
          then pg_catalog.substring(sc.visible_id, 4)::integer
        else 0
      end
    ),
    0
  )
  into v_maximum
  from public.salary_closures sc;

  return 'LS-' || (v_maximum + 1)::text;
end;
$$;

create function private.require_staff_account(
  p_staff_id uuid,
  p_local_id uuid
)
returns public.current_accounts
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account public.current_accounts%rowtype;
begin
  select *
  into v_account
  from public.current_accounts ca
  where ca.kind = 'PERSONAL'
    and ca.staff_id = p_staff_id
    and ca.local_id = p_local_id
    and ca.status = 'ACTIVA'
    and ca.currency = 'UYU';

  if not found then
    raise exception using
      errcode = '23503',
      message = 'active staff current account not found';
  end if;

  return v_account;
end;
$$;

create function private.salary_base_for_period(
  p_staff public.staff,
  p_period_month date
)
returns table (
  amount numeric,
  salary_type public.salary_type
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_period_end date := (
    p_period_month + pg_catalog.make_interval(months => 1) - interval '1 day'
  )::date;
  v_history public.salary_history%rowtype;
begin
  if p_staff.hire_date > v_period_end
     or (
       p_staff.terminated_at is not null
       and (p_staff.terminated_at at time zone 'America/Montevideo')::date
         < p_period_month
     ) then
    amount := 0;
    salary_type := p_staff.salary_type;
    return next;
    return;
  end if;

  select *
  into v_history
  from public.salary_history sh
  where sh.staff_id = p_staff.id
    and sh.local_id = p_staff.local_id
    and sh.effective_date <= v_period_end
  order by sh.effective_date desc, sh.created_at desc, sh.id desc
  limit 1;

  amount := coalesce(v_history.new_nominal_salary, p_staff.nominal_salary, 0);
  salary_type := coalesce(v_history.new_salary_type, p_staff.salary_type);
  return next;
end;
$$;

create function private.assert_salary_period_mutable(
  p_period_month date,
  p_correction_closure_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_latest public.salary_closures%rowtype;
  v_correction public.salary_closures%rowtype;
begin
  select *
  into v_latest
  from public.salary_closures sc
  where sc.period_month = p_period_month
    and sc.status = 'CERRADO'
  order by sc.revision desc, sc.closed_at desc, sc.id desc
  limit 1
  for share;

  if not found then
    if p_correction_closure_id is not null then
      raise exception using
        errcode = '55000',
        message = 'salary correction does not belong to a closed period';
    end if;
    return;
  end if;

  if p_correction_closure_id is null then
    raise exception using
      errcode = '55000',
      message = pg_catalog.format(
        'salary period %s is closed by %s',
        pg_catalog.to_char(p_period_month, 'YYYY-MM'),
        v_latest.visible_id
      );
  end if;

  select *
  into v_correction
  from public.salary_closures sc
  where sc.id = p_correction_closure_id
    and sc.period_month = p_period_month
    and sc.kind = 'CORRECTIVO'
    and sc.status = 'CORRECCION_ABIERTA'
  for share;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'salary correction is not open for the period';
  end if;

  if v_correction.parent_closure_id <> v_latest.id then
    raise exception using
      errcode = '55000',
      message = pg_catalog.format(
        'salary correction must start from latest closure %s',
        v_latest.visible_id
      );
  end if;
end;
$$;

create function private.salary_period_employee_rows(p_period_month date)
returns table (
  staff_id uuid,
  staff_name_snapshot text,
  position_snapshot text,
  local_id uuid,
  salary_type public.salary_type,
  base_salary numeric,
  salary_paid numeric,
  advances numeric,
  extra_amount numeric,
  bonuses numeric,
  deductions numeric,
  total_amount numeric,
  base_covered_amount numeric,
  liquidated_amount numeric,
  pending_amount numeric,
  settlement_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with relevant_staff as (
    select
      s.*,
      base.amount as effective_base,
      base.salary_type as effective_salary_type,
      exists (
        select 1
        from public.salary_settlements any_ss
        where any_ss.staff_id = s.id
          and any_ss.period_month = p_period_month
      ) as has_any_settlement
    from public.staff s
    cross join lateral private.salary_base_for_period(s, p_period_month) base
    where (
      s.hire_date <= (
        p_period_month
          + pg_catalog.make_interval(months => 1)
          - interval '1 day'
      )::date
      and (
        s.terminated_at is null
        or (s.terminated_at at time zone 'America/Montevideo')::date
          >= p_period_month
      )
    )
    or exists (
      select 1
      from public.salary_settlements period_ss
      where period_ss.staff_id = s.id
        and period_ss.period_month = p_period_month
    )
  ),
  summarized as (
    select
      rs.id as staff_id,
      pg_catalog.btrim(rs.first_name || ' ' || rs.last_name)
        as staff_name_snapshot,
      rs.position::text as position_snapshot,
      rs.local_id,
      rs.effective_salary_type as salary_type,
      rs.effective_base::numeric as base_salary,
      coalesce(
        pg_catalog.sum(
          private.salary_settlement_cash_amount(ss)
        ) filter (
          where ss.status <> 'ANULADA'
            and private.normalize_salary_concept(ss.concept::text) = 'SALARIO'
        ),
        0
      )::numeric as salary_paid,
      coalesce(
        pg_catalog.sum(ss.advances)
          filter (where ss.status <> 'ANULADA'),
        0
      )::numeric as advances,
      coalesce(
        pg_catalog.sum(ss.extra_amount)
          filter (where ss.status <> 'ANULADA'),
        0
      )::numeric as extra_amount,
      coalesce(
        pg_catalog.sum(ss.aguinaldo + ss.vacation_salary)
          filter (where ss.status <> 'ANULADA'),
        0
      )::numeric as bonuses,
      coalesce(
        pg_catalog.sum(ss.other_deductions)
          filter (where ss.status <> 'ANULADA'),
        0
      )::numeric as deductions,
      pg_catalog.count(ss.id)
        filter (where ss.status <> 'ANULADA')::integer as settlement_count,
      rs.has_any_settlement
    from relevant_staff rs
    left join public.salary_settlements ss
      on ss.staff_id = rs.id
      and ss.local_id = rs.local_id
      and ss.period_month = p_period_month
    group by
      rs.id,
      rs.first_name,
      rs.last_name,
      rs.position,
      rs.local_id,
      rs.effective_salary_type,
      rs.effective_base,
      rs.has_any_settlement
  )
  select
    summarized.staff_id,
    summarized.staff_name_snapshot,
    summarized.position_snapshot,
    summarized.local_id,
    summarized.salary_type,
    summarized.base_salary,
    summarized.salary_paid,
    summarized.advances,
    summarized.extra_amount,
    summarized.bonuses,
    summarized.deductions,
    greatest(
      0::numeric,
      summarized.base_salary
        + summarized.extra_amount
        + summarized.bonuses
        - summarized.deductions
    )::numeric as total_amount,
    (
      summarized.salary_paid
        + summarized.advances
        + summarized.deductions
    )::numeric as base_covered_amount,
    (
      summarized.salary_paid
        + summarized.advances
        + summarized.extra_amount
        + summarized.bonuses
    )::numeric as liquidated_amount,
    (
      summarized.base_salary
        - summarized.salary_paid
        - summarized.advances
        - summarized.deductions
    )::numeric as pending_amount,
    summarized.settlement_count
  from summarized
  where summarized.base_salary > 0
     or summarized.has_any_settlement;
$$;

create function private.assert_salary_command_locals(p_local_ids uuid[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce(pg_catalog.cardinality(p_local_ids), 0) = 0 then
    raise exception using
      errcode = '55000',
      message = 'salary snapshot must include at least one local';
  end if;

  if not private.can_access_all_locals(p_local_ids) then
    raise exception using
      errcode = '42501',
      message = 'authenticated user cannot access every salary snapshot local';
  end if;
end;
$$;

create function private.append_difference_adjustment(
  p_command_request_id uuid,
  p_account_id uuid,
  p_local_id uuid,
  p_balance_id uuid,
  p_source_id text,
  p_direction public.account_movement_direction,
  p_concept text,
  p_amount numeric,
  p_detail text,
  p_previous_adjustment_id uuid,
  p_created_at timestamptz default statement_timestamp()
)
returns public.account_movements
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor_legacy_id text;
  v_movement_id uuid := extensions.gen_random_uuid();
  v_movement public.account_movements%rowtype;
begin
  select cr.actor_id, p.legacy_id
  into v_actor_id, v_actor_legacy_id
  from public.command_requests cr
  join public.profiles p on p.id = cr.actor_id
  where cr.id = p_command_request_id
    and cr.actor_id = auth.uid()
    and cr.status = 'PENDIENTE';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'pending authenticated command not found for difference append';
  end if;

  if p_amount is null
     or p_amount <= 0
     or p_amount::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception using
      errcode = '22023',
      message = 'difference amount must be finite and greater than zero';
  end if;

  if p_previous_adjustment_id is not null then
    if not exists (
      select 1
      from public.account_movements previous
      where previous.id = p_previous_adjustment_id
        and previous.account_id = p_account_id
        and previous.local_id = p_local_id
        and previous.balance_id = p_balance_id
        and previous.source_type = 'DIFERENCIA_CAJA'
        and previous.status = 'ACTIVO'
    ) then
      raise exception using
        errcode = '23503',
        message = 'previous difference adjustment was not found';
    end if;

    if exists (
      select 1
      from public.account_movements child
      where child.previous_adjustment_id = p_previous_adjustment_id
    ) then
      raise exception using
        errcode = '55000',
        message = 'previous difference adjustment already has a successor';
    end if;
  end if;

  insert into public.account_movements (
    id,
    legacy_id,
    account_id,
    local_id,
    balance_id,
    source_type,
    source_id,
    direction,
    concept,
    amount,
    currency,
    detail,
    status,
    actor_id,
    actor_legacy_id,
    previous_adjustment_id,
    created_at
  )
  values (
    v_movement_id,
    'account-movement-' || v_movement_id::text,
    p_account_id,
    p_local_id,
    p_balance_id,
    'DIFERENCIA_CAJA',
    pg_catalog.btrim(p_source_id),
    p_direction,
    pg_catalog.btrim(p_concept),
    p_amount,
    'UYU',
    pg_catalog.btrim(p_detail),
    'ACTIVO',
    v_actor_id,
    v_actor_legacy_id,
    p_previous_adjustment_id,
    coalesce(p_created_at, statement_timestamp())
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

create function public.poseidon_save_salary_settlement(
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
  v_actor public.profiles%rowtype;
  v_staff public.staff%rowtype;
  v_existing public.salary_settlements%rowtype;
  v_annulled_existing public.salary_settlements%rowtype;
  v_settlement public.salary_settlements%rowtype;
  v_balance public.cash_balances%rowtype;
  v_payment_account public.current_accounts%rowtype;
  v_previous_payment_account public.current_accounts%rowtype;
  v_staff_account public.current_accounts%rowtype;
  v_movement public.account_movements%rowtype;
  v_period_month date;
  v_source_period_month date;
  v_correction_closure_id uuid;
  v_concept public.salary_concept;
  v_origin public.salary_settlement_origin;
  v_amount numeric;
  v_salary_base numeric;
  v_salary_type public.salary_type;
  v_current_salary_paid numeric;
  v_current_advances numeric;
  v_current_deductions numeric;
  v_next_salary_paid numeric;
  v_next_advances numeric;
  v_next_deductions numeric;
  v_cash_amount numeric;
  v_previous_cash_amount numeric := 0;
  v_net_cash_outflow numeric := 0;
  v_existing_reference text;
  v_balance_reference text;
  v_payment_reference text;
  v_correction_reference text;
  v_notes text;
  v_staff_name text;
  v_settlement_id uuid := extensions.gen_random_uuid();
  v_reversal_ids uuid[] := array[]::uuid[];
  v_ledger_ids uuid[] := array[]::uuid[];
  v_lock_ids uuid[];
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'save_salary_settlement',
    p_idempotency_key,
    private.command_request_hash(
      'save_salary_settlement',
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
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'payload must be a JSON object';
  end if;

  v_period_month := private.salary_period_month(
    coalesce(p_payload ->> 'period', p_payload ->> 'period_month')
  );
  v_concept := private.normalize_salary_concept(p_payload ->> 'concept');
  if v_concept is null then
    raise exception using
      errcode = '22023',
      message = 'unsupported salary concept';
  end if;
  v_amount := private.positive_payload_amount(p_payload);
  v_notes := pg_catalog.btrim(coalesce(p_payload ->> 'notes', ''));
  v_origin := pg_catalog.upper(
    pg_catalog.btrim(coalesce(p_payload ->> 'origin', ''))
  )::public.salary_settlement_origin;

  if v_origin = 'CAJA' and p_actor_function <> 'CAJERO' then
    raise exception using
      errcode = '42501',
      message = 'Caja salary payments require the cashier function';
  elsif v_origin = 'LIQUIDACION'
        and p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'Principal salary settlements require a control function';
  end if;

  if v_origin = 'CAJA'
     and v_concept not in ('SALARIO', 'ADELANTO') then
    raise exception using
      errcode = '22023',
      message = 'Caja only accepts SALARIO or ADELANTO';
  end if;

  v_existing_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'settlementId', p_payload ->> 'settlement_id', '')
    ),
    ''
  );
  v_balance_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')
    ),
    ''
  );
  v_payment_reference := nullif(
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'paymentAccountId',
        p_payload ->> 'payment_account_id',
        ''
      )
    ),
    ''
  );
  v_correction_reference := nullif(
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'correctionClosureId',
        p_payload ->> 'correction_closure_id',
        ''
      )
    ),
    ''
  );

  if v_existing_reference is not null then
    select ss.period_month
    into v_source_period_month
    from public.salary_settlements ss
    where ss.local_id = p_local_id
      and (
        ss.id::text = v_existing_reference
        or ss.legacy_id = v_existing_reference
      );

    if not found then
      raise exception using
        errcode = '23503',
        message = 'salary settlement not found in command local';
    end if;
  end if;

  perform private.lock_salary_periods(
    array[v_period_month, v_source_period_month]
  );

  if v_correction_reference is not null then
    select sc.id
    into v_correction_closure_id
    from public.salary_closures sc
    where sc.id::text = v_correction_reference
       or sc.legacy_id = v_correction_reference;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'salary correction closure not found';
    end if;
  end if;

  select *
  into v_staff
  from public.staff s
  where s.local_id = p_local_id
    and s.status = 'ACTIVO'
    and (
      s.id::text = pg_catalog.btrim(
        coalesce(p_payload ->> 'staffId', p_payload ->> 'staff_id', '')
      )
      or s.legacy_id = pg_catalog.btrim(
        coalesce(p_payload ->> 'staffId', p_payload ->> 'staff_id', '')
      )
    )
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'active staff member not found in command local';
  end if;

  if v_existing_reference is not null then
    select *
    into v_existing
    from public.salary_settlements ss
    where ss.local_id = p_local_id
      and (
        ss.id::text = v_existing_reference
        or ss.legacy_id = v_existing_reference
      )
    for update;

    if v_existing.status = 'ANULADA' then
      raise exception using
        errcode = '55000',
        message = 'an annulled salary settlement cannot be edited';
    end if;
    if v_existing.staff_id <> v_staff.id then
      raise exception using
        errcode = '23514',
        message = 'an existing salary settlement cannot change staff or local';
    end if;
    if v_existing.origin <> v_origin then
      raise exception using
        errcode = '23514',
        message = 'an existing salary settlement cannot change origin';
    end if;
  end if;

  if v_origin = 'LIQUIDACION' and v_balance_reference is not null then
    raise exception using
      errcode = '22023',
      message = 'Principal salary settlements must not include balanceId';
  end if;

  if v_origin = 'CAJA' then
    if v_balance_reference is null then
      raise exception using
        errcode = '22023',
        message = 'balanceId is required for Caja salary payments';
    end if;

    select *
    into v_balance
    from public.cash_balances cb
    where cb.local_id = p_local_id
      and (
        cb.id::text = v_balance_reference
        or cb.legacy_id = v_balance_reference
      )
    for update;

    if not found or v_balance.status <> 'EN_PROCESO' then
      raise exception using
        errcode = '55000',
        message = 'Caja salary payments require the active local balance';
    end if;

    if v_existing.id is not null
       and v_existing.balance_id <> v_balance.id then
      raise exception using
        errcode = '23514',
        message = 'an existing salary settlement cannot change cash balance';
    end if;

    v_payment_account := private.require_current_account(
      'LOCAL_EFECTIVO',
      p_local_id,
      null
    );
    if v_payment_reference is not null
       and v_payment_reference not in (
         v_payment_account.id::text,
         v_payment_account.legacy_id
       ) then
      raise exception using
        errcode = '22023',
        message = 'Caja salary payment account must be Local / Efectivo';
    end if;
  else
    if v_payment_reference is not null then
      select *
      into v_payment_account
      from public.current_accounts ca
      where (
          ca.id::text = v_payment_reference
          or ca.legacy_id = v_payment_reference
        )
        and ca.kind in ('PRINCIPAL_EFECTIVO', 'PRINCIPAL_BANCO')
        and ca.status = 'ACTIVA'
        and ca.currency = 'UYU';

      if not found then
        raise exception using
          errcode = '23503',
          message = 'active Principal salary payment account not found';
      end if;
    elsif v_existing.id is not null then
      select *
      into v_payment_account
      from public.current_accounts ca
      where ca.id = v_existing.payment_account_id
        and ca.kind in ('PRINCIPAL_EFECTIVO', 'PRINCIPAL_BANCO')
        and ca.status = 'ACTIVA'
        and ca.currency = 'UYU';

      if not found then
        raise exception using
          errcode = '23503',
          message = 'existing Principal salary payment account is not active';
      end if;
    else
      v_payment_account := private.require_current_account(
        'PRINCIPAL_EFECTIVO',
        null,
        null
      );
    end if;
  end if;

  perform private.assert_salary_period_mutable(
    v_period_month,
    v_correction_closure_id
  );
  if v_existing.id is not null
     and v_existing.period_month <> v_period_month then
    perform private.assert_salary_period_mutable(
      v_existing.period_month,
      v_correction_closure_id
    );
  end if;

  select base.amount, base.salary_type
  into v_salary_base, v_salary_type
  from private.salary_base_for_period(v_staff, v_period_month) base;

  select
    coalesce(
      pg_catalog.sum(private.salary_settlement_cash_amount(ss))
        filter (
          where private.normalize_salary_concept(ss.concept::text) = 'SALARIO'
        ),
      0
    ),
    coalesce(pg_catalog.sum(ss.advances), 0),
    coalesce(pg_catalog.sum(ss.other_deductions), 0)
  into
    v_current_salary_paid,
    v_current_advances,
    v_current_deductions
  from public.salary_settlements ss
  where ss.staff_id = v_staff.id
    and ss.local_id = p_local_id
    and ss.period_month = v_period_month
    and ss.status <> 'ANULADA'
    and (v_existing.id is null or ss.id <> v_existing.id);

  v_next_salary_paid := v_current_salary_paid
    + case when v_concept = 'SALARIO' then v_amount else 0 end;
  v_next_advances := v_current_advances
    + case when v_concept = 'ADELANTO' then v_amount else 0 end;
  v_next_deductions := v_current_deductions
    + case when v_concept = 'DESCUENTO' then v_amount else 0 end;

  if v_concept = 'SALARIO' and v_amount > v_salary_base then
    raise exception using
      errcode = '23514',
      message = 'salary payment cannot exceed effective base salary';
  elsif v_next_salary_paid > v_salary_base then
    raise exception using
      errcode = '23514',
      message = 'accumulated salary payments cannot exceed effective base salary';
  elsif v_next_salary_paid + v_next_advances > v_salary_base then
    raise exception using
      errcode = '23514',
      message = 'salary payments plus advances cannot exceed effective base salary';
  elsif v_next_salary_paid + v_next_advances + v_next_deductions
        > v_salary_base then
    raise exception using
      errcode = '23514',
      message = 'salary payments, advances and deductions cannot exceed effective base salary';
  end if;

  v_staff_account := private.require_staff_account(v_staff.id, p_local_id);
  v_cash_amount := case when v_concept = 'DESCUENTO' then 0 else v_amount end;

  if v_existing.id is not null then
    v_previous_cash_amount :=
      private.salary_settlement_cash_amount(v_existing);
    if v_previous_cash_amount > 0 then
      select *
      into v_previous_payment_account
      from public.current_accounts ca
      where ca.id = v_existing.payment_account_id
        and ca.status = 'ACTIVA'
        and ca.currency = 'UYU';

      if not found then
        raise exception using
          errcode = '23503',
          message = 'existing salary payment account is not active';
      end if;
    end if;
  end if;

  select pg_catalog.array_agg(
    distinct requested.account_id
    order by requested.account_id
  )
  into v_lock_ids
  from pg_catalog.unnest(
    array[
      v_staff_account.id,
      case when v_cash_amount > 0 then v_payment_account.id end,
      case
        when v_previous_cash_amount > 0
          then v_previous_payment_account.id
      end
    ]
  ) requested(account_id)
  where requested.account_id is not null;

  perform private.lock_current_accounts(v_lock_ids);

  if v_origin = 'CAJA' then
    perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  end if;

  if v_cash_amount > 0 then
    v_net_cash_outflow := case
      when v_existing.id is not null
        and v_previous_cash_amount > 0
        and v_payment_account.id = v_previous_payment_account.id
        then greatest(0::numeric, v_cash_amount - v_previous_cash_amount)
      else v_cash_amount
    end;

    if v_net_cash_outflow > 0 then
      perform private.assert_available_funds(
        v_payment_account.id,
        v_net_cash_outflow
      );
    end if;
  end if;

  select *
  into v_actor
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  if not found then
    raise exception using
      errcode = '42501',
      message = 'active authenticated salary actor not found';
  end if;

  if v_existing.id is not null then
    v_reversal_ids := private.reverse_account_movements(
      v_request.id,
      p_local_id,
      array['SUELDO'::public.account_movement_source],
      array[v_existing.id::text, v_existing.legacy_id],
      case when v_previous_cash_amount > 0 then 2 else 1 end,
      'Correccion de liquidacion'
    );

    update public.salary_settlements ss
    set
      status = 'ANULADA',
      annulled_by = v_actor.id,
      annulled_by_legacy_id = v_actor.legacy_id,
      annulled_by_name_snapshot = v_actor.display_name,
      annulled_at = v_created_at,
      annulled_in_correction_closure_id = v_correction_closure_id
    where ss.id = v_existing.id
      and ss.status <> 'ANULADA'
    returning * into v_annulled_existing;

    if not found then
      raise exception using
        errcode = '40001',
        message = 'salary settlement changed before correction';
    end if;
  end if;

  v_staff_name := pg_catalog.btrim(
    v_staff.first_name || ' ' || v_staff.last_name
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
    currency,
    base_salary,
    advances,
    extra_amount,
    extra_concept,
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
    approved_by,
    approved_by_legacy_id,
    approved_by_name_snapshot,
    approved_at,
    correction_closure_id,
    replaces_settlement_id,
    created_at,
    updated_at
  )
  values (
    v_settlement_id,
    'salary-settlement-' || v_settlement_id::text,
    v_period_month,
    case when v_origin = 'CAJA' then v_balance.id end,
    v_staff.id,
    v_staff_name,
    p_local_id,
    v_payment_account.id,
    'UYU',
    0,
    case when v_concept = 'ADELANTO' then v_amount else 0 end,
    case
      when v_concept in ('EXTRA', 'HORAS_EXTRAS') then v_amount
      else 0
    end,
    case
      when v_concept = 'HORAS_EXTRAS' then 'Horas extras'
      when v_concept = 'EXTRA' then 'Premio / Gratificacion'
      else ''
    end,
    case when v_concept = 'AGUINALDO' then v_amount else 0 end,
    case when v_concept = 'SALARIO_VACACIONAL' then v_amount else 0 end,
    case when v_concept = 'DESCUENTO' then v_amount else 0 end,
    case when v_concept = 'SALARIO' then v_amount else 0 end,
    v_concept,
    v_notes,
    'CONFIRMADA',
    v_origin,
    v_actor.id,
    v_actor.legacy_id,
    v_actor.display_name,
    v_actor.id,
    v_actor.legacy_id,
    v_actor.display_name,
    v_created_at,
    v_correction_closure_id,
    v_existing.id,
    v_created_at,
    v_created_at
  )
  returning * into v_settlement;

  select *
  into v_movement
  from private.append_account_movement(
    v_request.id,
    v_staff_account.id,
    p_local_id,
    v_settlement.balance_id,
    'SUELDO',
    v_settlement.id::text,
    'SALIDA',
    v_concept::text,
    v_amount,
    case
      when v_notes = '' then v_concept::text
      else v_notes
    end,
    null,
    v_created_at
  );
  v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_movement.id);

  if v_cash_amount > 0 then
    select *
    into v_movement
    from private.append_account_movement(
      v_request.id,
      v_payment_account.id,
      p_local_id,
      v_settlement.balance_id,
      'SUELDO',
      v_settlement.id::text,
      'SALIDA',
      v_concept::text,
      v_cash_amount,
      v_staff_name
        || case when v_notes = '' then '' else ' - ' || v_notes end,
      null,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_movement.id);
  end if;

  update public.staff s
  set salary_advance_balance = (
    select coalesce(pg_catalog.sum(ss.advances), 0)
    from public.salary_settlements ss
    where ss.staff_id = v_staff.id
      and ss.status <> 'ANULADA'
  )
  where s.id = v_staff.id;

  if v_origin = 'CAJA' then
    perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  end if;

  perform private.append_command_audit(
    v_request.id,
    case
      when v_existing.id is not null then 'Corregir liquidacion salario'
      when v_origin = 'CAJA' then 'Cargar pago salario cajero'
      else 'Crear liquidacion salario'
    end,
    'LiquidacionSalario',
    v_settlement.id::text,
    p_local_id,
    case
      when v_existing.id is null then '{}'::jsonb
      else pg_catalog.to_jsonb(v_existing)
    end,
    pg_catalog.jsonb_build_object(
      'settlement',
      pg_catalog.to_jsonb(v_settlement),
      'effectiveBaseSalary',
      v_salary_base,
      'effectiveSalaryType',
      v_salary_type,
      'reversalLedger',
      private.account_movements_json(v_reversal_ids)
    ),
    case
      when v_existing.id is null then v_notes
      else 'Reemplaza liquidacion ' || v_existing.id::text
    end
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    pg_catalog.to_jsonb(v_settlement),
    'ledger',
    private.account_movements_json(v_reversal_ids || v_ledger_ids),
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_annul_salary_settlement(
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
  v_actor public.profiles%rowtype;
  v_previous public.salary_settlements%rowtype;
  v_settlement public.salary_settlements%rowtype;
  v_staff public.staff%rowtype;
  v_balance public.cash_balances%rowtype;
  v_payment_account public.current_accounts%rowtype;
  v_staff_account public.current_accounts%rowtype;
  v_period_month date;
  v_correction_closure_id uuid;
  v_cash_amount numeric;
  v_settlement_reference text;
  v_balance_reference text;
  v_correction_reference text;
  v_reason text;
  v_reversal_ids uuid[];
  v_lock_ids uuid[];
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'annul_salary_settlement',
    p_idempotency_key,
    private.command_request_hash(
      'annul_salary_settlement',
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
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'payload must be a JSON object';
  end if;

  v_settlement_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'settlementId', p_payload ->> 'settlement_id', '')
    ),
    ''
  );
  if v_settlement_reference is null then
    raise exception using
      errcode = '22023',
      message = 'settlementId is required';
  end if;

  select ss.period_month
  into v_period_month
  from public.salary_settlements ss
  where ss.local_id = p_local_id
    and (
      ss.id::text = v_settlement_reference
      or ss.legacy_id = v_settlement_reference
    );

  if not found then
    raise exception using
      errcode = '23503',
      message = 'salary settlement not found in command local';
  end if;

  perform private.lock_salary_periods(array[v_period_month]);

  select *
  into v_previous
  from public.salary_settlements ss
  where ss.local_id = p_local_id
    and (
      ss.id::text = v_settlement_reference
      or ss.legacy_id = v_settlement_reference
    )
  for update;

  if v_previous.status = 'ANULADA' then
    raise exception using
      errcode = '55000',
      message = 'salary settlement is already annulled';
  end if;

  if v_previous.origin = 'CAJA' and p_actor_function <> 'CAJERO' then
    raise exception using
      errcode = '42501',
      message = 'Caja salary annulments require the cashier function';
  elsif v_previous.origin = 'LIQUIDACION'
        and p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'Principal salary annulments require a control function';
  end if;

  v_balance_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')
    ),
    ''
  );
  v_correction_reference := nullif(
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'correctionClosureId',
        p_payload ->> 'correction_closure_id',
        ''
      )
    ),
    ''
  );
  v_reason := pg_catalog.btrim(
    coalesce(p_payload ->> 'reason', p_payload ->> 'note', '')
  );
  if v_reason = '' then
    v_reason := case
      when v_previous.origin = 'CAJA'
        then 'Anulacion operativa antes del cierre'
      else 'Anulacion de liquidacion'
    end;
  end if;

  if v_correction_reference is not null then
    select sc.id
    into v_correction_closure_id
    from public.salary_closures sc
    where sc.id::text = v_correction_reference
       or sc.legacy_id = v_correction_reference;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'salary correction closure not found';
    end if;
  end if;

  perform private.assert_salary_period_mutable(
    v_previous.period_month,
    v_correction_closure_id
  );

  select *
  into v_staff
  from public.staff s
  where s.id = v_previous.staff_id
    and s.local_id = p_local_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'salary settlement staff member not found';
  end if;

  v_staff_account := private.require_staff_account(v_staff.id, p_local_id);
  v_cash_amount := private.salary_settlement_cash_amount(v_previous);

  if v_previous.origin = 'CAJA' then
    select *
    into v_balance
    from public.cash_balances cb
    where cb.id = v_previous.balance_id
      and cb.local_id = p_local_id
    for update;

    if not found or v_balance.status <> 'EN_PROCESO' then
      raise exception using
        errcode = '55000',
        message = 'Caja salary payments can only be annulled while their balance is open';
    end if;
    if v_balance_reference is not null
       and v_balance_reference not in (v_balance.id::text, v_balance.legacy_id) then
      raise exception using
        errcode = '22023',
        message = 'balanceId does not match the salary settlement balance';
    end if;
  elsif v_balance_reference is not null then
    raise exception using
      errcode = '22023',
      message = 'Principal salary settlements must not include balanceId';
  end if;

  if v_cash_amount > 0 then
    select *
    into v_payment_account
    from public.current_accounts ca
    where ca.id = v_previous.payment_account_id
      and ca.status = 'ACTIVA'
      and ca.currency = 'UYU';

    if not found then
      raise exception using
        errcode = '23503',
        message = 'salary payment account is not active';
    end if;
  end if;

  select pg_catalog.array_agg(
    distinct requested.account_id
    order by requested.account_id
  )
  into v_lock_ids
  from pg_catalog.unnest(
    array[
      v_staff_account.id,
      case when v_cash_amount > 0 then v_payment_account.id end
    ]
  ) requested(account_id)
  where requested.account_id is not null;

  perform private.lock_current_accounts(v_lock_ids);
  if v_previous.origin = 'CAJA' then
    perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  end if;

  v_reversal_ids := private.reverse_account_movements(
    v_request.id,
    p_local_id,
    array['SUELDO'::public.account_movement_source],
    array[v_previous.id::text, v_previous.legacy_id],
    case when v_cash_amount > 0 then 2 else 1 end,
    v_reason
  );

  select *
  into v_actor
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  update public.salary_settlements ss
  set
    status = 'ANULADA',
    annulled_by = v_actor.id,
    annulled_by_legacy_id = v_actor.legacy_id,
    annulled_by_name_snapshot = v_actor.display_name,
    annulled_at = v_created_at,
    annulled_in_correction_closure_id = v_correction_closure_id
  where ss.id = v_previous.id
    and ss.status <> 'ANULADA'
  returning * into v_settlement;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'salary settlement changed before annulment';
  end if;

  update public.staff s
  set salary_advance_balance = (
    select coalesce(pg_catalog.sum(ss.advances), 0)
    from public.salary_settlements ss
    where ss.staff_id = v_staff.id
      and ss.status <> 'ANULADA'
  )
  where s.id = v_staff.id;

  if v_previous.origin = 'CAJA' then
    perform private.assert_open_cash_reconciled(v_balance.id, p_local_id);
  end if;

  perform private.append_command_audit(
    v_request.id,
    case
      when v_previous.origin = 'CAJA'
        then 'Anular pago salario antes de cierre'
      else 'Eliminar liquidacion salario'
    end,
    'LiquidacionSalario',
    v_settlement.id::text,
    p_local_id,
    pg_catalog.to_jsonb(v_previous),
    pg_catalog.jsonb_build_object(
      'settlement',
      pg_catalog.to_jsonb(v_settlement),
      'reversalLedger',
      private.account_movements_json(v_reversal_ids)
    ),
    v_reason
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    pg_catalog.to_jsonb(v_settlement),
    'ledger',
    private.account_movements_json(v_reversal_ids),
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function private.salary_period_totals(p_period_month date)
returns table (
  employee_count integer,
  total_base numeric,
  total_extras numeric,
  total_bonuses numeric,
  total_deductions numeric,
  total_salaries numeric,
  total_salary_paid numeric,
  total_advances numeric,
  total_base_covered numeric,
  total_liquidated numeric,
  total_pending numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pg_catalog.count(*)::integer,
    coalesce(pg_catalog.sum(rows.base_salary), 0)::numeric,
    coalesce(pg_catalog.sum(rows.extra_amount), 0)::numeric,
    coalesce(pg_catalog.sum(rows.bonuses), 0)::numeric,
    coalesce(pg_catalog.sum(rows.deductions), 0)::numeric,
    coalesce(pg_catalog.sum(rows.total_amount), 0)::numeric,
    coalesce(pg_catalog.sum(rows.salary_paid), 0)::numeric,
    coalesce(pg_catalog.sum(rows.advances), 0)::numeric,
    coalesce(pg_catalog.sum(rows.base_covered_amount), 0)::numeric,
    coalesce(pg_catalog.sum(rows.liquidated_amount), 0)::numeric,
    coalesce(pg_catalog.sum(rows.pending_amount), 0)::numeric
  from private.salary_period_employee_rows(p_period_month) rows;
$$;

create function private.insert_salary_closure_snapshot(
  p_closure_id uuid,
  p_period_month date
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.salary_closure_employee_snapshots snapshot
    where snapshot.closure_id = p_closure_id
  ) then
    raise exception using
      errcode = '55000',
      message = 'salary closure already has immutable employee snapshots';
  end if;

  insert into public.salary_closure_locals (closure_id, local_id)
  select distinct p_closure_id, rows.local_id
  from private.salary_period_employee_rows(p_period_month) rows
  on conflict (closure_id, local_id) do nothing;

  insert into public.salary_closure_employee_snapshots (
    id,
    closure_id,
    staff_id,
    staff_name_snapshot,
    position_snapshot,
    local_id,
    salary_type,
    base_salary,
    salary_paid,
    advances,
    extra_amount,
    bonuses,
    deductions,
    total_amount,
    base_covered_amount,
    liquidated_amount,
    pending_amount,
    settlement_count
  )
  select
    extensions.gen_random_uuid(),
    p_closure_id,
    rows.staff_id,
    rows.staff_name_snapshot,
    rows.position_snapshot,
    rows.local_id,
    rows.salary_type,
    rows.base_salary,
    rows.salary_paid,
    rows.advances,
    rows.extra_amount,
    rows.bonuses,
    rows.deductions,
    rows.total_amount,
    rows.base_covered_amount,
    rows.liquidated_amount,
    rows.pending_amount,
    rows.settlement_count
  from private.salary_period_employee_rows(p_period_month) rows;

  insert into public.salary_closure_settlement_snapshots (
    id,
    closure_id,
    employee_snapshot_id,
    source_settlement_id,
    source_settlement_legacy_id,
    concept,
    amount,
    notes,
    origin,
    created_by_name_snapshot,
    approved_by_name_snapshot,
    source_created_at
  )
  select
    extensions.gen_random_uuid(),
    p_closure_id,
    employee.id,
    settlement.id,
    settlement.legacy_id,
    private.normalize_salary_concept(settlement.concept::text),
    private.salary_settlement_display_amount(settlement),
    settlement.notes,
    settlement.origin,
    settlement.created_by_name_snapshot,
    coalesce(
      settlement.approved_by_name_snapshot,
      settlement.created_by_name_snapshot
    ),
    settlement.created_at
  from public.salary_settlements settlement
  join public.salary_closure_employee_snapshots employee
    on employee.closure_id = p_closure_id
    and employee.staff_id = settlement.staff_id
    and employee.local_id = settlement.local_id
  where settlement.period_month = p_period_month
    and settlement.status <> 'ANULADA';
end;
$$;

create function private.append_salary_closure_audit(
  p_command_request_id uuid,
  p_action text,
  p_closure public.salary_closures,
  p_previous_value jsonb,
  p_new_value jsonb,
  p_reason text,
  p_primary_local_id uuid,
  p_local_ids uuid[]
)
returns public.audit_events
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_event public.audit_events%rowtype;
begin
  select *
  into v_event
  from private.append_command_audit(
    p_command_request_id,
    p_action,
    'LiquidacionSalarioCierre',
    p_closure.id::text,
    p_primary_local_id,
    p_previous_value,
    p_new_value,
    p_reason
  );

  insert into public.audit_event_locals (audit_event_id, local_id)
  select v_event.id, requested.local_id
  from pg_catalog.unnest(p_local_ids) requested(local_id)
  where requested.local_id is not null
  on conflict (audit_event_id, local_id) do nothing;

  return v_event;
end;
$$;

create function public.poseidon_close_salary_period(
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
  v_actor public.profiles%rowtype;
  v_closure public.salary_closures%rowtype;
  v_period_month date;
  v_period_end date;
  v_note text;
  v_closure_id uuid := extensions.gen_random_uuid();
  v_visible_id text;
  v_local_ids uuid[];
  v_totals record;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'close_salary_period',
    p_idempotency_key,
    private.command_request_hash(
      'close_salary_period',
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
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'salary period closing requires a control function';
  end if;
  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'payload must be a JSON object';
  end if;

  v_period_month := private.salary_period_month(
    coalesce(p_payload ->> 'period', p_payload ->> 'period_month')
  );
  v_period_end := (
    v_period_month + pg_catalog.make_interval(months => 1) - interval '1 day'
  )::date;
  v_note := pg_catalog.btrim(coalesce(p_payload ->> 'note', ''));
  if v_note = '' then
    v_note := 'Cierre mensual definitivo de liquidacion de salarios';
  end if;

  perform private.lock_salary_periods(array[v_period_month]);

  if exists (
    select 1
    from public.salary_closures sc
    where sc.period_month = v_period_month
      and sc.status = 'CERRADO'
  ) then
    raise exception using
      errcode = '55000',
      message = 'salary period already has a definitive closure';
  end if;
  if exists (
    select 1
    from public.salary_closures sc
    where sc.period_month = v_period_month
      and sc.status = 'CORRECCION_ABIERTA'
  ) then
    raise exception using
      errcode = '55000',
      message = 'salary period has an open correction';
  end if;

  perform s.id
  from public.staff s
  where s.id in (
    select rows.staff_id
    from private.salary_period_employee_rows(v_period_month) rows
  )
  order by s.id
  for share;

  perform ss.id
  from public.salary_settlements ss
  where ss.period_month = v_period_month
  order by ss.id
  for share;

  perform cb.id
  from public.cash_balances cb
  where exists (
    select 1
    from public.salary_settlements ss
    where ss.period_month = v_period_month
      and ss.status <> 'ANULADA'
      and ss.balance_id = cb.id
  )
  order by cb.id
  for share;

  if exists (
    select 1
    from public.salary_settlements ss
    join public.cash_balances cb
      on cb.id = ss.balance_id
      and cb.local_id = ss.local_id
    where ss.period_month = v_period_month
      and ss.status <> 'ANULADA'
      and cb.status = 'EN_PROCESO'
  ) then
    raise exception using
      errcode = '55000',
      message = 'salary period has payments linked to an open cash balance';
  end if;

  select *
  into v_totals
  from private.salary_period_totals(v_period_month);

  if v_totals.employee_count = 0 then
    raise exception using
      errcode = '55000',
      message = 'salary period has no employees or settlements to close';
  end if;
  if v_totals.total_pending < 0
     or exists (
       select 1
       from private.salary_period_employee_rows(v_period_month) rows
       where rows.pending_amount < 0
     ) then
    raise exception using
      errcode = '23514',
      message = 'salary period contains a negative pending amount';
  end if;

  select pg_catalog.array_agg(
    distinct rows.local_id
    order by rows.local_id
  )
  into v_local_ids
  from private.salary_period_employee_rows(v_period_month) rows;

  perform private.assert_salary_command_locals(v_local_ids);
  if not p_local_id = any(v_local_ids) then
    raise exception using
      errcode = '42501',
      message = 'command local is not part of the salary snapshot';
  end if;

  select *
  into v_actor
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  v_visible_id := private.next_salary_closure_visible_id();

  insert into public.salary_closures (
    id,
    legacy_id,
    visible_id,
    period_month,
    start_date,
    end_date,
    period_label,
    kind,
    revision,
    parent_closure_id,
    snapshot_version,
    employee_count,
    total_base,
    total_extras,
    total_bonuses,
    total_deductions,
    total_salaries,
    total_salary_paid,
    total_advances,
    total_base_covered,
    total_liquidated,
    total_pending,
    status,
    note,
    created_by,
    created_by_legacy_id,
    created_by_name_snapshot,
    created_at,
    closed_by,
    closed_by_legacy_id,
    closed_by_name_snapshot,
    closed_at,
    updated_at
  )
  values (
    v_closure_id,
    'salary-closure-' || v_closure_id::text,
    v_visible_id,
    v_period_month,
    v_period_month,
    v_period_end,
    private.salary_period_label(v_period_month),
    'ORDINARIO',
    0,
    null,
    1,
    v_totals.employee_count,
    v_totals.total_base,
    v_totals.total_extras,
    v_totals.total_bonuses,
    v_totals.total_deductions,
    v_totals.total_salaries,
    v_totals.total_salary_paid,
    v_totals.total_advances,
    v_totals.total_base_covered,
    v_totals.total_liquidated,
    v_totals.total_pending,
    'CERRADO',
    v_note,
    v_actor.id,
    v_actor.legacy_id,
    v_actor.display_name,
    v_created_at,
    v_actor.id,
    v_actor.legacy_id,
    v_actor.display_name,
    v_created_at,
    v_created_at
  )
  returning * into v_closure;

  perform private.insert_salary_closure_snapshot(
    v_closure.id,
    v_period_month
  );

  perform private.append_salary_closure_audit(
    v_request.id,
    'Cerrar periodo salarial definitivo',
    v_closure,
    '{}'::jsonb,
    pg_catalog.jsonb_build_object(
      'closure',
      pg_catalog.to_jsonb(v_closure),
      'localIds',
      pg_catalog.to_jsonb(v_local_ids)
    ),
    v_note,
    p_local_id,
    v_local_ids
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    pg_catalog.to_jsonb(v_closure),
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_start_salary_correction(
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
  v_actor public.profiles%rowtype;
  v_parent public.salary_closures%rowtype;
  v_latest public.salary_closures%rowtype;
  v_correction public.salary_closures%rowtype;
  v_parent_reference text;
  v_note text;
  v_period_month date;
  v_local_ids uuid[];
  v_revision integer;
  v_correction_id uuid := extensions.gen_random_uuid();
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'start_salary_correction',
    p_idempotency_key,
    private.command_request_hash(
      'start_salary_correction',
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
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'salary corrections require a control function';
  end if;
  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'payload must be a JSON object';
  end if;

  v_parent_reference := nullif(
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'parentClosureId',
        p_payload ->> 'parent_closure_id',
        ''
      )
    ),
    ''
  );
  if v_parent_reference is null then
    raise exception using
      errcode = '22023',
      message = 'parentClosureId is required';
  end if;

  v_note := pg_catalog.btrim(coalesce(p_payload ->> 'note', ''));
  if v_note = '' then
    raise exception using
      errcode = '22023',
      message = 'salary correction reason is required';
  end if;

  select sc.period_month
  into v_period_month
  from public.salary_closures sc
  where sc.id::text = v_parent_reference
     or sc.legacy_id = v_parent_reference;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'salary closure to correct was not found';
  end if;

  perform private.lock_salary_periods(array[v_period_month]);

  select *
  into v_parent
  from public.salary_closures sc
  where (
      sc.id::text = v_parent_reference
      or sc.legacy_id = v_parent_reference
    )
    and sc.status = 'CERRADO'
  for share;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'salary correction parent must be a closed snapshot';
  end if;

  select *
  into v_latest
  from public.salary_closures sc
  where sc.period_month = v_parent.period_month
    and sc.status = 'CERRADO'
  order by sc.revision desc, sc.closed_at desc, sc.id desc
  limit 1
  for share;

  if v_latest.id <> v_parent.id then
    raise exception using
      errcode = '55000',
      message = pg_catalog.format(
        'salary correction must start from latest closure %s',
        v_latest.visible_id
      );
  end if;

  if exists (
    select 1
    from public.salary_closures sc
    where sc.period_month = v_parent.period_month
      and sc.status = 'CORRECCION_ABIERTA'
  ) then
    raise exception using
      errcode = '55000',
      message = 'salary period already has an open correction';
  end if;

  select pg_catalog.array_agg(
    scl.local_id
    order by scl.local_id
  )
  into v_local_ids
  from public.salary_closure_locals scl
  where scl.closure_id = v_parent.id;

  perform private.assert_salary_command_locals(v_local_ids);
  if not p_local_id = any(v_local_ids) then
    raise exception using
      errcode = '42501',
      message = 'command local is not part of the salary snapshot';
  end if;

  select coalesce(pg_catalog.max(sc.revision), 0) + 1
  into v_revision
  from public.salary_closures sc
  where sc.period_month = v_parent.period_month;

  select *
  into v_actor
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  insert into public.salary_closures (
    id,
    legacy_id,
    visible_id,
    period_month,
    start_date,
    end_date,
    period_label,
    kind,
    revision,
    parent_closure_id,
    snapshot_version,
    employee_count,
    total_base,
    total_extras,
    total_bonuses,
    total_deductions,
    total_salaries,
    total_salary_paid,
    total_advances,
    total_base_covered,
    total_liquidated,
    total_pending,
    status,
    note,
    created_by,
    created_by_legacy_id,
    created_by_name_snapshot,
    created_at,
    closed_by,
    closed_by_legacy_id,
    closed_by_name_snapshot,
    closed_at,
    updated_at
  )
  values (
    v_correction_id,
    'salary-closure-correction-' || v_correction_id::text,
    private.next_salary_closure_visible_id(),
    v_parent.period_month,
    v_parent.start_date,
    v_parent.end_date,
    v_parent.period_label,
    'CORRECTIVO',
    v_revision,
    v_parent.id,
    v_parent.snapshot_version,
    v_parent.employee_count,
    v_parent.total_base,
    v_parent.total_extras,
    v_parent.total_bonuses,
    v_parent.total_deductions,
    v_parent.total_salaries,
    v_parent.total_salary_paid,
    v_parent.total_advances,
    v_parent.total_base_covered,
    v_parent.total_liquidated,
    v_parent.total_pending,
    'CORRECCION_ABIERTA',
    v_note,
    v_actor.id,
    v_actor.legacy_id,
    v_actor.display_name,
    v_created_at,
    null,
    null,
    null,
    null,
    v_created_at
  )
  returning * into v_correction;

  insert into public.salary_closure_locals (closure_id, local_id)
  select v_correction.id, requested.local_id
  from pg_catalog.unnest(v_local_ids) requested(local_id);

  perform private.append_salary_closure_audit(
    v_request.id,
    'Iniciar ajuste correctivo salarial',
    v_correction,
    pg_catalog.to_jsonb(v_parent),
    pg_catalog.to_jsonb(v_correction),
    v_note,
    p_local_id,
    v_local_ids
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    pg_catalog.to_jsonb(v_correction),
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_close_salary_correction(
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
  v_actor public.profiles%rowtype;
  v_previous public.salary_closures%rowtype;
  v_correction public.salary_closures%rowtype;
  v_correction_reference text;
  v_period_month date;
  v_local_ids uuid[];
  v_totals record;
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'close_salary_correction',
    p_idempotency_key,
    private.command_request_hash(
      'close_salary_correction',
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
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'salary corrections require a control function';
  end if;
  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'payload must be a JSON object';
  end if;

  v_correction_reference := nullif(
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'correctionClosureId',
        p_payload ->> 'correction_closure_id',
        ''
      )
    ),
    ''
  );
  if v_correction_reference is null then
    raise exception using
      errcode = '22023',
      message = 'correctionClosureId is required';
  end if;

  select sc.period_month
  into v_period_month
  from public.salary_closures sc
  where sc.id::text = v_correction_reference
     or sc.legacy_id = v_correction_reference;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'open salary correction was not found';
  end if;

  perform private.lock_salary_periods(array[v_period_month]);

  select *
  into v_previous
  from public.salary_closures sc
  where (
      sc.id::text = v_correction_reference
      or sc.legacy_id = v_correction_reference
    )
    and sc.kind = 'CORRECTIVO'
    and sc.status = 'CORRECCION_ABIERTA'
  for update;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'open salary correction was not found';
  end if;

  if not exists (
    select 1
    from public.salary_settlements ss
    where ss.correction_closure_id = v_previous.id
       or ss.annulled_in_correction_closure_id = v_previous.id
  ) then
    raise exception using
      errcode = '55000',
      message = 'salary correction requires at least one linked change';
  end if;

  perform s.id
  from public.staff s
  where s.id in (
    select rows.staff_id
    from private.salary_period_employee_rows(v_period_month) rows
  )
  order by s.id
  for share;

  perform ss.id
  from public.salary_settlements ss
  where ss.period_month = v_period_month
  order by ss.id
  for share;

  perform cb.id
  from public.cash_balances cb
  where exists (
    select 1
    from public.salary_settlements ss
    where ss.period_month = v_period_month
      and ss.status <> 'ANULADA'
      and ss.balance_id = cb.id
  )
  order by cb.id
  for share;

  if exists (
    select 1
    from public.salary_settlements ss
    join public.cash_balances cb
      on cb.id = ss.balance_id
      and cb.local_id = ss.local_id
    where ss.period_month = v_period_month
      and ss.status <> 'ANULADA'
      and cb.status = 'EN_PROCESO'
  ) then
    raise exception using
      errcode = '55000',
      message = 'salary correction has payments linked to an open cash balance';
  end if;

  select *
  into v_totals
  from private.salary_period_totals(v_period_month);

  if v_totals.employee_count = 0 then
    raise exception using
      errcode = '55000',
      message = 'salary correction snapshot has no employees';
  end if;
  if v_totals.total_pending < 0
     or exists (
       select 1
       from private.salary_period_employee_rows(v_period_month) rows
       where rows.pending_amount < 0
     ) then
    raise exception using
      errcode = '23514',
      message = 'salary correction contains a negative pending amount';
  end if;

  select pg_catalog.array_agg(
    distinct rows.local_id
    order by rows.local_id
  )
  into v_local_ids
  from private.salary_period_employee_rows(v_period_month) rows;

  perform private.assert_salary_command_locals(v_local_ids);
  if not p_local_id = any(v_local_ids) then
    raise exception using
      errcode = '42501',
      message = 'command local is not part of the salary snapshot';
  end if;

  select *
  into v_actor
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  perform private.insert_salary_closure_snapshot(
    v_previous.id,
    v_period_month
  );

  update public.salary_closures sc
  set
    snapshot_version = 1,
    employee_count = v_totals.employee_count,
    total_base = v_totals.total_base,
    total_extras = v_totals.total_extras,
    total_bonuses = v_totals.total_bonuses,
    total_deductions = v_totals.total_deductions,
    total_salaries = v_totals.total_salaries,
    total_salary_paid = v_totals.total_salary_paid,
    total_advances = v_totals.total_advances,
    total_base_covered = v_totals.total_base_covered,
    total_liquidated = v_totals.total_liquidated,
    total_pending = v_totals.total_pending,
    status = 'CERRADO',
    closed_by = v_actor.id,
    closed_by_legacy_id = v_actor.legacy_id,
    closed_by_name_snapshot = v_actor.display_name,
    closed_at = v_created_at
  where sc.id = v_previous.id
    and sc.status = 'CORRECCION_ABIERTA'
  returning * into v_correction;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'salary correction changed before closing';
  end if;

  perform private.append_salary_closure_audit(
    v_request.id,
    'Cerrar ajuste correctivo salarial',
    v_correction,
    pg_catalog.to_jsonb(v_previous),
    pg_catalog.jsonb_build_object(
      'closure',
      pg_catalog.to_jsonb(v_correction),
      'localIds',
      pg_catalog.to_jsonb(v_local_ids)
    ),
    v_correction.note,
    p_local_id,
    v_local_ids
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    pg_catalog.to_jsonb(v_correction),
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_cancel_salary_correction(
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
  v_actor public.profiles%rowtype;
  v_previous public.salary_closures%rowtype;
  v_correction public.salary_closures%rowtype;
  v_correction_reference text;
  v_period_month date;
  v_local_ids uuid[];
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'cancel_salary_correction',
    p_idempotency_key,
    private.command_request_hash(
      'cancel_salary_correction',
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
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'salary corrections require a control function';
  end if;
  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'payload must be a JSON object';
  end if;

  v_correction_reference := nullif(
    pg_catalog.btrim(
      coalesce(
        p_payload ->> 'correctionClosureId',
        p_payload ->> 'correction_closure_id',
        ''
      )
    ),
    ''
  );
  if v_correction_reference is null then
    raise exception using
      errcode = '22023',
      message = 'correctionClosureId is required';
  end if;

  select sc.period_month
  into v_period_month
  from public.salary_closures sc
  where sc.id::text = v_correction_reference
     or sc.legacy_id = v_correction_reference;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'open salary correction was not found';
  end if;

  perform private.lock_salary_periods(array[v_period_month]);

  select *
  into v_previous
  from public.salary_closures sc
  where (
      sc.id::text = v_correction_reference
      or sc.legacy_id = v_correction_reference
    )
    and sc.kind = 'CORRECTIVO'
    and sc.status = 'CORRECCION_ABIERTA'
  for update;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'open salary correction was not found';
  end if;

  if exists (
    select 1
    from public.salary_settlements ss
    where ss.correction_closure_id = v_previous.id
       or ss.annulled_in_correction_closure_id = v_previous.id
  ) then
    raise exception using
      errcode = '55000',
      message = 'salary correction already has linked changes';
  end if;

  select pg_catalog.array_agg(
    scl.local_id
    order by scl.local_id
  )
  into v_local_ids
  from public.salary_closure_locals scl
  where scl.closure_id = v_previous.id;

  perform private.assert_salary_command_locals(v_local_ids);
  if not p_local_id = any(v_local_ids) then
    raise exception using
      errcode = '42501',
      message = 'command local is not part of the salary snapshot';
  end if;

  select *
  into v_actor
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  update public.salary_closures sc
  set
    status = 'ANULADO',
    closed_by = v_actor.id,
    closed_by_legacy_id = v_actor.legacy_id,
    closed_by_name_snapshot = v_actor.display_name,
    closed_at = v_created_at
  where sc.id = v_previous.id
    and sc.status = 'CORRECCION_ABIERTA'
  returning * into v_correction;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'salary correction changed before cancellation';
  end if;

  perform private.append_salary_closure_audit(
    v_request.id,
    'Cancelar ajuste correctivo salarial',
    v_correction,
    pg_catalog.to_jsonb(v_previous),
    pg_catalog.to_jsonb(v_correction),
    v_correction.note,
    p_local_id,
    v_local_ids
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    pg_catalog.to_jsonb(v_correction),
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_manage_difference(
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
  v_actor public.profiles%rowtype;
  v_local public.locals%rowtype;
  v_previous public.cash_balances%rowtype;
  v_balance public.cash_balances%rowtype;
  v_cash_account public.current_accounts%rowtype;
  v_bank_account public.current_accounts%rowtype;
  v_movement public.account_movements%rowtype;
  v_balance_reference text;
  v_target_status public.difference_status;
  v_status_text text;
  v_review_note text;
  v_previous_cash_difference numeric;
  v_previous_bank_difference numeric;
  v_previous_declared_cash numeric;
  v_previous_declared_bank numeric;
  v_expected_cash numeric;
  v_expected_bank numeric;
  v_next_declared_cash numeric;
  v_next_declared_bank numeric;
  v_next_cash_difference numeric;
  v_next_bank_difference numeric;
  v_current_cash_ledger numeric;
  v_current_bank_ledger numeric;
  v_cash_delta numeric;
  v_bank_delta numeric;
  v_cash_before numeric;
  v_bank_before numeric;
  v_cash_after numeric;
  v_bank_after numeric;
  v_previous_adjustment_id uuid;
  v_ledger_ids uuid[] := array[]::uuid[];
  v_response jsonb;
  v_created_at timestamptz := statement_timestamp();
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'manage_difference',
    p_idempotency_key,
    private.command_request_hash(
      'manage_difference',
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
    raise exception using
      errcode = '55000',
      message = 'the previous command attempt failed';
  end if;

  if p_actor_function not in ('ENCARGADO', 'ADMINISTRADOR') then
    raise exception using
      errcode = '42501',
      message = 'cash differences require a control function';
  end if;
  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'payload must be a JSON object';
  end if;

  v_balance_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'balanceId', p_payload ->> 'balance_id', '')
    ),
    ''
  );
  if v_balance_reference is null then
    raise exception using
      errcode = '22023',
      message = 'balanceId is required';
  end if;

  v_status_text := pg_catalog.upper(
    pg_catalog.btrim(coalesce(p_payload ->> 'status', ''))
  );
  if v_status_text not in ('VERIFICADA', 'CORREGIDA', 'ANULADA') then
    raise exception using
      errcode = '22023',
      message = 'difference status must be VERIFICADA, CORREGIDA or ANULADA';
  end if;
  v_target_status := v_status_text::public.difference_status;

  v_review_note := pg_catalog.btrim(
    coalesce(
      p_payload ->> 'reviewNote',
      p_payload ->> 'review_note',
      ''
    )
  );
  if v_review_note = '' then
    raise exception using
      errcode = '22023',
      message = 'difference review note is required';
  end if;

  select *
  into v_local
  from public.locals l
  where l.id = p_local_id
    and l.status = 'ACTIVO'
  for update;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'the command local is not active';
  end if;

  select *
  into v_previous
  from public.cash_balances cb
  where cb.local_id = p_local_id
    and (
      cb.id::text = v_balance_reference
      or cb.legacy_id = v_balance_reference
    )
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'cash balance was not found in command local';
  end if;
  if v_previous.status <> 'CERRADO' then
    raise exception using
      errcode = '55000',
      message = 'only closed cash balances have manageable differences';
  end if;
  if v_previous.difference_status is null then
    raise exception using
      errcode = '55000',
      message = 'cash balance does not have a difference to manage';
  end if;

  if exists (
    select 1
    from public.cash_balances open_balance
    where open_balance.local_id = p_local_id
      and open_balance.status = 'EN_PROCESO'
  ) then
    raise exception using
      errcode = '55000',
      message = 'cash differences cannot be managed while the local has an open balance';
  end if;

  if not (
    (
      v_previous.difference_status = 'PENDIENTE'
      and v_target_status in ('VERIFICADA', 'CORREGIDA', 'ANULADA')
    )
    or (
      v_previous.difference_status = 'VERIFICADA'
      and v_target_status in ('CORREGIDA', 'ANULADA')
    )
    or (
      v_previous.difference_status = 'CORREGIDA'
      and v_target_status in ('CORREGIDA', 'ANULADA')
    )
  ) then
    raise exception using
      errcode = '55000',
      message = pg_catalog.format(
        'difference cannot change from %s to %s',
        v_previous.difference_status::text,
        v_target_status::text
      );
  end if;

  if v_previous.declared_cash is null
     or v_previous.declared_bank is null
     or v_previous.cash_difference is null
     or v_previous.bank_difference is null then
    raise exception using
      errcode = '23514',
      message = 'cash difference contains incomplete amounts';
  end if;

  v_previous_declared_cash := v_previous.declared_cash;
  v_previous_declared_bank := v_previous.declared_bank;
  v_previous_cash_difference := v_previous.cash_difference;
  v_previous_bank_difference := v_previous.bank_difference;
  v_expected_cash :=
    v_previous_declared_cash - v_previous_cash_difference;
  v_expected_bank :=
    v_previous_declared_bank - v_previous_bank_difference;

  if v_target_status = 'CORREGIDA' then
    v_next_declared_cash := private.nonnegative_payload_amount(
      p_payload,
      'correctedCash',
      'corrected_cash'
    );
    v_next_declared_bank := private.nonnegative_payload_amount(
      p_payload,
      'correctedBank',
      'corrected_bank'
    );
    v_next_cash_difference := v_next_declared_cash - v_expected_cash;
    v_next_bank_difference := v_next_declared_bank - v_expected_bank;
  elsif v_target_status = 'ANULADA' then
    v_next_declared_cash := v_expected_cash;
    v_next_declared_bank := v_expected_bank;
    v_next_cash_difference := 0;
    v_next_bank_difference := 0;
  else
    v_next_declared_cash := v_previous_declared_cash;
    v_next_declared_bank := v_previous_declared_bank;
    v_next_cash_difference := v_previous_cash_difference;
    v_next_bank_difference := v_previous_bank_difference;
  end if;

  if v_next_declared_cash < 0 or v_next_declared_bank < 0 then
    raise exception using
      errcode = '23514',
      message = 'corrected difference amounts cannot be negative';
  end if;

  v_cash_account := private.require_current_account(
    'LOCAL_EFECTIVO',
    p_local_id,
    null
  );
  v_bank_account := private.require_current_account(
    'LOCAL_BANCO',
    p_local_id,
    null
  );
  perform private.lock_current_accounts(
    array[v_cash_account.id, v_bank_account.id]
  );

  v_cash_before := private.account_balance(v_cash_account.id);
  v_bank_before := private.account_balance(v_bank_account.id);

  select coalesce(
    pg_catalog.sum(
      case
        when am.direction = 'ENTRADA' then am.amount
        else -am.amount
      end
    ),
    0
  )
  into v_current_cash_ledger
  from public.account_movements am
  where am.account_id = v_cash_account.id
    and am.local_id = p_local_id
    and am.balance_id = v_previous.id
    and am.source_type = 'DIFERENCIA_CAJA'
    and am.status = 'ACTIVO'
    and am.source_id in (
      v_previous.id::text || '-EFECTIVO',
      v_previous.legacy_id || '-EFECTIVO'
    );

  select coalesce(
    pg_catalog.sum(
      case
        when am.direction = 'ENTRADA' then am.amount
        else -am.amount
      end
    ),
    0
  )
  into v_current_bank_ledger
  from public.account_movements am
  where am.account_id = v_bank_account.id
    and am.local_id = p_local_id
    and am.balance_id = v_previous.id
    and am.source_type = 'DIFERENCIA_CAJA'
    and am.status = 'ACTIVO'
    and am.source_id in (
      v_previous.id::text || '-BANCO',
      v_previous.legacy_id || '-BANCO'
    );

  v_cash_delta := v_next_cash_difference - v_current_cash_ledger;
  v_bank_delta := v_next_bank_difference - v_current_bank_ledger;

  if v_cash_delta < 0 then
    perform private.assert_available_funds(
      v_cash_account.id,
      pg_catalog.abs(v_cash_delta)
    );
  end if;
  if v_bank_delta < 0 then
    perform private.assert_available_funds(
      v_bank_account.id,
      pg_catalog.abs(v_bank_delta)
    );
  end if;

  if v_cash_delta <> 0 then
    select am.id
    into v_previous_adjustment_id
    from public.account_movements am
    where am.account_id = v_cash_account.id
      and am.local_id = p_local_id
      and am.balance_id = v_previous.id
      and am.source_type = 'DIFERENCIA_CAJA'
      and am.status = 'ACTIVO'
      and am.source_id in (
        v_previous.id::text || '-EFECTIVO',
        v_previous.legacy_id || '-EFECTIVO'
      )
      and not exists (
        select 1
        from public.account_movements child
        where child.previous_adjustment_id = am.id
      )
    order by am.created_at desc, am.id desc
    limit 1;

    select *
    into v_movement
    from private.append_difference_adjustment(
      v_request.id,
      v_cash_account.id,
      p_local_id,
      v_previous.id,
      v_previous.id::text || '-EFECTIVO',
      case
        when v_cash_delta > 0
          then 'ENTRADA'::public.account_movement_direction
        else 'SALIDA'::public.account_movement_direction
      end,
      'DIFERENCIA_EFECTIVO',
      pg_catalog.abs(v_cash_delta),
      'Ajuste diferencia efectivo caja '
        || v_previous.visible_id
        || ' - '
        || v_previous.operating_date::text,
      v_previous_adjustment_id,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_movement.id);
  end if;

  v_previous_adjustment_id := null;
  if v_bank_delta <> 0 then
    select am.id
    into v_previous_adjustment_id
    from public.account_movements am
    where am.account_id = v_bank_account.id
      and am.local_id = p_local_id
      and am.balance_id = v_previous.id
      and am.source_type = 'DIFERENCIA_CAJA'
      and am.status = 'ACTIVO'
      and am.source_id in (
        v_previous.id::text || '-BANCO',
        v_previous.legacy_id || '-BANCO'
      )
      and not exists (
        select 1
        from public.account_movements child
        where child.previous_adjustment_id = am.id
      )
    order by am.created_at desc, am.id desc
    limit 1;

    select *
    into v_movement
    from private.append_difference_adjustment(
      v_request.id,
      v_bank_account.id,
      p_local_id,
      v_previous.id,
      v_previous.id::text || '-BANCO',
      case
        when v_bank_delta > 0
          then 'ENTRADA'::public.account_movement_direction
        else 'SALIDA'::public.account_movement_direction
      end,
      'DIFERENCIA_BANCO',
      pg_catalog.abs(v_bank_delta),
      'Ajuste diferencia banco caja '
        || v_previous.visible_id
        || ' - '
        || v_previous.operating_date::text,
      v_previous_adjustment_id,
      v_created_at
    );
    v_ledger_ids := pg_catalog.array_append(v_ledger_ids, v_movement.id);
  end if;

  select *
  into v_actor
  from public.profiles p
  where p.id = v_request.actor_id
    and p.status = 'ACTIVO';

  update public.cash_balances cb
  set
    declared_cash = case
      when v_target_status in ('CORREGIDA', 'ANULADA')
        then v_next_declared_cash
      else cb.declared_cash
    end,
    declared_bank = case
      when v_target_status in ('CORREGIDA', 'ANULADA')
        then v_next_declared_bank
      else cb.declared_bank
    end,
    next_cash_base = case
      when v_target_status in ('CORREGIDA', 'ANULADA')
        then v_next_declared_cash
      else cb.next_cash_base
    end,
    next_bank_base = case
      when v_target_status in ('CORREGIDA', 'ANULADA')
        then v_next_declared_bank
      else cb.next_bank_base
    end,
    cash_difference = case
      when v_target_status in ('CORREGIDA', 'ANULADA')
        then v_next_cash_difference
      else cb.cash_difference
    end,
    bank_difference = case
      when v_target_status in ('CORREGIDA', 'ANULADA')
        then v_next_bank_difference
      else cb.bank_difference
    end,
    difference_status = v_target_status,
    difference_reviewed_by = v_actor.id,
    difference_reviewed_by_legacy_id = v_actor.legacy_id,
    difference_reviewed_at = v_created_at,
    difference_review_note = v_review_note
  where cb.id = v_previous.id
    and cb.local_id = p_local_id
    and cb.status = 'CERRADO'
  returning * into v_balance;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'cash difference changed before it could be managed';
  end if;

  v_cash_after := private.account_balance(v_cash_account.id);
  v_bank_after := private.account_balance(v_bank_account.id);

  perform private.append_command_audit(
    v_request.id,
    'Gestionar diferencia de caja',
    'DiferenciaCaja',
    v_balance.id::text,
    p_local_id,
    pg_catalog.to_jsonb(v_previous),
    pg_catalog.jsonb_build_object(
      'balance',
      pg_catalog.to_jsonb(v_balance),
      'accountBalancesBefore',
      pg_catalog.jsonb_build_object(
        'cash',
        v_cash_before,
        'bank',
        v_bank_before
      ),
      'accountBalancesAfter',
      pg_catalog.jsonb_build_object(
        'cash',
        v_cash_after,
        'bank',
        v_bank_after
      ),
      'newAccountMovements',
      private.account_movements_json(v_ledger_ids)
    ),
    v_review_note
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    pg_catalog.to_jsonb(v_balance),
    'ledger',
    private.account_movements_json(v_ledger_ids),
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

revoke execute on function private.salary_period_month(text)
  from public, anon, authenticated;
revoke execute on function private.salary_period_label(date)
  from public, anon, authenticated;
revoke execute on function private.normalize_salary_concept(text)
  from public, anon, authenticated;
revoke execute on function private.salary_settlement_cash_amount(public.salary_settlements)
  from public, anon, authenticated;
revoke execute on function private.salary_settlement_display_amount(public.salary_settlements)
  from public, anon, authenticated;
revoke execute on function private.lock_salary_periods(date[])
  from public, anon, authenticated;
revoke execute on function private.next_salary_closure_visible_id()
  from public, anon, authenticated;
revoke execute on function private.require_staff_account(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function private.salary_base_for_period(public.staff, date)
  from public, anon, authenticated;
revoke execute on function private.assert_salary_period_mutable(date, uuid)
  from public, anon, authenticated;
revoke execute on function private.salary_period_employee_rows(date)
  from public, anon, authenticated;
revoke execute on function private.assert_salary_command_locals(uuid[])
  from public, anon, authenticated;
revoke execute on function private.append_difference_adjustment(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  public.account_movement_direction,
  text,
  numeric,
  text,
  uuid,
  timestamptz
) from public, anon, authenticated;
revoke execute on function private.salary_period_totals(date)
  from public, anon, authenticated;
revoke execute on function private.insert_salary_closure_snapshot(uuid, date)
  from public, anon, authenticated;
revoke execute on function private.append_salary_closure_audit(
  uuid,
  text,
  public.salary_closures,
  jsonb,
  jsonb,
  text,
  uuid,
  uuid[]
) from public, anon, authenticated;

revoke all on function public.poseidon_save_salary_settlement(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_annul_salary_settlement(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_close_salary_period(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_start_salary_correction(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_close_salary_correction(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_cancel_salary_correction(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_manage_difference(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;

grant execute on function public.poseidon_save_salary_settlement(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_annul_salary_settlement(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_close_salary_period(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_start_salary_correction(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_close_salary_correction(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_cancel_salary_correction(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_manage_difference(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;

comment on function public.poseidon_save_salary_settlement(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Atomically creates or replaces a salary settlement with effective-period limits, funds, ledger, audit, scope and idempotency.';
comment on function public.poseidon_annul_salary_settlement(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Annuls one salary settlement through append-only ledger reversals and preserves the original row.';
comment on function public.poseidon_close_salary_period(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Creates the immutable ordinary monthly salary snapshot after locking its period and every included local.';
comment on function public.poseidon_start_salary_correction(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Starts one linked salary correction from the latest immutable closed snapshot.';
comment on function public.poseidon_close_salary_correction(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Closes a linked salary correction as a new immutable employee and settlement snapshot.';
comment on function public.poseidon_cancel_salary_correction(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Cancels an empty salary correction without deleting its closure row or audit history.';
comment on function public.poseidon_manage_difference(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Verifies, corrects or annuls a closed cash difference with chained append-only deltas and no economic-result mutation.';

commit;
