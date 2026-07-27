# Contexto corto - Backend remoto

Ultima actualizacion: 2026-07-26

## Estado

- El modo operativo sigue siendo `local`.
- `PoseidonCommandGateway` y `supabase/**` son una base preparatoria inactiva.
- Ocho de 31 RPC financieras y `poseidon_session_context()` estan
  implementadas localmente; no existe proyecto Supabase conectado ni Auth real.
- El frontend remoto exige esquema `2`; IDs operativos de local deben ser UUID.
- `remoteMigrationPlan.ts` prepara fases/lotes y conciliacion, pero no inserta.
- No hacer dual-write ni persistir `AppData` completo como una fila.

## Lectura minima

1. `docs/coordinacion/decisiones/DEC-2026-007-backend-transaccional-por-comandos.md`.
2. `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`.
3. `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`.
4. `docs/MATRIZ_MIGRACION_APPDATA_POSTGRESQL.md`.
5. `docs/REGLAS_CONTABLES.md`.
6. `docs/SEGURIDAD_CREDENCIALES.md`.

## Contratos

- Identidad real desde `auth.uid()`.
- Rol real y funcion solicitada se validan en servidor.
- RLS limita lecturas por rol y locales.
- Mutaciones mediante RPC especificas, atomicas e idempotentes.
- Tablas financieras y auditoria sin escritura directa del frontend.
- Libro, auditoria e historiales no se borran.
- Cajero no lee personal completo, cuentas personales ni operaciones de
  Principal.
- Un evento multilocal requiere acceso a todos sus locales.

## Puertas antes de activar

- Base vacia, lint y pgTAP reales.
- Auth y perfiles demo.
- RPC del flujo habilitado.
- Pruebas negativas por los tres roles.
- Concurrencia e idempotencia.
- Importacion y conciliacion sin diferencias.
- Rollback ensayado.
- Las 23 RPC restantes y consultas remotas del flujo a habilitar.

## Validacion

```text
pnpm run check
pnpm run build
pnpm run backend:check
```

`backend:check` requiere Docker y Supabase local activo. Si el entorno no los
tiene, informar el limite; no declarar la puerta oficial pgTAP aprobada. Como
control adicional del 2026-07-26, las ocho migraciones aplicaron desde cero en
PostgreSQL 18 y 59 aserciones nuevas aprobaron con un arnes local descartable.
