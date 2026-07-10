# Poseidon - Plan de mejora tecnica y ahorro de tokens

Ultima actualizacion: 2026-07-10

Este documento define como vamos a mejorar el sistema y, al mismo tiempo, bajar el consumo de tokens al trabajar con Codex.

## Objetivo

- Reducir el tamano efectivo de contexto que Codex necesita leer en cada tarea.
- Sacar logica y pantallas de `src/App.tsx` por cortes chicos y verificables.
- Mantener referencias cruzadas entre modulos para no romper caja, diferencias, cuentas, salarios, clientes, locales ni auditoria.
- Cerrar cada bloque estable con build, localhost y commit local cuando este validado.
- Con objetivo activo, ejecutar este plan con autonomia: implementar, validar, documentar y commitear bloques locales estables sin pedir permiso paso a paso.

## Reglas de trabajo para ahorrar tokens

1. Antes de tocar codigo, leer solo:
   - `docs/CONTEXTO_RAPIDO_CODEX.md`;
   - el contexto corto del modulo afectado en `docs/contextos/`;
   - el documento del modulo en `docs/modulos/`;
   - `docs/MODULARIZACION_REFERENCIAS.md` si se mueve codigo.
2. Evitar releer `src/App.tsx` completo. Buscar funciones concretas con `rg` y leer rangos chicos.
3. No mezclar modulos grandes en el mismo corte. Un corte debe tener una razon clara y validacion propia.
4. Todo cambio de regla, calculo, flujo o pantalla se documenta en el archivo correspondiente antes de cerrar.
5. Cuando un bloque queda estable, hacer commit local para no arrastrar diffs grandes entre sesiones.
6. No publicar, desplegar ni conectar servicios externos sin confirmacion explicita.

## Estado del refactor

Ya salieron de `src/App.tsx`:

- `src/types.ts`
- `src/lib/money.ts`
- `src/lib/dates.ts`
- `src/lib/display.ts`
- `src/lib/ids.ts`
- `src/lib/machineHistory.ts`
- `src/lib/audit.ts`
- `src/lib/clients.ts`
- `src/lib/export.ts`
- `src/lib/files.ts`
- `src/lib/people.ts`
- `src/lib/storage.ts`
- `src/lib/currentAccounts.ts`
- `src/lib/accountMovements.ts`
- `src/lib/cashTotals.ts`
- `src/lib/differences.ts`
- `src/lib/salaryRules.ts`
- `src/lib/sorting.ts`
- `src/data/appData.ts`
- `src/components/ui.tsx`
- `src/features/layout/AppShell.tsx`
- `src/features/dashboard/RoleDashboard.tsx`
- `src/features/accounts/CurrentAccounts.tsx`
- `src/features/manager/Differences.tsx`
- `src/features/cashier/OpenCash.tsx`
- `src/features/cashier/ClosedBalanceSummary.tsx`
- `src/features/cashier/Counters.tsx`
- `src/features/cashier/CloseCash.tsx`
- `src/features/cashier/Movements.tsx`
- `src/features/salaries/SalarySettlements.tsx`
- `src/features/admin/Clients.tsx`
- `src/features/admin/Staff.tsx`
- `src/features/admin/Settings.tsx`
- `src/features/admin/LocationsMachines.tsx`
- `src/features/manager/Expenses.tsx`
- `src/features/audit/Audit.tsx`
- `src/features/reports/Reports.tsx`
- `src/features/reports/Periodic.tsx`

## Cortes registrados

1. `src/lib/audit.ts`
   - Estado: iniciado/implementado para construccion centralizada de eventos.
   - Mantiene usuario real, rol real y funcion usada.
   - La pantalla `Audit` ya vive en `src/features/audit/Audit.tsx`.

2. `src/lib/storage.ts`
   - Estado: implementado para lectura/escritura de `localStorage`, compactacion, reset operativo y preferencias de columnas.
   - Mantener clave `poseidon-sistema-gestion-v2`.
   - Preparar futura migracion a Supabase sin activar Supabase todavia.

3. `src/lib/sorting.ts`
   - Estado: implementado para ordenamiento compartido de tablas.
   - Mantiene la regla general de ordenar por cada columna visible, salvo columnas de acciones.
   - Evita duplicar helpers en pantallas administrativas, encargado y futuras extracciones.

4. `src/components/ui.tsx`
   - Estado: implementado para tarjetas informativas, botones basicos de formulario, modales, selector de columnas y tipos compartidos de columnas.
   - Evita que cada modulo extraido copie el mismo markup visual o la misma logica base de columnas configurables.

5. `src/features/salaries/SalarySettlements.tsx`
   - Estado: implementado para liquidacion de salarios y detalle de empleado.
   - Mantener reglas de periodo trabajado, salario base, adelantos, descuentos y cierre mensual.
   - Referencias: `CODEX_SALARIOS`, modulos 10/11/12.

