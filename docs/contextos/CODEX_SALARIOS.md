# Contexto Codex - Salarios

Ultima actualizacion: 2026-07-26

Leer junto con `docs/REGLAS_CONTABLES.md` y `docs/modulos/10_clientes_personal_sueldos.md`.

## Codigo

- Resumen y detalle: `src/features/salaries/SalarySettlements.tsx`.
- Editor: `src/features/salaries/SalarySettlementEditor.tsx`.
- Cajero: `CashierSalaryPayments` en `src/features/cashier/Movements.tsx`.
- Comandos: `src/application/salaries/salarySettlementCommands.ts` y `salaryClosureCommands.ts`.
- Reglas: `src/lib/salaryRules.ts` y `src/lib/salaryClosures.ts`.
- Asientos: `salaryAccountMovement` y `localSalaryAccountMovement`.

## Reglas

- Periodo trabajado usa `AAAA-MM`.
- Del 1 al 10 se sugiere mes anterior; desde el 11, mes actual.
- Cajero solo registra Salario o Adelanto y paga desde `Caja / Efectivo` con caja abierta.
- Encargado/Admin usan la lista completa y pagan desde `Principal / Efectivo` o `Principal / Banco`.
- Cada comando valida rol real, funcion activa, usuario activo y local del empleado; Administrador conserva alcance global y Encargado solo sus locales.
- Un pago de Caja exige que la caja abierta y el empleado pertenezcan al mismo local.
- Corregir una liquidacion existente no permite reasignarla a otro empleado ni a otro local.
- El origen Caja/Principal y la recaudacion de una liquidacion existente son inmutables.
- Una liquidacion administrativa no lleva `balanceId` y no modifica efectivo esperado.
- Descuento no mueve dinero y la interfaz muestra `No mueve fondos`.
- `EXTRA` es codigo interno; la interfaz dice `Premio / Gratificacion`.
- Salario no supera base; salario + adelantos tampoco; salario + adelantos + descuentos tampoco.
- Correccion sobre la misma cuenta valida solo incremento neto. Cambio de cuenta valida todo el importe nuevo.
- Anular agrega reversos y conserva el original.
- Un pago originado en Caja no se anula despues de cerrar su recaudacion, aunque la accion se intente desde la liquidacion administrativa.

## Periodos y resultado

- La cuenta personal se filtra por periodo trabajado.
- En consolidado mensual, salarios de Principal se imputan por `period`.
- En rangos semanales, quincenales o personalizados se imputan por fecha de movimiento para no duplicarlos.
- El cierre salarial mensual congela base, conceptos, pagado, cubierto y pendiente por empleado.
- Cerrar o corregir una foto salarial exige acceso a todos los locales incluidos en sus snapshots por empleado.
- Un periodo cerrado solo cambia mediante revision correctiva enlazada; la foto anterior no se reescribe.
- No se cierra un periodo con pagos de Caja ligados a una caja abierta.

## Auditoria y tablas

- Toda alta, correccion y anulacion guarda usuario real, rol, funcion, fecha, local, cuenta de pago y periodo.
- Las tablas de liquidaciones y cuenta del empleado son ordenables en todas sus columnas de datos.
- La cuenta de pago aparece en detalle; Descuento se identifica como no monetario.

## Validacion

1. Pago Cajero desde Caja.
2. Pago Encargado desde ambos medios de Principal.
3. Exceso de fondos y suplantacion de funcion sin mutacion.
4. Limites de salario/adelanto/descuento.
5. Correccion neta, cambio de cuenta y anulacion.
6. Cierre mensual, revision correctiva e inmutabilidad.
7. Consolidado mensual con salario de Principal sin `balanceId`.
