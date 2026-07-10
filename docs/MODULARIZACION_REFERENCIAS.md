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
  periods.ts
  balanceReferences.ts
  display.ts
  ids.ts
  machineHistory.ts
  audit.ts
  clients.ts
  export.ts
  files.ts
  people.ts
  storage.ts
  sorting.ts
  currentAccounts.ts
  cashTotals.ts
  differences.ts
  salaryRules.ts
  validators.ts

src/components/
  ui.tsx
  MonthlyPeriodSelector.tsx

src/data/
  appData.ts

src/features/layout/
  AppShell.tsx

src/features/dashboard/
  RoleDashboard.tsx

src/features/cashier/
  OpenCash.tsx
  ClosedBalanceSummary.tsx
  CloseCash.tsx
  Counters.tsx
  Movements.tsx

src/features/manager/
  ManagerPanel.tsx
  Differences.tsx
  Expenses.tsx
  PeriodicClosures.tsx

src/features/accounts/
  CurrentAccounts.tsx

src/features/salaries/
  SalarySettlements.tsx
  salaryRules.ts
  salaryTotals.ts

src/features/admin/
  LocationsMachines.tsx
  Clients.tsx
  Staff.tsx
  Settings.tsx

src/features/audit/
  Audit.tsx

src/features/reports/
  Reports.tsx
  Periodic.tsx
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

Cada carpeta `src/features/*` tiene o puede tener un `AGENTS.md` corto. Estos archivos son mapas de lectura para reducir contexto: deben referenciar documentos compartidos y no duplicar reglas contables completas.

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

Estado actual: agregados `AGENTS.md` cortos en `accounts`, `admin`, `audit`, `auth`, `cashier`, `dashboard`, `layout`, `manager`, `reports` y `salaries`. Cuando se cree una feature nueva, agregar su AGENTS local antes de empezar cambios relevantes.

## Primeros cortes seguros

### Corte transversal: periodos y referencias de recaudacion

- `periods.ts`: regla mensual comun, etiquetas, fin de mes y anos historicos.
- `MonthlyPeriodSelector.tsx`: control visual compartido por Cuentas corrientes, Diferencias y Salarios.
- `balanceReferences.ts`: resolucion y etiqueta de recaudaciones relacionadas por `balanceId`.

Estado: implementado. Las referencias cruzadas se conservan en los contextos de Cuentas corrientes, Diferencias y Salarios.

Riesgo bajo/medio: no cambia calculos economicos, pero cualquier cambio afecta tres pantallas y debe cerrar con pruebas de periodos y navegacion.

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

### Corte 9: liquidacion de salarios

- `SalarySettlements.tsx`: pantalla de liquidacion, detalle de empleado, cuenta corriente personal y editor de liquidaciones.
- `export.ts`: descarga y CSV compartido para exportaciones.
- `people.ts`: nombre visible de personal.

Estado: implementado en `src/features/salaries/SalarySettlements.tsx`, `src/lib/export.ts` y `src/lib/people.ts`.

Riesgo medio/alto porque salarios cruza personal, caja, cuentas corrientes, auditoria y cierres de liquidacion. Antes de modificar revisar `CODEX_SALARIOS`, modulos 10/11 y reglas contables.

### Corte 10: clientes administrativos

- `Clients.tsx`: `AdminClients` y `ClientEditor`.
- `clients.ts`: documento, busqueda y duplicados.
- `files.ts`: metadatos locales de archivos.
- `ids.ts`: IDs cortos compartidos.

Estado: implementado en `src/features/admin/Clients.tsx`, `src/lib/clients.ts`, `src/lib/files.ts` y `src/lib/ids.ts`.

Riesgo medio porque clientes se usan en regalos, transferencias y papelera.

### Corte 11: movimientos operativos del cajero

- `Movements.tsx`: gastos, transferencias, regalos, pagos de salarios, retiros/aportes, clientes desde caja y tablas auxiliares.

Estado: implementado en `src/features/cashier/Movements.tsx`.

Riesgo medio/alto porque impacta caja abierta, cuentas corrientes, salarios, regalos, transferencias, clientes y auditoria. Antes de modificar revisar `CODEX_CAJA`, `CODEX_CUENTAS_CORRIENTES`, `CODEX_CLIENTES_PERSONAL`, `CODEX_SALARIOS` y modulo 04.

### Corte 12: personal y papelera

- `Staff.tsx`: `AdminStaff`, `StaffEditor` y `AdminTrash`.
- `people.ts`: nombre visible e historial salarial.

Estado: implementado en `src/features/admin/Staff.tsx` y `src/lib/people.ts`.

Riesgo medio/alto porque personal se usa en salarios, pagos desde caja, historial salarial, papelera y auditoria. Antes de modificar revisar `CODEX_CLIENTES_PERSONAL`, `CODEX_SALARIOS` y modulo 10.

### Corte 13: usuarios y categorias de gastos

- `Settings.tsx`: `AdminUsers` y `AdminExpenseCategories`.
- `ui.tsx`: `ColumnChooser` y `TableColumn` compartidos para tablas configurables.

Estado: implementado en `src/features/admin/Settings.tsx` y `src/components/ui.tsx`.

Riesgo medio porque usuarios impactan permisos/auditoria y categorias de gastos impactan carga de gastos desde cajero y revision por encargado. Antes de modificar revisar `CODEX_ADMINISTRACION`, modulo 08, modulo 04 y modulo 12.

### Corte 14: control de gastos del encargado

