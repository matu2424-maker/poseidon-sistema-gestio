# Poseidon - Plan de mejora tecnica y ahorro de tokens

Ultima actualizacion: 2026-07-09

Este documento define como vamos a mejorar el sistema y, al mismo tiempo, bajar el consumo de tokens al trabajar con Codex.

## Objetivo

- Reducir el tamano efectivo de contexto que Codex necesita leer en cada tarea.
- Sacar logica y pantallas de `src/App.tsx` por cortes chicos y verificables.
- Mantener referencias cruzadas entre modulos para no romper caja, diferencias, cuentas, salarios, clientes, locales ni auditoria.
- Cerrar cada bloque estable con build, localhost y commit local sugerido o ejecutado con autorizacion.

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
- `src/lib/storage.ts`
- `src/lib/currentAccounts.ts`
- `src/lib/accountMovements.ts`
- `src/lib/cashTotals.ts`
- `src/lib/differences.ts`
- `src/lib/salaryRules.ts`
- `src/lib/sorting.ts`
- `src/features/manager/Differences.tsx`
- `src/features/cashier/OpenCash.tsx`
- `src/features/cashier/ClosedBalanceSummary.tsx`
- `src/features/cashier/Counters.tsx`
- `src/features/cashier/CloseCash.tsx`

## Proximos cortes recomendados

1. `src/lib/audit.ts`
   - Estado: iniciado/implementado para construccion centralizada de eventos.
   - Mantiene usuario real, rol real y funcion usada.
   - Queda pendiente extraer la pantalla `Audit` cuando se aborde administracion/auditoria.

2. `src/lib/storage.ts`
   - Estado: implementado para lectura/escritura de `localStorage`, compactacion, reset operativo y preferencias de columnas.
   - Mantener clave `poseidon-sistema-gestion-v2`.
   - Preparar futura migracion a Supabase sin activar Supabase todavia.

3. `src/lib/sorting.ts`
   - Estado: implementado para ordenamiento compartido de tablas.
   - Mantiene la regla general de ordenar por cada columna visible, salvo columnas de acciones.
   - Evita duplicar helpers en pantallas administrativas, encargado y futuras extracciones.

4. `src/features/salaries/SalarySettlements.tsx`
   - Extraer liquidacion de salarios y detalle de empleado.
   - Mantener reglas de periodo trabajado, salario base, adelantos, descuentos y cierre mensual.
   - Referencias: `CODEX_SALARIOS`, modulos 10/11/12.

5. `src/features/admin/Clients.tsx`
   - Extraer clientes admin y clientes cajero cuando convenga.
   - Mantener documento como identificador, foto/cedula como metadata local y papelera.

6. Movimientos de cajero
   - Extraer gastos, transferencias, regalos, salarios, retiros/aportes y tablas auxiliares.
   - Mantener impacto contable y auditoria en helpers compartidos.

7. Administracion general
   - Extraer locales, maquinas, taller, personal, usuarios, categorias, auditoria y cierres periodicos.

## Validacion obligatoria por corte

- `pnpm run build`
- `http://127.0.0.1:5173/` responde `200`
- Documentacion actualizada
- `git status --short` revisado
- Commit local cuando el bloque quede estable

## Criterio de prioridad

Primero se extraen piezas que reducen mucho contexto y tienen reglas compartidas claras:

1. auditoria;
2. storage;
3. ordenamiento compartido;
4. salarios;
5. clientes;
6. movimientos de cajero;
7. administracion.

Esto deberia reducir el costo porque cada nueva tarea podra leer el contexto corto del modulo y 1-3 archivos concretos, no todo `App.tsx` ni todo el historial del chat.
