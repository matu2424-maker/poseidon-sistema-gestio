# Contexto Codex - Auditoria

Ultima actualizacion: 2026-07-16

Leer este contexto antes de modificar eventos de auditoria, acciones sensibles, historiales, anulaciones, diferencias, cierres o movimientos contables. Referencias asociadas:

- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/modulos/12_auditoria.md`
- `docs/contextos/CODEX_CAJA.md`
- `docs/contextos/CODEX_DIFERENCIAS.md`
- `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`
- `docs/contextos/CODEX_SALARIOS.md`

## Codigo actual

- La construccion central de eventos vive en `src/lib/audit.ts`.
- `App` conserva un wrapper local `audit(...)` para pasar usuario real y funcion activa a `appendAuditEvent(...)`.
- Pantalla `Audit` vive en `src/features/audit/Audit.tsx`.
- Eventos se guardan en `data.audit`.
- `auditEventLocalIds(...)` resuelve contexto desde `localId`, payload, balance, cuenta o entidad relacionada; `auditEventVisibleToUser(...)` aplica el alcance por rol.
- Muchos historiales especificos viven dentro de sus entidades: balances, maquinas, locales, salarios y movimientos.

## Reglas criticas

- Todo cambio sensible registra fecha/hora, usuario, rol real y funcion usada.
- Cada evento nuevo congela los locales asociados en ese momento.
- No se crean logs sinteticos durante el render ni se guardan contraseñas/base64 en valor anterior/nuevo.
- No borrar historial operativo; anular o desactivar con auditoria.
- Cuando encargado/admin opera como cajero, debe quedar registrado el usuario real y la funcion Cajero.
- Diferencias corregidas, verificadas o anuladas deben conservar observacion y cambios de valores.
- Cambios de salario base deben registrar fecha efectiva y motivo.
- Las tablas de auditoria deben poder ordenar por fecha, usuario, accion y entidad.
- Todas las columnas de datos visibles son ordenables; la columna `Accion` no lo es.
- Administrador ve la bitacora global. Encargado solo ve eventos de sus locales asignados; no ve eventos sin contexto local resoluble.
- Gestionar una diferencia guarda saldos de cuentas antes/despues y cada movimiento nuevo con ID, cuenta, direccion, importe y enlace de ajuste.

## Asociaciones

- Caja: apertura, cierre, contadores, movimientos y anulaciones.
- Diferencias: estado, correccion y movimientos de cuenta.
- Cuentas corrientes: cada movimiento debe poder rastrearse a origen y recaudacion si aplica.
- Salarios: pagos, anulaciones, cambios de base, cierre definitivo y apertura/cierre/cancelacion de revisiones correctivas.
- Locales/maquinas: estado, ubicacion, taller, reset y desuso.

## Pruebas manuales

1. Ejecutar una accion sensible.
2. Abrir Auditoria.
3. Ordenar por fecha, usuario, accion y entidad.
4. Confirmar que se vea usuario real y funcion usada.
5. Confirmar que la entidad y el detalle permitan rastrear el cambio.
6. Entrar como encargado y confirmar que no aparecen eventos de otros locales ni eventos globales sin local.
7. Abrir un evento de diferencia y verificar saldos y movimientos contables.
