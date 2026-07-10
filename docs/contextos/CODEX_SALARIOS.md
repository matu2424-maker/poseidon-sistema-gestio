# Contexto Codex - Salarios

Ultima actualizacion: 2026-07-10

Leer este contexto antes de modificar personal, pago de salarios, liquidacion de salarios o cuenta corriente del empleado. Referencias asociadas:

- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/10_clientes_personal_sueldos.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/modulos/04_movimientos_operativos.md`
- `docs/contextos/CODEX_CAJA.md`

## Codigo actual

- Pantalla principal: `AdminSalarySettlements` en `src/features/salaries/SalarySettlements.tsx`.
- Editor: `SalarySettlementEditor` en `src/features/salaries/SalarySettlements.tsx`.
- Cajero: `CashierSalaryPayments` en `src/features/cashier/Movements.tsx`.
- Reglas salariales: `salaryBaseForPeriod`, `salaryConceptBreakdown`, `salarySettlementAmount`, `validateSalarySettlementLimit` y periodos viven en `src/lib/salaryRules.ts`.
- Selector mensual y etiquetas comunes: `src/lib/periods.ts` y `src/components/MonthlyPeriodSelector.tsx`.
- Referencia de la recaudacion asociada por `balanceId`: `src/lib/balanceReferences.ts`.
- Movimientos contables: `salaryAccountMovement` y `localSalaryAccountMovement` viven en `src/lib/accountMovements.ts`.
- Tipos: `StaffMember`, `SalarySettlement`, `SalaryConcept`, `SalaryClosure`, `SalaryHistory`.

## Reglas criticas

- Periodo trabajado manda, no fecha de pago.
- Del dia 1 al 10 se sugiere mes anterior; desde el 11, mes actual.
- Cajero solo carga `SALARIO` y `ADELANTO`.
- Encargado/admin pueden cargar lista completa.
- `SUELDO` y `AJUSTE` son heredados; `AJUSTE` se normaliza como `EXTRA`.
- En interfaz, `EXTRA` se muestra como `Premio / Gratificacion`.
- Salario pagado no puede superar salario base.
- Salario pagado + adelantos no puede superar salario base.
- Salario pagado + adelantos + descuentos no puede superar salario base.
- Descuento no es salida de caja.
- Eliminar es anulacion logica.

## Asociaciones

- Pago desde caja sale de caja por `balanceId`.
- Cuenta personal se filtra por `period`.
- Liquidacion mensual usa salario base vigente desde historial salarial.
- Cierre de liquidacion es foto auditada, no borra movimientos.
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
9. Ejecutar `pnpm test` para validar limites salariales.
