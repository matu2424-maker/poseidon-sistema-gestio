# Contexto Codex - Auditoria

Ultima actualizacion: 2026-07-08

Leer este contexto antes de modificar eventos de auditoria, acciones sensibles, historiales, anulaciones, diferencias, cierres o movimientos contables. Referencias asociadas:

- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/modulos/12_auditoria.md`
- `docs/contextos/CODEX_CAJA.md`
- `docs/contextos/CODEX_DIFERENCIAS.md`
- `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`
- `docs/contextos/CODEX_SALARIOS.md`

## Codigo actual

- Funcion `audit` principal sigue dentro de `App` en `src/App.tsx`.
- Pantalla `Audit` sigue en `src/App.tsx`.
- Eventos se guardan en `data.audit`.
- Muchos historiales especificos viven dentro de sus entidades: balances, maquinas, locales, salarios y movimientos.

## Reglas criticas

- Todo cambio sensible registra fecha/hora, usuario, rol real y funcion usada.
- No borrar historial operativo; anular o desactivar con auditoria.
- Cuando encargado/admin opera como cajero, debe quedar registrado el usuario real y la funcion Cajero.
- Diferencias corregidas, verificadas o anuladas deben conservar observacion y cambios de valores.
- Cambios de salario base deben registrar fecha efectiva y motivo.
- Las tablas de auditoria deben poder ordenar por fecha, usuario, accion y entidad.

## Asociaciones

- Caja: apertura, cierre, contadores, movimientos y anulaciones.
- Diferencias: estado, correccion y movimientos de cuenta.
- Cuentas corrientes: cada movimiento debe poder rastrearse a origen y recaudacion si aplica.
- Salarios: pagos, anulaciones, cambios de base y cierres.
- Locales/maquinas: estado, ubicacion, taller, reset y desuso.

## Pruebas manuales

1. Ejecutar una accion sensible.
2. Abrir Auditoria.
3. Ordenar por fecha, usuario, accion y entidad.
4. Confirmar que se vea usuario real y funcion usada.
5. Confirmar que la entidad y el detalle permitan rastrear el cambio.
