begin;

create function public.poseidon_session_context()
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
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'legacy_id', l.legacy_id,
        'visible_id', l.visible_id,
        'name', l.name,
        'status', l.status
      )
      order by char_length(l.visible_id), l.visible_id
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

  return jsonb_build_object(
    'schema_version',
    2,
    'profile',
    jsonb_build_object(
      'id', v_actor.id,
      'legacy_id', v_actor.legacy_id,
      'username', v_actor.username,
      'display_name', v_actor.display_name,
      'role', v_actor.role
    ),
    'locals',
    v_locals
  );
end;
$$;

comment on function public.poseidon_session_context() is
  'Returns only the authenticated active profile and its server-authorized locals. It never trusts a profile or local supplied by the frontend.';

revoke all on function public.poseidon_session_context() from public, anon;
grant execute on function public.poseidon_session_context() to authenticated;

drop policy if exists treasury_transfers_select_by_local
on public.treasury_transfers;

create policy treasury_transfers_select_by_scope
on public.treasury_transfers
for select
to authenticated
using (
  (select private.can_access_local(local_id))
  and (
    (select private.is_control_user())
    or balance_id is not null
  )
);

drop policy if exists capital_movements_select_by_local
on public.capital_movements;

create policy capital_movements_select_by_control_local
on public.capital_movements
for select
to authenticated
using (
  (select private.is_control_user())
  and (select private.can_access_local(local_id))
);

create trigger locals_no_delete
before delete on public.locals
for each row execute function private.reject_append_only_mutation();

create trigger machines_no_delete
before delete on public.machines
for each row execute function private.reject_append_only_mutation();

-- Reverse by dropping the two triggers, restoring the previous select policies,
-- and dropping poseidon_session_context.

commit;
