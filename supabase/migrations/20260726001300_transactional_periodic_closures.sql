begin;

create function private.periodic_closure_snapshot(p_closure_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select
    pg_catalog.to_jsonb(pc)
    || pg_catalog.jsonb_build_object(
      'balance_ids',
      coalesce(
        (
          select pg_catalog.jsonb_agg(
            pcb.balance_id
            order by
              coalesce(
                (cb.closed_at at time zone 'UTC')::date,
                cb.operating_date
              ),
              pcb.balance_id
          )
          from public.periodic_closure_balances pcb
          join public.cash_balances cb on cb.id = pcb.balance_id
          where pcb.closure_id = pc.id
        ),
        '[]'::jsonb
      ),
      'principal_expense_ids',
      coalesce(
        (
          select pg_catalog.jsonb_agg(
            pce.expense_id order by e.created_at, pce.expense_id
          )
          from public.periodic_closure_expenses pce
          join public.expenses e on e.id = pce.expense_id
          where pce.closure_id = pc.id
        ),
        '[]'::jsonb
      ),
      'principal_salary_settlement_ids',
      coalesce(
        (
          select pg_catalog.jsonb_agg(
            pcss.settlement_id
            order by ss.period_month, ss.created_at, pcss.settlement_id
          )
          from public.periodic_closure_salary_settlements pcss
          join public.salary_settlements ss on ss.id = pcss.settlement_id
          where pcss.closure_id = pc.id
        ),
        '[]'::jsonb
      ),
      'treasury_transfer_ids',
      coalesce(
        (
          select pg_catalog.jsonb_agg(
            pctt.treasury_transfer_id
            order by tt.created_at, pctt.treasury_transfer_id
          )
          from public.periodic_closure_treasury_transfers pctt
          join public.treasury_transfers tt
            on tt.id = pctt.treasury_transfer_id
          where pctt.closure_id = pc.id
        ),
        '[]'::jsonb
      ),
      'partner_movement_ids',
      coalesce(
        (
          select pg_catalog.jsonb_agg(
            pcpm.partner_movement_id
            order by pm.created_at, pcpm.partner_movement_id
          )
          from public.periodic_closure_partner_movements pcpm
          join public.partner_movements pm
            on pm.id = pcpm.partner_movement_id
          where pcpm.closure_id = pc.id
        ),
        '[]'::jsonb
      )
    )
  from public.periodic_closures pc
  where pc.id = p_closure_id;
$$;

create function private.guard_periodic_closure_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'GENERADO'
     and new.status = 'ANULADO'
     and (
       pg_catalog.to_jsonb(new) - 'status' - 'updated_at'
     ) = (
       pg_catalog.to_jsonb(old) - 'status' - 'updated_at'
     ) then
    return new;
  end if;

  raise exception using
    errcode = '55000',
    message = 'periodic closure snapshots are immutable';
end;
$$;

create trigger periodic_closures_guard_snapshot_update
before update on public.periodic_closures
for each row execute function private.guard_periodic_closure_mutation();

create function public.poseidon_create_periodic_closure(
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
  v_closure public.periodic_closures%rowtype;
  v_actor_legacy_id text;
  v_type_text text;
  v_type public.periodic_closure_type;
  v_start_text text;
  v_end_text text;
  v_start_date date;
  v_end_date date;
  v_note text;
  v_next_sequence bigint;
  v_closure_id uuid := extensions.gen_random_uuid();
  v_created_at timestamptz := statement_timestamp();
  v_balance_ids uuid[] := array[]::uuid[];
  v_principal_expense_ids uuid[] := array[]::uuid[];
  v_principal_salary_ids uuid[] := array[]::uuid[];
  v_treasury_transfer_ids uuid[] := array[]::uuid[];
  v_partner_movement_ids uuid[] := array[]::uuid[];
  v_result_machines numeric := 0;
  v_total_expenses numeric := 0;
  v_total_salaries numeric := 0;
  v_total_gifts numeric := 0;
  v_total_outflows numeric := 0;
  v_commercial_result numeric := 0;
  v_total_transfers numeric := 0;
  v_total_caja_to_principal numeric := 0;
  v_total_principal_to_caja numeric := 0;
  v_total_partner_contributions numeric := 0;
  v_total_partner_withdrawals numeric := 0;
  v_cash_difference numeric := 0;
  v_bank_difference numeric := 0;
  v_pending_differences integer := 0;
  v_snapshot jsonb;
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'create_periodic_closure',
    p_idempotency_key,
    private.command_request_hash(
      'create_periodic_closure',
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
      message = 'periodic closure creation requires a control function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'payload must be a JSON object';
  end if;

  v_type_text := pg_catalog.upper(
    pg_catalog.btrim(coalesce(p_payload ->> 'type', ''))
  );
  if v_type_text not in ('SEMANAL', 'QUINCENAL', 'MENSUAL', 'PERSONALIZADO') then
    raise exception using
      errcode = '22023',
      message = 'invalid periodic closure type';
  end if;
  v_type := v_type_text::public.periodic_closure_type;

  v_start_text := pg_catalog.btrim(
    coalesce(p_payload ->> 'startDate', p_payload ->> 'start_date', '')
  );
  v_end_text := pg_catalog.btrim(
    coalesce(p_payload ->> 'endDate', p_payload ->> 'end_date', '')
  );

  if v_start_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or v_end_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception using
      errcode = '22023',
      message = 'periodic closure dates must use YYYY-MM-DD';
  end if;

  begin
    v_start_date := v_start_text::date;
    v_end_date := v_end_text::date;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception using
        errcode = '22023',
        message = 'periodic closure dates are invalid';
  end;

  if v_start_date::text <> v_start_text
     or v_end_date::text <> v_end_text then
    raise exception using
      errcode = '22023',
      message = 'periodic closure dates are invalid';
  end if;

  if v_start_date > v_end_date then
    raise exception using
      errcode = '22023',
      message = 'periodic closure start date cannot be after end date';
  end if;

  v_note := pg_catalog.btrim(coalesce(p_payload ->> 'note', ''));

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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'poseidon-periodic-closure-visible-id',
      0
    )
  );

  with
  closed_balances as materialized (
    select
      cb.*,
      coalesce(
        (cb.closed_at at time zone 'UTC')::date,
        cb.operating_date
      ) as snapshot_date
    from public.cash_balances cb
    where cb.local_id = p_local_id
      and cb.status = 'CERRADO'
      and coalesce(
        (cb.closed_at at time zone 'UTC')::date,
        cb.operating_date
      ) between v_start_date and v_end_date
  ),
  reading_totals as (
    select
      mr.balance_id,
      coalesce(pg_catalog.sum(mr.result), 0)::numeric as result_machines
    from public.machine_readings mr
    join closed_balances cb on cb.id = mr.balance_id
    where mr.status = 'CARGADA'
    group by mr.balance_id
  ),
  expense_totals as (
    select
      e.balance_id,
      coalesce(pg_catalog.sum(e.amount), 0)::numeric as total_expenses,
      coalesce(
        pg_catalog.sum(e.amount)
          filter (where ca.kind = 'LOCAL_EFECTIVO'),
        0
      )::numeric as cash_expenses
    from public.expenses e
    join closed_balances cb on cb.id = e.balance_id
    join public.current_accounts ca on ca.id = e.payment_account_id
    where e.status = 'ACTIVO'
    group by e.balance_id
  ),
  balance_salary_rows as materialized (
    select
      ss.balance_id,
      ss.payment_account_id,
      private.salary_settlement_cash_amount(ss) as amount
    from public.salary_settlements ss
    join closed_balances cb on cb.id = ss.balance_id
    where ss.status <> 'ANULADA'
  ),
  balance_salary_totals as (
    select
      bsr.balance_id,
      coalesce(pg_catalog.sum(bsr.amount), 0)::numeric as total_salaries,
      coalesce(
        pg_catalog.sum(bsr.amount)
          filter (
            where bsr.payment_account_id is null
               or ca.kind = 'LOCAL_EFECTIVO'
          ),
        0
      )::numeric as cash_salaries
    from balance_salary_rows bsr
    left join public.current_accounts ca on ca.id = bsr.payment_account_id
    group by bsr.balance_id
  ),
  gift_totals as (
    select
      g.balance_id,
      coalesce(
        pg_catalog.sum(g.cash_amount + g.credit_amount),
        0
      )::numeric as total_gifts,
      coalesce(pg_catalog.sum(g.cash_amount), 0)::numeric as gift_cash
    from public.gifts g
    join closed_balances cb on cb.id = g.balance_id
    where g.status = 'ACTIVO'
    group by g.balance_id
  ),
  transfer_totals as (
    select
      t.balance_id,
      coalesce(pg_catalog.sum(t.amount), 0)::numeric as total_transfers
    from public.transfers t
    join closed_balances cb on cb.id = t.balance_id
    where t.status = 'ACTIVO'
    group by t.balance_id
  ),
  linked_treasury_totals as (
    select
      tt.balance_id,
      coalesce(
        pg_catalog.sum(tt.amount)
          filter (where tt.type = 'RETIRO_CAJA'),
        0
      )::numeric as caja_to_principal,
      coalesce(
        pg_catalog.sum(tt.amount)
          filter (where tt.type = 'APORTE_CAJA'),
        0
      )::numeric as principal_to_caja,
      coalesce(
        pg_catalog.sum(tt.amount)
          filter (
            where tt.type = 'RETIRO_CAJA'
              and tt.medium = 'EFECTIVO'
          ),
        0
      )::numeric as cash_out,
      coalesce(
        pg_catalog.sum(tt.amount)
          filter (
            where tt.type = 'APORTE_CAJA'
              and tt.medium = 'EFECTIVO'
          ),
        0
      )::numeric as cash_in
    from public.treasury_transfers tt
    join closed_balances cb on cb.id = tt.balance_id
    where tt.status = 'ACTIVO'
      and tt.timing <> 'APERTURA'
    group by tt.balance_id
  ),
  linked_legacy_totals as (
    select
      cm.balance_id,
      coalesce(
        pg_catalog.sum(cm.amount)
          filter (where cm.type = 'RETIRO'),
        0
      )::numeric as caja_to_principal,
      coalesce(
        pg_catalog.sum(cm.amount)
          filter (where cm.type = 'APORTE'),
        0
      )::numeric as principal_to_caja,
      coalesce(
        pg_catalog.sum(cm.amount)
          filter (
            where cm.type = 'RETIRO'
              and cm.medium = 'EFECTIVO'
          ),
        0
      )::numeric as cash_out,
      coalesce(
        pg_catalog.sum(cm.amount)
          filter (
            where cm.type = 'APORTE'
              and cm.medium = 'EFECTIVO'
          ),
        0
      )::numeric as cash_in
    from public.capital_movements cm
    join closed_balances cb on cb.id = cm.balance_id
    where cm.status = 'ACTIVO'
      and cm.timing <> 'APERTURA'
    group by cm.balance_id
  ),
  balance_metrics as (
    select
      cb.*,
      coalesce(rt.result_machines, 0)::numeric as result_machines,
      coalesce(et.total_expenses, 0)::numeric as total_expenses,
      coalesce(et.cash_expenses, 0)::numeric as cash_expenses,
      coalesce(bst.total_salaries, 0)::numeric as total_salaries,
      coalesce(bst.cash_salaries, 0)::numeric as cash_salaries,
      coalesce(gt.total_gifts, 0)::numeric as total_gifts,
      coalesce(gt.gift_cash, 0)::numeric as gift_cash,
      coalesce(trt.total_transfers, 0)::numeric as total_transfers,
      coalesce(ltt.caja_to_principal, 0)::numeric
        + coalesce(llt.caja_to_principal, 0)::numeric
        as caja_to_principal,
      coalesce(ltt.principal_to_caja, 0)::numeric
        + coalesce(llt.principal_to_caja, 0)::numeric
        as principal_to_caja,
      coalesce(ltt.cash_out, 0)::numeric
        + coalesce(llt.cash_out, 0)::numeric
        as cash_out,
      coalesce(ltt.cash_in, 0)::numeric
        + coalesce(llt.cash_in, 0)::numeric
        as cash_in
    from closed_balances cb
    left join reading_totals rt on rt.balance_id = cb.id
    left join expense_totals et on et.balance_id = cb.id
    left join balance_salary_totals bst on bst.balance_id = cb.id
    left join gift_totals gt on gt.balance_id = cb.id
    left join transfer_totals trt on trt.balance_id = cb.id
    left join linked_treasury_totals ltt on ltt.balance_id = cb.id
    left join linked_legacy_totals llt on llt.balance_id = cb.id
  ),
  balance_snapshot as materialized (
    select
      bm.*,
      coalesce(
        bm.cash_difference,
        coalesce(bm.declared_cash, 0)
        - (
          bm.initial_cash
          + bm.result_machines
          + bm.cash_in
          - bm.cash_expenses
          - bm.cash_salaries
          - bm.gift_cash
          - bm.total_transfers
          - bm.cash_out
        )
      )::numeric as snapshot_cash_difference,
      coalesce(bm.bank_difference, 0)::numeric as snapshot_bank_difference
    from balance_metrics bm
  ),
  principal_expenses as materialized (
    select e.*
    from public.expenses e
    where e.local_id = p_local_id
      and e.balance_id is null
      and e.status = 'ACTIVO'
      and (e.created_at at time zone 'UTC')::date
        between v_start_date and v_end_date
  ),
  principal_salary_rows as materialized (
    select
      ss.*,
      private.salary_settlement_cash_amount(ss) as snapshot_amount
    from public.salary_settlements ss
    where ss.local_id = p_local_id
      and ss.balance_id is null
      and ss.status <> 'ANULADA'
      and (
        (
          v_type = 'MENSUAL'
          and ss.period_month between
            pg_catalog.date_trunc('month', v_start_date)::date
            and pg_catalog.date_trunc('month', v_end_date)::date
        )
        or (
          v_type <> 'MENSUAL'
          and (ss.created_at at time zone 'UTC')::date
            between v_start_date and v_end_date
        )
      )
  ),
  unlinked_treasury as materialized (
    select tt.*
    from public.treasury_transfers tt
    where tt.local_id = p_local_id
      and tt.balance_id is null
      and tt.status = 'ACTIVO'
      and (tt.created_at at time zone 'UTC')::date
        between v_start_date and v_end_date
  ),
  included_partner_movements as materialized (
    select pm.*
    from public.partner_movements pm
    where pm.local_id = p_local_id
      and pm.status = 'ACTIVO'
      and (pm.created_at at time zone 'UTC')::date
        between v_start_date and v_end_date
  )
  select
    coalesce(
      (
        select pg_catalog.array_agg(
          bs.id order by bs.snapshot_date, bs.id
        )
        from balance_snapshot bs
      ),
      array[]::uuid[]
    ),
    coalesce(
      (
        select pg_catalog.array_agg(
          pe.id order by pe.created_at, pe.id
        )
        from principal_expenses pe
      ),
      array[]::uuid[]
    ),
    coalesce(
      (
        select pg_catalog.array_agg(
          psr.id order by psr.period_month, psr.created_at, psr.id
        )
        from principal_salary_rows psr
      ),
      array[]::uuid[]
    ),
    coalesce(
      (
        select pg_catalog.array_agg(
          ut.id order by ut.created_at, ut.id
        )
        from unlinked_treasury ut
      ),
      array[]::uuid[]
    ),
    coalesce(
      (
        select pg_catalog.array_agg(
          ipm.id order by ipm.created_at, ipm.id
        )
        from included_partner_movements ipm
      ),
      array[]::uuid[]
    ),
    coalesce(
      (select pg_catalog.sum(bs.result_machines) from balance_snapshot bs),
      0
    )::numeric,
    (
      coalesce(
        (select pg_catalog.sum(bs.total_expenses) from balance_snapshot bs),
        0
      )
      + coalesce(
        (select pg_catalog.sum(pe.amount) from principal_expenses pe),
        0
      )
    )::numeric,
    (
      coalesce(
        (select pg_catalog.sum(bs.total_salaries) from balance_snapshot bs),
        0
      )
      + coalesce(
        (
          select pg_catalog.sum(psr.snapshot_amount)
          from principal_salary_rows psr
        ),
        0
      )
    )::numeric,
    coalesce(
      (select pg_catalog.sum(bs.total_gifts) from balance_snapshot bs),
      0
    )::numeric,
    coalesce(
      (select pg_catalog.sum(bs.total_transfers) from balance_snapshot bs),
      0
    )::numeric,
    (
      coalesce(
        (
          select pg_catalog.sum(bs.caja_to_principal)
          from balance_snapshot bs
        ),
        0
      )
      + coalesce(
        (
          select pg_catalog.sum(ut.amount)
          from unlinked_treasury ut
          where ut.type = 'RETIRO_CAJA'
        ),
        0
      )
    )::numeric,
    (
      coalesce(
        (
          select pg_catalog.sum(bs.principal_to_caja)
          from balance_snapshot bs
        ),
        0
      )
      + coalesce(
        (
          select pg_catalog.sum(ut.amount)
          from unlinked_treasury ut
          where ut.type = 'APORTE_CAJA'
        ),
        0
      )
    )::numeric,
    coalesce(
      (
        select pg_catalog.sum(ipm.amount)
        from included_partner_movements ipm
        where ipm.type = 'APORTE_SOCIO'
      ),
      0
    )::numeric,
    coalesce(
      (
        select pg_catalog.sum(ipm.amount)
        from included_partner_movements ipm
        where ipm.type = 'RETIRO_SOCIO'
      ),
      0
    )::numeric,
    coalesce(
      (
        select pg_catalog.sum(bs.snapshot_cash_difference)
        from balance_snapshot bs
      ),
      0
    )::numeric,
    coalesce(
      (
        select pg_catalog.sum(bs.snapshot_bank_difference)
        from balance_snapshot bs
      ),
      0
    )::numeric,
    coalesce(
      (
        select pg_catalog.count(*)
        from balance_snapshot bs
        where (
            bs.snapshot_cash_difference <> 0
            or bs.snapshot_bank_difference <> 0
          )
          and coalesce(bs.difference_status, 'PENDIENTE') = 'PENDIENTE'
      ),
      0
    )::integer
  into
    v_balance_ids,
    v_principal_expense_ids,
    v_principal_salary_ids,
    v_treasury_transfer_ids,
    v_partner_movement_ids,
    v_result_machines,
    v_total_expenses,
    v_total_salaries,
    v_total_gifts,
    v_total_transfers,
    v_total_caja_to_principal,
    v_total_principal_to_caja,
    v_total_partner_contributions,
    v_total_partner_withdrawals,
    v_cash_difference,
    v_bank_difference,
    v_pending_differences;

  if pg_catalog.cardinality(v_balance_ids) = 0 then
    raise exception using
      errcode = '55000',
      message = 'no closed cash balances exist in the requested period';
  end if;

  v_total_outflows :=
    v_total_expenses + v_total_salaries + v_total_gifts;
  v_commercial_result := v_result_machines - v_total_outflows;

  select coalesce(
    pg_catalog.max(
      case
        when pc.visible_id ~ '^PER-[0-9]+$' then
          pg_catalog.substring(pc.visible_id, '([0-9]+)$')::bigint
        else 0
      end
    ),
    0
  ) + 1
  into v_next_sequence
  from public.periodic_closures pc;

  select p.legacy_id
  into v_actor_legacy_id
  from public.profiles p
  where p.id = v_request.actor_id;

  insert into public.periodic_closures (
    id,
    legacy_id,
    visible_id,
    local_id,
    type,
    start_date,
    end_date,
    result_machines,
    total_expenses,
    total_salaries,
    total_gifts,
    total_outflows,
    commercial_result,
    total_transfers,
    total_withdrawals,
    total_contributions,
    total_caja_to_principal,
    total_principal_to_caja,
    total_partner_contributions,
    total_partner_withdrawals,
    cash_difference,
    bank_difference,
    pending_differences,
    status,
    note,
    created_by,
    created_by_legacy_id,
    created_at,
    updated_at
  )
  values (
    v_closure_id,
    'periodic-closure-' || v_closure_id::text,
    'PER-' || v_next_sequence::text,
    p_local_id,
    v_type,
    v_start_date,
    v_end_date,
    v_result_machines,
    v_total_expenses,
    v_total_salaries,
    v_total_gifts,
    v_total_outflows,
    v_commercial_result,
    v_total_transfers,
    v_total_caja_to_principal,
    v_total_principal_to_caja,
    v_total_caja_to_principal,
    v_total_principal_to_caja,
    v_total_partner_contributions,
    v_total_partner_withdrawals,
    v_cash_difference,
    v_bank_difference,
    v_pending_differences,
    'GENERADO',
    v_note,
    v_request.actor_id,
    v_actor_legacy_id,
    v_created_at,
    v_created_at
  )
  returning * into v_closure;

  insert into public.periodic_closure_balances (
    closure_id,
    balance_id,
    local_id
  )
  select v_closure.id, included.balance_id, p_local_id
  from pg_catalog.unnest(v_balance_ids) included(balance_id);

  insert into public.periodic_closure_expenses (
    closure_id,
    expense_id,
    local_id
  )
  select v_closure.id, included.expense_id, p_local_id
  from pg_catalog.unnest(v_principal_expense_ids) included(expense_id);

  insert into public.periodic_closure_salary_settlements (
    closure_id,
    settlement_id,
    local_id
  )
  select v_closure.id, included.settlement_id, p_local_id
  from pg_catalog.unnest(v_principal_salary_ids) included(settlement_id);

  insert into public.periodic_closure_treasury_transfers (
    closure_id,
    treasury_transfer_id,
    local_id
  )
  select v_closure.id, included.treasury_transfer_id, p_local_id
  from pg_catalog.unnest(v_treasury_transfer_ids)
    included(treasury_transfer_id);

  insert into public.periodic_closure_partner_movements (
    closure_id,
    partner_movement_id,
    local_id
  )
  select v_closure.id, included.partner_movement_id, p_local_id
  from pg_catalog.unnest(v_partner_movement_ids)
    included(partner_movement_id);

  v_snapshot := private.periodic_closure_snapshot(v_closure.id);

  perform private.append_command_audit(
    v_request.id,
    'Generar cierre periodico',
    'CierrePeriodico',
    v_closure.id::text,
    p_local_id,
    '{}'::jsonb,
    v_snapshot,
    v_closure.note
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    v_snapshot,
    'ledger',
    '[]'::jsonb,
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create function public.poseidon_annul_periodic_closure(
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
  v_previous public.periodic_closures%rowtype;
  v_closure public.periodic_closures%rowtype;
  v_closure_reference text;
  v_reason text;
  v_previous_snapshot jsonb;
  v_snapshot jsonb;
  v_response jsonb;
begin
  select *
  into v_request
  from private.claim_command(
    p_actor_function,
    p_local_id,
    'annul_periodic_closure',
    p_idempotency_key,
    private.command_request_hash(
      'annul_periodic_closure',
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
      message = 'periodic closure annulment requires a control function';
  end if;

  perform private.assert_active_command_local(p_local_id);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'payload must be a JSON object';
  end if;

  v_closure_reference := nullif(
    pg_catalog.btrim(
      coalesce(p_payload ->> 'closureId', p_payload ->> 'closure_id', '')
    ),
    ''
  );
  v_reason := pg_catalog.btrim(coalesce(p_payload ->> 'reason', ''));

  if v_closure_reference is null then
    raise exception using
      errcode = '22023',
      message = 'closureId is required';
  end if;
  if v_reason = '' then
    raise exception using
      errcode = '22023',
      message = 'periodic closure annulment requires a reason';
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
  from public.periodic_closures pc
  where pc.local_id = p_local_id
    and (
      pc.id::text = v_closure_reference
      or pc.legacy_id = v_closure_reference
    )
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'periodic closure not found in command local';
  end if;
  if v_previous.status = 'ANULADO' then
    raise exception using
      errcode = '55000',
      message = 'periodic closure is already annulled';
  end if;

  v_previous_snapshot :=
    private.periodic_closure_snapshot(v_previous.id);

  update public.periodic_closures pc
  set status = 'ANULADO'
  where pc.id = v_previous.id
  returning * into v_closure;

  v_snapshot := private.periodic_closure_snapshot(v_closure.id);

  perform private.append_command_audit(
    v_request.id,
    'Anular cierre periodico',
    'CierrePeriodico',
    v_closure.id::text,
    p_local_id,
    v_previous_snapshot,
    v_snapshot,
    v_reason
  );

  v_response := pg_catalog.jsonb_build_object(
    'ok',
    true,
    'value',
    v_snapshot,
    'ledger',
    '[]'::jsonb,
    'revision',
    v_request.id::text
  );
  perform private.finish_command(v_request.id, 'APLICADO', v_response);
  return v_response;
end;
$$;

create or replace function public.poseidon_session_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor public.profiles%rowtype;
  v_locals jsonb;
begin
  select *
  into v_actor
  from public.profiles p
  where p.id = auth.uid()
    and p.status = 'ACTIVO';

  if v_actor.id is null then
    raise exception using
      errcode = '42501',
      message = 'active profile required';
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', l.id,
        'legacy_id', l.legacy_id,
        'visible_id', l.visible_id,
        'name', l.name,
        'status', l.status
      )
      order by pg_catalog.char_length(l.visible_id), l.visible_id
    ),
    '[]'::jsonb
  )
  into v_locals
  from public.locals l
  where v_actor.role = 'ADMINISTRADOR'
     or exists (
       select 1
       from public.user_locals ul
       where ul.user_id = v_actor.id
         and ul.local_id = l.id
     );

  return pg_catalog.jsonb_build_object(
    'schema_version', 4,
    'profile',
    pg_catalog.jsonb_build_object(
      'id', v_actor.id,
      'legacy_id', v_actor.legacy_id,
      'username', v_actor.username,
      'display_name', v_actor.display_name,
      'role', v_actor.role
    ),
    'locals', v_locals
  );
end;
$$;

revoke all on function private.periodic_closure_snapshot(uuid)
from public, anon, authenticated;
revoke all on function private.guard_periodic_closure_mutation()
from public, anon, authenticated;

revoke all on function public.poseidon_create_periodic_closure(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_annul_periodic_closure(
  text,
  public.app_role,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.poseidon_session_context()
from public, anon;

grant execute on function public.poseidon_create_periodic_closure(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_annul_periodic_closure(
  text,
  public.app_role,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.poseidon_session_context()
to authenticated;

comment on function private.periodic_closure_snapshot(uuid) is
  'Returns one immutable periodic snapshot with all explicit source associations.';
comment on function private.guard_periodic_closure_mutation() is
  'Allows only the append-only GENERADO to ANULADO status transition.';
comment on function public.poseidon_create_periodic_closure(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Creates one locally scoped periodic snapshot and its audit atomically.';
comment on function public.poseidon_annul_periodic_closure(
  text,
  public.app_role,
  uuid,
  jsonb
) is
  'Annuls a periodic snapshot without deleting or recalculating its frozen values.';
comment on function public.poseidon_session_context() is
  'Returns schema 4 with the authenticated active profile and its server-authorized locals.';

commit;
