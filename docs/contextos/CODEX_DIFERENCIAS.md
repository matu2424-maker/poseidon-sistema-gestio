# Contexto Codex - Diferencias

Ultima actualizacion: 2026-07-08

Leer este contexto antes de modificar Diferencias. Referencias asociadas:

- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/06_diferencias_caja.md`
- `docs/modulos/05_cierre_caja.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/modulos/12_auditoria.md`
- `docs/MODULARIZACION_REFERENCIAS.md`

## Codigo actual

- Pantalla: `Differences` en `src/App.tsx`.
- Tipos: `DifferenceStatus`, `Balance`, `AccountMovementSource` en `src/types.ts`.
- Helpers de estado/impacto: `cashDifferenceForBalance`, `bankDifferenceForBalance`, `balanceHasDifference`, `differenceIsPending`, `differenceActionImpact` viven en `src/lib/differences.ts`.
- Movimientos de diferencia: `differenceAccountMovement` y `syncDifferenceAccountMovements` viven en `src/lib/accountMovements.ts`.
- Estilos: `.differences-page`, `.difference-table`, `.difference-toolbar`, `.difference-detail-modal`, `.difference-correction-grid`, `.difference-history-*` en `src/styles/global.css`.

## Reglas criticas

- Diferencias no cambian resultado economico.
- Diferencias si mueven `Local / Efectivo` o `Local / Banco` para que la siguiente caja abra con saldo real declarado.
- `CORREGIDA` permite editar efectivo/banco declarado, recalcular diferencias y resincronizar movimientos.
- `ANULADA` anula movimientos de diferencia.
- La pantalla es historial por periodo: mes actual, mes anterior o intervalo manual.
- Debe incluir resueltas/corregidas aunque la diferencia actual sea cero.
- Error de observacion obligatoria aparece dentro del modal.
- Tabla principal ordenable por todas sus columnas visibles.

## Asociaciones

- Cierre crea diferencias y movimientos `DIFERENCIA_CAJA`.
- Cuentas corrientes muestran el impacto de diferencias.
- Resumen de cajas muestra diferencias y gestion.
- Auditoria conserva cierre, revision, correccion o anulacion.

## Pruebas manuales

1. Entrar como `encargado`.
2. Ir a `Diferencias`.
3. Cambiar entre mes actual, mes anterior e intervalo.
4. Abrir una recaudacion con diferencia.
5. Intentar guardar sin observacion: el error debe aparecer en el modal.
6. Marcar `CORREGIDA`, cambiar efectivo/banco y guardar con observacion.
7. Verificar que la fila siga apareciendo aunque la diferencia quede en cero.
8. Abrir historial completo en el modal.
9. Revisar `Cuentas corrientes` para ver movimiento actualizado.
