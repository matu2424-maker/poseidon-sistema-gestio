begin;

grant usage on schema private to authenticated;

grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_control_user() to authenticated;
grant execute on function private.can_access_local(uuid) to authenticated;
grant execute on function private.can_access_all_locals(uuid[]) to authenticated;
grant execute on function private.can_access_salary_closure(uuid) to authenticated;
grant execute on function private.can_access_audit_event(uuid) to authenticated;

comment on schema private is
  'Server-only helpers. Authenticated execution is limited to read-only RLS predicates explicitly granted by migration.';

commit;
