# Contexto Codex - Salarios

Ultima actualizacion: 2026-07-16

Leer este contexto antes de modificar personal, pago de salarios, liquidacion de salarios o cuenta corriente del empleado. Referencias asociadas:

- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/10_clientes_personal_sueldos.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/modulos/04_movimientos_operativos.md`
- `docs/contextos/CODEX_CAJERO.md`
- `docs/contextos/CODEX_NUCLEO_CAJA.md`

## Codigo actual

- Pantalla principal: `AdminSalarySettlements` en `src/features/salaries/SalarySettlements.tsx`.
- Editor: `SalarySettlementEditor` en `src/features/salaries/SalarySettlementEditor.tsx`.
- Cajero: `CashierSalaryPayments` en `src/features/cashier/Movements.tsx`.
- Reglas salariales: `salaryBaseForPeriod`, `salaryConceptBreakdown`, `salarySettlementAmount`, `validateSalarySettlementLimit` y periodos viven en `src/lib/salaryRules.ts`.
- Selector mensual y etiquetas comunes: `src/lib/periods.ts` y `src/components/MonthlyPeriodSelector.tsx`.
- Referencia de la recaudacion asociada por `balanceId`: `src/lib/balanceReferences.ts`.
- Movimientos contables: `salaryAccountMovement` y `localSalaryAccountMovement` viven en `src/lib/accountMovements.ts`.
- Resumen y bloqueo por periodo: `src/lib/salaryClosures.ts`.
- Cierre ordinario, apertura/cierre/cancelacion correctiva: `src/application/salaries/salaryClosureCommands.ts`.
- Tipos: `StaffMember`, `SalarySettlement`, `SalaryConcept`, `SalaryClosure`, `SalaryHistory`.

## Reglas criticas

- Periodo trabajado manda, no fecha de pago.
- Periodo trabajado acepta solo `AAAA-MM` con mes real entre `01` y `12`.
- Del dia 1 al 10 se sugiere mes anterior; desde el 11, mes actual.
- Cajero solo carga `SALARIO` y `ADELANTO`.
- Encargado/admin pueden cargar lista completa.
- `SUELDO` y `AJUSTE` son heredados; `AJUSTE` se normaliza como `EXTRA`.
- En interfaz, `EXTRA` se muestra como `Premio / Gratificacion`.
- Salario pagado no puede superar salario base.
- Salario pagado + adelantos no puede superar salario base.
- Salario pagado + adelantos + descuentos no puede superar salario base.
- Descuento no es salida de caja.
- Si el local tiene caja abierta, toda liquidacion con entrega de efectivo debe asociarse a esa caja y mantener conciliados `efectivo esperado` y `Local / Efectivo`.
- No se corrige, anula ni reasigna a la caja actual un pago en efectivo de una recaudacion historica mientras otra caja esta abierta. La operacion se hace sin caja abierta o mediante el flujo correcto del periodo, conservando auditoria.
- Eliminar es anulacion logica.
- Un periodo cerrado no admite operaciones salariales ordinarias, incluso desde caja.
- La correccion exige revision abierta, motivo y enlace al ultimo cierre del periodo.

## Asociaciones

- Pago desde caja sale de caja por `balanceId`.
- Cuenta personal se filtra por `period`.
- Liquidacion mensual usa salario base vigente desde historial salarial.
- El cierre definitivo guarda una foto versionada por empleado, incluidos importes, conceptos y liquidaciones activas.
- El cierre ordinario es revision 0. Cada correccion cerrada crea R1, R2 y siguientes, enlazada mediante `parentClosureId`.
- El original nunca se reescribe. Las operaciones correctivas guardan `correctionClosureId` o `annulledInCorrectionClosureId`.
- Los cierres historicos anteriores al esquema 3 conservan totales e IDs con `snapshotVersion: 0`; no se inventa un desglose inexistente.
- Historial de cierres de liquidacion es tabla ordenable por todas sus columnas de datos.
- Auditoria guarda usuario real.
- Desde el detalle de un movimiento con `balanceId` se puede abrir la recaudacion completa asociada.

## Pruebas manuales

1. Entrar como `encargado`.
2. Ir a `Liquidacion de salarios`.
3. Cambiar mes anterior/actual/consulta.
4. Abrir detalle de empleado.
5. Agregar salario o adelanto.
6. Ver cuenta corriente del empleado.
7. Intentar superar salario base y confirmar error.
8. Anular una liquidacion y verificar que deja de impactar.
9. Cerrar el periodo y confirmar que alta, edicion y anulacion quedan bloqueadas.
10. Abrir ajuste correctivo con motivo, registrar un cambio y cerrar la revision.
11. Abrir las fotos original y correctiva y comprobar que la original no cambio.
12. Ejecutar `pnpm test` para validar limites y cierres salariales.