- `Expenses.tsx`: `ManagerExpenses`.

Estado: implementado en `src/features/manager/Expenses.tsx`.

Riesgo medio porque revisar/anular gastos impacta caja, cuentas corrientes, auditoria y reportes. La tabla queda ordenable por fecha, caja, local, categoria, subcategoria, descripcion, comprobante, monto, usuario, estado y revision. Antes de modificar revisar `CODEX_ENCARGADO`, modulo 04, modulo 07, modulo 11 y modulo 12.

### Corte 15: pantalla de auditoria

- `Audit.tsx`: bitacora general y logs sinteticos de usuarios.

Estado: implementado en `src/features/audit/Audit.tsx`.

Riesgo bajo/medio porque es principalmente lectura, pero depende de que todos los modulos registren usuario real, rol real y funcion usada. La tabla queda ordenable por fecha/hora, usuario, accion y entidad. Antes de modificar revisar `CODEX_AUDITORIA` y modulo 12.

### Corte 16: reportes iniciales

- `Reports.tsx`: tarjetas de exportacion e historial de cierres.
- `export.ts`: `exportDailyExcel` compartido junto con `exportCsv`.

Estado: implementado en `src/features/reports/Reports.tsx` y `src/lib/export.ts`.

Riesgo medio porque los reportes leen caja, maquinas, diferencias y exportaciones. La tabla de historial de cierres queda ordenable por ID, fecha, estado, efectivo esperado, declarado y diferencias. Antes de modificar revisar modulos 02/05/07/08 y reglas de tablas ordenables.

### Corte 17: cierres periodicos

- `Periodic.tsx`: cierre semanal, quincenal, mensual o por fechas.

Estado: implementado en `src/features/reports/Periodic.tsx`.

Riesgo medio/alto porque consolida cajas cerradas, diferencias, retiros/aportes, salidas y auditoria. Las tablas de cajas incluidas y cierres guardados quedan ordenables por columnas visibles de datos. Antes de modificar revisar modulos 05/07/08/12 y reglas contables.

### Corte 18: locales, maquinas y taller

- `LocationsMachines.tsx`: `AdminLocals`, `AdminMachines`, editores, selector de maquinas del Taller, modales de historial y modales de maquinas asociadas.

Estado: implementado en `src/features/admin/LocationsMachines.tsx`.

Riesgo medio/alto porque locales y maquinas alimentan caja, contadores, reset, cierre de local, maquinas en desuso, cuentas corrientes indirectas e historial. Se mantuvo como modulo consolidado para conservar referencias entre Locales, Maquinas y Taller. Antes de modificar revisar `CODEX_LOCALES_MAQUINAS`, modulos 03/05/09 y reglas de tablas ordenables.

### Corte 19: layout base y navegacion

- `AppShell.tsx`: pantalla inicial, login local, layout lateral de encargado/admin, layout del cajero, estado vacio operativo, grupos de menu por rol y titulos de pantalla.

Estado: implementado en `src/features/layout/AppShell.tsx`.

Riesgo medio porque concentra navegacion, rol efectivo, cambio a funcion Cajero y estructura visual base. No cambia reglas contables. Antes de modificar revisar `CODEX_LAYOUT_BASE`, modulos 00/01/07/08 y reglas visuales.

### Corte 20: cuentas corrientes

- `CurrentAccounts.tsx`: pantalla de cuentas corrientes, filtro de periodo, selector de cuentas, tabla de movimientos, saldo corrido y modal de detalle/recaudacion asociada.

Estado: implementado en `src/features/accounts/CurrentAccounts.tsx`.

Riesgo medio porque la pantalla lee movimientos de caja, diferencias, transferencias, salarios, retiros/aportes y saldos por cuenta. La tabla de movimientos queda ordenable por fecha, tipo, detalle, usuario, debito, credito y saldo. Antes de modificar revisar `CODEX_CUENTAS_CORRIENTES`, reglas contables y modulo 11.

### Corte 21: paneles iniciales por rol

- `RoleDashboard.tsx`: panel inicial de administrador, encargado y cajero, junto con las tarjetas de acceso rapido.

Estado: implementado en `src/features/dashboard/RoleDashboard.tsx`.

Riesgo medio porque el panel cruza caja abierta, diferencias, cuentas corrientes, resultado mensual, accesos por rol y reinicio demo. Antes de modificar revisar `CODEX_LAYOUT_BASE`, `CODEX_CAJA`, `CODEX_ENCARGADO`, modulos 01/07/08 y reglas visuales.

### Corte 22: datos demo y normalizacion

- `appData.ts`: datos iniciales, limpieza operativa, ID visible de caja y normalizacion/migracion de datos locales.

Estado: implementado en `src/data/appData.ts`.

Riesgo medio/alto porque normaliza datos de `localStorage` y cruza locales, maquinas, caja, diferencias, cuentas corrientes, salarios, clientes, gastos, transferencias, regalos, retiros/aportes y auditoria. Antes de modificar revisar `docs/CONTEXTO_RAPIDO_CODEX.md`, `docs/MAPA_TECNICO.md`, modulos 00/02/05/06/10/11/12 y reglas contables si cambia algun impacto economico o financiero.

## Validacion por corte

Cada corte debe cerrar con:

- `pnpm test`;
- `pnpm run build`;
- `http://127.0.0.1:5173/` respondiendo;
- prueba manual del modulo movido;
- documentacion actualizada;
- sugerencia de commit local si el bloque queda estable.
