# Poseidon - Modularizacion con referencias cruzadas

Ultima actualizacion: 2026-07-09

Este documento define como modularizar Poseidon sin romper asociaciones entre caja, diferencias, cuentas corrientes, salarios, auditoria, clientes, locales y maquinas.

## Regla principal

No mover un modulo sin dejar referencias a sus dependencias funcionales, contables, visuales y de auditoria.

Antes de extraer codigo, identificar:

- entradas de datos;
- salidas de datos;
- eventos de auditoria;
- movimientos de cuenta;
- pantallas que navegan hacia el modulo;
- documentos que deben quedar vinculados.

## Orden recomendado

1. Extraer utilidades puras sin cambiar comportamiento.
2. Extraer reglas contables y helpers de cuentas.
3. Extraer helpers de diferencias.
4. Extraer componentes de Diferencias.
5. Extraer componentes de Caja.
6. Extraer componentes de Cuentas corrientes.
7. Extraer Salarios.
8. Extraer administracion general.

## Estructura objetivo

```text
src/lib/
  money.ts
  dates.ts
  display.ts
  ids.ts
  machineHistory.ts
  audit.ts
  storage.ts
  sorting.ts
  currentAccounts.ts
  cashTotals.ts
  differences.ts
  salaryRules.ts
  validators.ts

src/components/
  ui.tsx

src/features/cashier/
  CashierWorkspace.tsx
  OpenCash.tsx
  ClosedBalanceSummary.tsx
  CloseCash.tsx
  Counters.tsx
  Expenses.tsx
  Transfers.tsx
  Gifts.tsx
  SalaryPayments.tsx
  CapitalMovements.tsx

src/features/manager/
  ManagerPanel.tsx
  Differences.tsx
  ManagerExpenses.tsx
  PeriodicClosures.tsx

src/features/accounts/
  CurrentAccounts.tsx
  accountMovements.ts
  accountTotals.ts

src/features/salaries/
  SalarySettlements.tsx
  SalarySettlementEditor.tsx
  salaryRules.ts
  salaryTotals.ts

src/features/admin/
  Locals.tsx
  Machines.tsx
  Workshop.tsx
  Clients.tsx
  Staff.tsx
  Users.tsx
  ExpenseCategories.tsx

src/features/audit/
  Audit.tsx
```

## Dependencias criticas

| Modulo | Depende de | Impacta en | Documentos |
| --- | --- | --- | --- |
| Caja diaria | maquinas, saldos local, usuarios | balances, readings, capital, auditoria | `CODEX_CAJA`, modulos 01/02/05 |
| Cierre de caja | contadores, movimientos, salarios, regalos, transferencias, cuentas | diferencias, saldos proximos, auditoria | `CODEX_CAJA`, `CODEX_DIFERENCIAS` |
| Diferencias | balances cerrados, cuentas, auditoria | saldos efectivo/banco, historial, resumen cajas | `CODEX_DIFERENCIAS`, modulos 06/11/12 |
| Cuentas corrientes | accountMovements, balances, usuarios | apertura de caja, detalle de movimientos | `CODEX_CUENTAS_CORRIENTES`, modulos 11 |
| Salarios | personal, caja, cuentas, periodo trabajado | caja, cuenta personal, liquidacion mensual | `CODEX_SALARIOS`, modulos 10/11 |
| Gastos | categorias, caja, cuentas, auditoria | resultado economico, efectivo local | modulos 04/07/11/12 |
| Regalos | clientes, caja, cuentas | resultado economico, efectivo local | modulos 04/10/11 |
| Transferencias | clientes, caja, banco local | cuenta banco, cuenta transferencias | modulos 04/11 |
| Locales/maquinas | taller, contadores, caja | readings, historial, cierre local | modulos 09/03 |
| Auditoria | todos los modulos | trazabilidad transversal | modulos 12 |

## Regla para AGENTS anidados

Cuando se creen carpetas `src/features/*`, cada grupo puede tener un `AGENTS.md` corto, pero debe referenciar los documentos compartidos. No duplicar reglas contables completas dentro de cada AGENTS.

Formato recomendado:

```text
Leer antes:
- docs/REGLAS_CONTABLES.md
- docs/REGLAS_VISUALES.md
- docs/contextos/CODEX_MODULO.md
- docs/modulos/XX_modulo.md

No tocar sin aprobacion:
- otros modulos asociados
- reglas contables globales
- auditoria
```

## Primeros cortes seguros

### Corte 1: utilidades puras

- `money.ts`: `money`, `counter`, `parseMoneyInput`, `formatMoneyInput`, helpers de input.
- `dates.ts`: `today`, `nowIso`, `formatDateTime`, `monthRange`.

