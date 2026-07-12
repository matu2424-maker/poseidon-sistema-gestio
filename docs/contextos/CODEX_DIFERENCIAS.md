# Contexto Codex - Diferencias

Ultima actualizacion: 2026-07-11

Leer este contexto antes de modificar Diferencias. Referencias asociadas:

- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/06_diferencias_caja.md`
- `docs/modulos/05_cierre_caja.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/modulos/12_auditoria.md`
- `docs/MODULARIZACION_REFERENCIAS.md`

## Codigo actual

- Pantalla: `Differences` en `src/features/manager/Differences.tsx`.
- Tipos: `DifferenceStatus`, `Balance`, `AccountMovementSource` en `src/types.ts`.
- Helpers de estado/impacto: `cashDifferenceForBalance`, `bankDifferenceForBalance`, `balanceHasDifference`, `differenceIsPending`, `differenceActionImpact` y `normalizeDifferenceStatus` viven en `src/lib/differences.ts`.
- Periodo mensual compartido: `src/lib/periods.ts` y `src/components/MonthlyPeriodSelector.tsx`.
- Movimientos de diferencia: `differenceAccountMovement` y `syncDifferenceAccountMovements` viven en `src/lib/accountMovements.ts`.
- Estilos propietarios: `.differences-page`, `.difference-summary-surface`, `.difference-summary-grid`, `.difference-list-surface`, `.differences-period-bar`, `.difference-table`, `.difference-toolbar`, `.difference-detail-compact`, `.difference-detail-modal`, `.difference-correction-grid`, `.difference-history-*` en `src/styles/features/admin.css`; breakpoints en `src/styles/responsive.css`.

## Reglas criticas

- Diferencias no cambian resultado economico.
- Diferencias si mueven `Local / Efectivo` o `Local / Banco` para que la siguiente caja abra con saldo real declarado.
- `CORREGIDA` permite editar efectivo/banco declarado, recalcular diferencias y resincronizar movimientos.
- `ANULADA` anula movimientos de diferencia, deja la diferencia efectiva en cero y ajusta los campos de base de la recaudacion objetivo al valor esperado.
- Estados canónicos: `PENDIENTE`, `VERIFICADA`, `CORREGIDA` y `ANULADA`.
- Transiciones: `PENDIENTE -> VERIFICADA/CORREGIDA/ANULADA`; `VERIFICADA -> CORREGIDA/ANULADA`; `CORREGIDA -> CORREGIDA/ANULADA`; `ANULADA` es terminal.
- Estados heredados se migran al cargar: `REVISADA` a `VERIFICADA`, `AJUSTADA` a `CORREGIDA`; `RESUELTA` sin diferencia ni gestion deja de crear un control artificial.
- La pantalla es historial por periodo: mes anterior, mes actual o consulta historica por mes/ano.
- Debe incluir resueltas/corregidas aunque la diferencia actual sea cero.
- Error de observacion obligatoria aparece dentro del modal.
- Tabla principal ordenable por todas sus columnas visibles.
- El resumen superior representa todo el periodo; buscador y estado modifican solamente los resultados visibles de la tabla.
- El piloto visual usa una superficie compacta de cuatro metricas, tabla con encabezado claro y modal sin recuadros anidados.
- El comando valida tambien el alcance por local: un encargado no puede gestionar recaudaciones fuera de `user.localIds`; administrador conserva alcance global.
- Una correccion exige importes finitos de efectivo y banco. La interfaz pide reconfirmacion antes de verificar, corregir o anular.
- Un importe obligatorio vacio no se convierte en cero; la validacion queda dentro del modal.
- Al anular, el libro conserva los asientos originales y agrega contramovimientos activos para que el impacto neto quede en cero.
- No se gestiona si existe una caja abierta del mismo local. Una gestion historica no reescribe cajas posteriores ni sus fondos iniciales.
- Los ajustes son append-only, tienen ID unico, fecha de gestion y cadena `previousAdjustmentId`.
- El periodo usa `operatingDate`; el fallback heredado convierte `closedAt` a `America/Montevideo`.
- El historial acepta entidades actuales `BalanceDiario`/`DiferenciaCaja` y la entidad heredada `Caja`, para no ocultar cierres antiguos.

## Asociaciones

- Cierre crea diferencias y movimientos `DIFERENCIA_CAJA`.
- Cuentas corrientes muestran el impacto de diferencias.
- Resumen de cajas muestra diferencias y gestion.
- Auditoria conserva cierre, revision, correccion o anulacion.

## Pruebas manuales

1. Entrar como `encargado`.
2. Ir a `Diferencias`.
3. Cambiar entre mes actual, mes anterior y consulta historica por mes/ano.
4. Abrir una recaudacion con diferencia.
5. Intentar guardar sin observacion: el error debe aparecer en el modal.
6. Marcar `CORREGIDA`, cambiar efectivo/banco y guardar con observacion.
7. Verificar que la fila siga apareciendo aunque la diferencia quede en cero.
8. Abrir historial completo en el modal.
9. Revisar `Cuentas corrientes` para ver movimiento actualizado.
10. Abrir una caja del mismo local e intentar gestionar: debe mostrar el bloqueo dentro del modal.
11. Abrir `Auditoria` y comprobar saldos antes/despues, IDs de movimientos y cadena de ajuste.
12. Ejecutar `pnpm test` para validar estados y sincronizacion contable.