6. `src/features/admin/Clients.tsx`
   - Estado: implementado para clientes administrativos y editor compartido.
   - `CashierClients` ya vive con los movimientos operativos del cajero.
   - Mantener documento como identificador, foto/cedula como metadata local y papelera.

7. Movimientos de cajero
   - Estado: implementado en `src/features/cashier/Movements.tsx`.
   - Contiene gastos, transferencias, regalos, salarios, retiros/aportes, clientes desde cajero y tablas auxiliares.
   - Mantener impacto contable y auditoria en helpers compartidos.

8. Administracion general
   - Estado: clientes, personal, papelera, usuarios y categorias ya extraidos.
   - Extraer locales, maquinas, taller y administracion general restante.

9. `src/features/admin/Settings.tsx`
   - Estado: implementado para usuarios y categorias/subcategorias de gastos.
   - Mantiene tablas ordenables, selector de columnas para usuarios y auditoria de altas/cambios.
   - Referencias: `CODEX_ADMINISTRACION`, modulos 08/10/12.

10. `src/features/manager/Expenses.tsx`
   - Estado: implementado para control de gastos de encargado/admin.
   - Mantiene detalle modal, revision, observacion, anulacion auditada y ordenamiento por todas las columnas visibles de datos.
   - Referencias: `CODEX_ENCARGADO`, modulos 04/07/11/12.

11. `src/features/audit/Audit.tsx`
   - Estado: implementado para bitacora general.
   - Mantiene logs sinteticos de usuarios y ordenamiento por fecha, usuario, accion y entidad.
   - Referencias: `CODEX_AUDITORIA`, modulo 12.

12. `src/features/reports/Reports.tsx`
   - Estado: implementado para reportes iniciales y exportaciones.
   - `exportDailyExcel` vive en `src/lib/export.ts` junto con `exportCsv`.
   - Mantiene historial de cierres ordenable por columnas visibles de datos.
   - Referencias: modulos 07/08 y reglas de tablas ordenables.

13. `src/features/reports/Periodic.tsx`
   - Estado: implementado para cierres periodicos.
   - Mantiene generacion/anulacion auditada y tablas ordenables de cajas incluidas y cierres guardados.
   - Referencias: modulos 05/07/08/12 y reglas de tablas ordenables.

14. `src/features/admin/LocationsMachines.tsx`
   - Estado: implementado para Locales, Maquinas, Taller, editores, modales de historial y modales de maquinas asociadas.
   - Se mantuvo como un corte unico porque Locales, Maquinas y Taller comparten historial, asociaciones, cierres de local, maquinas en desuso, reset de contadores y auditoria.
   - Referencias: `CODEX_LOCALES_MAQUINAS`, modulos 03/05/09 y reglas de tablas ordenables.

15. `src/data/appData.ts`

   - Estado: implementado para datos demo, limpieza operativa, ID visible de recaudacion y normalizacion/migracion de datos locales.
   - Se mantiene separado porque esta logica cruza usuarios, locales, maquinas, caja, diferencias, cuentas corrientes, salarios, clientes, gastos y auditoria.
   - Referencias: `docs/CONTEXTO_RAPIDO_CODEX.md`, `docs/MAPA_TECNICO.md`, modulos 00/02/05/06/10/11/12.

## Pendientes despues del corte actual

- Mantener `src/App.tsx` como orquestador de estado/acciones y extraer solo nuevos bloques cuando haya una razon clara.
- Crear contextos cortos nuevos solo si aparece un modulo nuevo o un flujo que todavia no tenga contexto propio.
- Mantener commits locales por bloque estable para evitar diffs largos entre sesiones.
- Antes de nuevos cambios, leer `docs/CONTEXTO_RAPIDO_CODEX.md` y el contexto/modulo especifico en vez de releer toda la app.

## Validacion obligatoria por corte

- `pnpm run build`
- `http://127.0.0.1:5173/` responde `200`
- Documentacion actualizada
- `git status --short` revisado
- Commit local cuando el bloque quede estable

## Criterio de prioridad

Primero se extrajeron piezas que reducen mucho contexto y tienen reglas compartidas claras:

1. auditoria;
2. storage;
3. ordenamiento compartido;
4. componentes UI compartidos;
5. salarios;
6. clientes;
7. movimientos de cajero;
8. auditoria;
9. administracion;
10. datos demo y normalizacion.

Esto reduce costo porque cada nueva tarea deberia leer el contexto corto del modulo y 1-3 archivos concretos, no todo `App.tsx` ni todo el historial del chat. Si una tarea toca datos iniciales, migracion o reset operativo, abrir `src/data/appData.ts`; si toca acciones de usuario, abrir `src/App.tsx` mas el feature correspondiente.