Estado: implementado en `src/lib/money.ts` y `src/lib/dates.ts`.

Riesgo bajo porque no cambia reglas. Antes de modificar importes o fechas, revisar tambien `CODEX_CAJA`, `CODEX_CUENTAS_CORRIENTES` y `CODEX_SALARIOS`, porque esos modulos comparten formato de dinero, periodo trabajado y fechas de auditoria.

### Corte 2: cuentas corrientes

- `currentAccounts.ts`: ids de cuentas, creacion de cuentas, movimientos, totales.

Estado: implementado en dos archivos:

- `src/lib/currentAccounts.ts`: ids, creacion/asegurado de cuentas y saldos por cuenta.
- `src/lib/accountMovements.ts`: movimientos por origen, sincronizacion de movimientos y saldo corrido desde movimientos.

Riesgo medio porque caja, diferencias, salarios, gastos y transferencias dependen de esto. Cualquier nuevo helper debe conservar referencias a `CODEX_CAJA`, `CODEX_DIFERENCIAS`, `CODEX_CUENTAS_CORRIENTES` y `CODEX_SALARIOS`.

### Corte 3: diferencias

- `differences.ts`: diferencia efectivo/banco, estados, sync de movimientos.
- `Differences.tsx`: pantalla e historial.

Estado: implementado. Helpers en `src/lib/differences.ts`, sincronizacion contable en `src/lib/accountMovements.ts` y pantalla en `src/features/manager/Differences.tsx`.

Riesgo medio/alto porque impacta cuentas y cierre.

### Corte 4: totales de caja y salarios

- `cashTotals.ts`: `calcReading` y `totalsForBalance`.
- `salaryRules.ts`: conceptos, periodos, salario base, importes, validaciones.

Estado: implementado.

Riesgo medio porque caja, resumen, encargado, salarios y cierre periodico consumen estos calculos.

### Corte 5: apertura y resumen de caja

- `display.ts`: nombres visibles de local/usuario, rol e ID visible de recaudacion.
- `ids.ts`: generacion de IDs locales.
- `machineHistory.ts`: eventos de historial de maquinas.
- `OpenCash.tsx`: apertura de caja, saldos heredados/primer aporte y listado de ultimas cajas cerradas.
- `ClosedBalanceSummary.tsx`: resumen solo lectura de caja cerrada, salidas, movimientos financieros, diferencias y maquinas.
- `Counters.tsx`: carga manual de IN/OUT, validacion de contadores y resumen previo al guardado.
- `CloseCash.tsx`: cierre de caja, declaracion final, retiros finales, diferencias y sincronizacion de cuentas/maquinas.

Estado: implementado en `src/lib/display.ts`, `src/lib/ids.ts`, `src/lib/machineHistory.ts`, `src/features/cashier/OpenCash.tsx`, `src/features/cashier/ClosedBalanceSummary.tsx`, `src/features/cashier/Counters.tsx` y `src/features/cashier/CloseCash.tsx`.

Riesgo medio porque apertura y resumen dependen de saldos de cuentas, totales de caja, diferencias, usuarios y maquinas. Antes de modificar este corte revisar `CODEX_CAJA`, `CODEX_DIFERENCIAS` y `CODEX_CUENTAS_CORRIENTES`.

### Corte 6: storage y auditoria

- `storage.ts`: lectura, normalizacion, compactacion y persistencia local.
- `audit.ts`: construccion de eventos y helpers de usuario/funcion.

Estado: implementado en `src/lib/audit.ts` y `src/lib/storage.ts`.

Riesgo medio porque afecta arranque, demo, reset y trazabilidad.

### Corte 7: ordenamiento de tablas

- `sorting.ts`: estado de ordenamiento, comparador compartido y texto indicador de direccion.

Estado: implementado en `src/lib/sorting.ts`. Usado por `src/App.tsx` y `src/features/manager/Differences.tsx`; las proximas pantallas extraidas deben reutilizarlo para cumplir la regla de tablas ordenables.

Riesgo bajo/medio porque no cambia datos, pero afecta la consistencia visual y funcional de tablas.

### Corte 8: componentes UI compartidos

- `ui.tsx`: `InfoCard`, `FormButtons` y `Modal`.

Estado: implementado en `src/components/ui.tsx`. Usado por `src/App.tsx`; las proximas pantallas extraidas deben reutilizarlo para no duplicar tarjetas, botones basicos ni modales.

Riesgo bajo porque conserva clases CSS y estructura visual existente.

## Validacion por corte

Cada corte debe cerrar con:

- `pnpm run build`;
- `http://127.0.0.1:5173/` respondiendo;
- prueba manual del modulo movido;
- documentacion actualizada;
- sugerencia de commit local si el bloque queda estable.
