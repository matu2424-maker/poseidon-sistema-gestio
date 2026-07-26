begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create type public.app_role as enum ('CAJERO', 'ENCARGADO', 'ADMINISTRADOR');
create type public.user_status as enum ('ACTIVO', 'INACTIVO');
create type public.local_status as enum ('ACTIVO', 'INACTIVO', 'CERRADO');
create type public.balance_status as enum ('EN_PROCESO', 'CERRADO', 'AJUSTADO', 'ANULADO');
create type public.machine_status as enum ('ACTIVA', 'INACTIVA', 'MANTENIMIENTO', 'DESUSO');
create type public.machine_location_kind as enum ('LOCAL', 'TALLER');
create type public.machine_history_action as enum ('AGREGADA', 'MODIFICADA', 'MOVIDA', 'QUITADA', 'CONTADORES', 'RESET');
create type public.reading_status as enum ('PENDIENTE', 'CARGADA', 'SIN_LECTURA', 'FUERA_DE_SERVICIO');
create type public.movement_status as enum ('ACTIVO', 'ANULADO');
create type public.difference_status as enum ('PENDIENTE', 'VERIFICADA', 'CORREGIDA', 'ANULADA');
create type public.expense_review_status as enum ('PENDIENTE', 'REVISADO', 'OBSERVADO');
create type public.expense_category_status as enum ('ACTIVA', 'INACTIVA');
create type public.staff_status as enum ('ACTIVO', 'BAJA', 'PAPELERA');
create type public.staff_position as enum ('CAJERO_A', 'ENCARGADO_A', 'MANTENIMIENTO', 'LIMPIEZA');
create type public.client_status as enum ('ACTIVO', 'INACTIVO', 'PAPELERA');
create type public.client_document_type as enum ('CEDULA', 'PASAPORTE');
create type public.client_category as enum ('GENERAL', 'FRECUENTE', 'VIP');
create type public.salary_type as enum ('MENSUAL', 'JORNAL', 'HORA');
create type public.salary_concept as enum (
  'SALARIO',
  'SUELDO',
  'ADELANTO',
  'EXTRA',
  'HORAS_EXTRAS',
  'AJUSTE',
  'DESCUENTO',
  'AGUINALDO',
  'SALARIO_VACACIONAL'
);
create type public.salary_settlement_status as enum ('BORRADOR', 'CONFIRMADA', 'ANULADA');
create type public.salary_settlement_origin as enum ('CAJA', 'LIQUIDACION');
create type public.salary_closure_kind as enum ('ORDINARIO', 'CORRECTIVO');
create type public.salary_closure_status as enum ('CORRECCION_ABIERTA', 'CERRADO', 'ANULADO');
create type public.periodic_closure_type as enum ('SEMANAL', 'QUINCENAL', 'MENSUAL', 'PERSONALIZADO');
create type public.periodic_closure_status as enum ('GENERADO', 'ANULADO');
create type public.week_day as enum ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');
create type public.currency_code as enum ('UYU');
create type public.financial_medium as enum ('EFECTIVO', 'BANCO');
create type public.partner_code as enum ('RICARDO', 'MATHIAS');
create type public.current_account_kind as enum (
  'PERSONAL',
  'TRANSFERENCIAS',
  'LOCAL_EFECTIVO',
  'LOCAL_BANCO',
  'PRINCIPAL_EFECTIVO',
  'PRINCIPAL_BANCO',
  'SOCIO'
);
create type public.current_account_status as enum ('ACTIVA', 'INACTIVA');
create type public.account_movement_source as enum (
  'SUELDO',
  'TRANSFERENCIA',
  'GASTO',
  'REGALO',
  'RETIRO',
  'APORTE',
  'TRASPASO_CAJA',
  'APORTE_SOCIO',
  'RETIRO_SOCIO',
  'RESULTADO_MAQUINAS',
  'DIFERENCIA_CAJA',
  'MIGRACION',
  'AJUSTE'
);
create type public.account_movement_direction as enum ('ENTRADA', 'SALIDA');
create type public.capital_movement_type as enum ('RETIRO', 'APORTE');
create type public.capital_movement_medium as enum ('EFECTIVO', 'TRANSFERENCIA');
create type public.capital_movement_timing as enum ('APERTURA', 'OPERATIVO', 'CIERRE');
create type public.treasury_transfer_type as enum ('RETIRO_CAJA', 'APORTE_CAJA');
create type public.treasury_transfer_timing as enum ('APERTURA', 'OPERATIVO', 'CIERRE');
create type public.partner_movement_type as enum ('APORTE_SOCIO', 'RETIRO_SOCIO');
create type public.gift_type as enum ('EFECTIVO', 'CREDITO', 'MIXTO');
create type public.attachment_owner_type as enum ('LOCAL', 'CLIENTE_FOTO', 'CLIENTE_DOCUMENTO', 'GASTO_COMPROBANTE');
create type public.attachment_status as enum ('ACTIVO', 'ANULADO');
create type public.command_request_status as enum ('PENDIENTE', 'APLICADO', 'FALLIDO');

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create function private.reject_append_only_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I is append-only; create a reversal or a new audit row', tg_table_name);
end;
$$;

revoke execute on function private.set_updated_at() from public;
revoke execute on function private.reject_append_only_mutation() from public;

comment on schema private is
  'Non-exposed helpers for RLS and future transactional commands. Never add this schema to PostgREST exposed schemas.';

-- Reverse only in a disposable database, after later migrations have been
-- removed: drop schema private cascade; then drop the public enum types above.

commit;
