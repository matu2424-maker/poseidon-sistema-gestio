begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'poseidon-private',
  'poseidon-private',
  false,
  20971520,
  array['image/*', 'application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  owner_type public.attachment_owner_type not null,
  owner_local_id uuid not null references public.locals(id) on delete restrict,
  client_id uuid,
  expense_id uuid,
  storage_bucket text not null default 'poseidon-private',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256_hex text,
  status public.attachment_status not null default 'ACTIVO',
  uploaded_by uuid references public.profiles(id) on delete restrict,
  uploaded_by_legacy_id text not null,
  uploaded_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint attachments_client_fk
    foreign key (client_id, owner_local_id) references public.clients(id, local_id) on delete restrict,
  constraint attachments_expense_fk
    foreign key (expense_id, owner_local_id) references public.expenses(id, local_id) on delete restrict,
  constraint attachments_owner_shape check (
    (owner_type = 'LOCAL' and client_id is null and expense_id is null)
    or (owner_type in ('CLIENTE_FOTO', 'CLIENTE_DOCUMENTO') and client_id is not null and expense_id is null)
    or (owner_type = 'GASTO_COMPROBANTE' and client_id is null and expense_id is not null)
  ),
  constraint attachments_storage_bucket_not_blank check (btrim(storage_bucket) <> ''),
  constraint attachments_private_bucket check (storage_bucket = 'poseidon-private'),
  constraint attachments_storage_path_not_blank check (btrim(storage_path) <> ''),
  constraint attachments_file_name_not_blank check (btrim(file_name) <> ''),
  constraint attachments_mime_type_not_blank check (btrim(mime_type) <> ''),
  constraint attachments_mime_type_allowed check (
    mime_type like 'image/%' or mime_type = 'application/pdf'
  ),
  constraint attachments_size_valid check (size_bytes > 0 and size_bytes <= 20971520),
  constraint attachments_sha256_shape check (
    sha256_hex is null or sha256_hex ~ '^[0-9a-f]{64}$'
  ),
  constraint attachments_actor_not_blank check (btrim(uploaded_by_legacy_id) <> ''),
  unique (storage_bucket, storage_path)
);

create index attachments_local_owner_idx
  on public.attachments (owner_local_id, owner_type, uploaded_at desc);
create index attachments_client_idx
  on public.attachments (client_id, uploaded_at desc) where client_id is not null;
create index attachments_expense_idx
  on public.attachments (expense_id, uploaded_at desc) where expense_id is not null;

create trigger attachments_set_updated_at
before update on public.attachments
for each row execute function private.set_updated_at();

comment on table public.attachments is
  'Private object metadata only. Binary content belongs in a private Storage bucket.';

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  legacy_id text not null unique,
  actor_id uuid references public.profiles(id) on delete restrict,
  actor_legacy_id text not null,
  actor_name_snapshot text not null,
  actual_role public.app_role,
  requested_function public.app_role,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  primary_local_id uuid references public.locals(id) on delete restrict,
  previous_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  reason text not null default '',
  command_request_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  constraint audit_events_actor_not_blank check (
    btrim(actor_legacy_id) <> '' and btrim(actor_name_snapshot) <> ''
  ),
  constraint audit_events_action_not_blank check (btrim(action) <> ''),
  constraint audit_events_entity_not_blank check (
    btrim(entity_type) <> '' and btrim(entity_id) <> ''
  )
);

create index audit_events_created_idx on public.audit_events (created_at desc, id);
create index audit_events_actor_created_idx on public.audit_events (actor_id, created_at desc);
create index audit_events_entity_created_idx
  on public.audit_events (entity_type, entity_id, created_at desc);
create index audit_events_primary_local_created_idx
  on public.audit_events (primary_local_id, created_at desc);

create trigger audit_events_append_only
before update or delete on public.audit_events
for each row execute function private.reject_append_only_mutation();

create table public.audit_event_locals (
  audit_event_id uuid not null references public.audit_events(id) on delete restrict,
  local_id uuid not null references public.locals(id) on delete restrict,
  primary key (audit_event_id, local_id)
);

create index audit_event_locals_local_event_idx
  on public.audit_event_locals (local_id, audit_event_id);

create trigger audit_event_locals_append_only
before update or delete on public.audit_event_locals
for each row execute function private.reject_append_only_mutation();

create table public.command_requests (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  actual_role public.app_role not null,
  requested_function public.app_role not null,
  command_name text not null,
  local_id uuid references public.locals(id) on delete restrict,
  idempotency_key text not null,
  request_hash text not null,
  status public.command_request_status not null default 'PENDIENTE',
  response_payload jsonb,
  error_code text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  constraint command_requests_command_name_shape check (
    command_name ~ '^[a-z][a-z0-9_.-]{2,99}$'
  ),
  constraint command_requests_idempotency_key_length check (
    char_length(idempotency_key) between 8 and 200
  ),
  constraint command_requests_hash_shape check (request_hash ~ '^[0-9a-f]{64}$'),
  constraint command_requests_completion_shape check (
    (status = 'PENDIENTE' and completed_at is null)
    or (status in ('APLICADO', 'FALLIDO') and completed_at is not null)
  ),
  unique (actor_id, command_name, idempotency_key)
);

create index command_requests_actor_created_idx
  on public.command_requests (actor_id, created_at desc);
create index command_requests_pending_idx
  on public.command_requests (status, created_at)
  where status = 'PENDIENTE';
create index command_requests_local_created_idx
  on public.command_requests (local_id, created_at desc)
  where local_id is not null;

create trigger command_requests_set_updated_at
before update on public.command_requests
for each row execute function private.set_updated_at();

alter table public.audit_events
  add constraint audit_events_command_request_fk
  foreign key (command_request_id) references public.command_requests(id) on delete restrict;

comment on table public.command_requests is
  'Idempotency contract for specific server-side commands. It is not a whole-AppData persistence endpoint.';

-- Reverse after the security migration: remove the audit FK, command requests,
-- audit scope/events, attachments, and finally the empty poseidon-private bucket.

commit;
