# Historial de versiones

Este archivo registra cambios incluidos en candidatos y versiones publicadas de Poseidon. La etiqueta Git es la referencia exacta del codigo; este documento explica su contenido.

## [Sin publicar]

### Agregado

- Auditoria segura de secretos sobre todos los blobs alcanzables del historial
  Git, integrada al preflight sin imprimir valores detectados.
- Negociacion explicita del esquema remoto `2`, contexto de sesion derivado de
  `auth.uid()` y rechazo local de IDs de local que no sean UUID remotos.
- Ocho RPC financieras transaccionales para gastos, revision, traspasos de
  tesoreria y movimientos de socios, con fondos, idempotencia serializada,
  libro append-only y auditoria.
- Plan determinista de migracion de las 22 colecciones por fases y lotes,
  acompañado por conteos y huellas SHA-256 para conciliacion.
- Dos migraciones y dos suites SQL nuevas. Las ocho migraciones aplicaron desde
  cero en PostgreSQL 18 y 59 aserciones nuevas aprobaron en una base descartable.

### Seguridad

- Cajero ya no puede leer movimientos legacy de capital ni traspasos de
  tesoreria ajenos a una caja; Locales y Maquinas rechazan borrado fisico.

### Pendiente

- El backend sigue inactivo. Faltan Auth real, consultas remotas, las 23 RPC
  restantes, importacion ejecutable, conciliacion contra destino, Storage y
  rollback ensayado.

## [0.1.0-beta.2] - 2026-07-26

Estado: candidato local validado. No fue enviado a GitHub, no mueve
`release/test` y no reemplaza la beta publica `0.1.0-beta.1`.

### Seguridad y autorizacion

- Los comandos criticos de apertura, contadores, cierre, salarios, maestros y
  movimientos validan usuario activo, rol real, funcion utilizada y alcance de
  local antes de mutar datos.
- El preflight rechaza secretos de Supabase/PostgreSQL, claves privadas y URLs
  con credenciales en cualquier archivo versionado.
- El archivo local obsoleto `.env.local` fue eliminado sin leer ni exponer sus
  valores. La rotacion o revocacion en los proveedores sigue pendiente.

### Calidad e historial

- La suite E2E incorpora los ciclos completos de Locales, Maquinas, Personal,
  Clientes y Papelera.
- Las auditorias de locales eliminados y el historial de maquinas quitadas se
  preservan mediante referencias historicas y tombstones append-only.
- El candidato aprobo `240/240` pruebas unitarias/integracion y `30/30`
  recorridos E2E.

### Backend preparatorio

- Se versionan seis migraciones PostgreSQL/Supabase, RLS, cuatro suites pgTAP,
  un gateway de comandos y la matriz completa de las 22 colecciones de
  `AppData`.
- La CI reserva una base descartable para lint y pgTAP antes del E2E de release.
- El backend permanece `VALIDATING` e inactivo. Esta beta sigue usando
  `localStorage`, login local y metadatos de adjuntos.
- La activacion requiere PostgreSQL real, RPC transaccionales por flujo, Auth,
  idempotencia concurrente, importacion conciliada y rollback ensayado.

### Entrega

- CI actualizado a `actions/checkout@v6`, `actions/setup-node@v6`,
  `pnpm/action-setup@v6` y `actions/upload-artifact@v7`.
- Vercel no despliega automaticamente `main`; una futura publicacion debe salir
  de `release/test` y requiere autorizacion explicita.

## [0.1.0-beta.1] - 2026-07-24

Estado: beta demo publicada en Vercel el 2026-07-24.

Referencias: `release/test` y `v0.1.0-beta.1` permanecen congelados sobre el commit `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`; `main` contiene controles y documentacion posteriores sin cambios funcionales.

### Incluye

- Base funcional de Cajero, Encargado y Administrador.
- Caja, contadores, movimientos, tesoreria, cuentas corrientes, salarios, maestros, cierres y auditoria.
- Snapshot local esquema 5 con validacion profunda, respaldo, importacion y control de conflictos.
- Preparacion reproducible de Node, pnpm, CI, Vercel y Playwright para la primera fase de prueba online.

### Limites

- Persistencia exclusiva en `localStorage`.
- Login local sin autenticacion real.
- Sin archivos remotos ni backend multiusuario; el despliegue activo es exclusivamente una demo publica.
