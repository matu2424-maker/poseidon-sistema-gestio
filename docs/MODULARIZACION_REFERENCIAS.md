# Poseidon - Modularizacion y referencias cruzadas

Ultima actualizacion: 2026-07-10

Fuente canonica del metodo para dividir o mover codigo sin romper asociaciones funcionales, contables, visuales o de auditoria. Git conserva los cortes ya completados; este documento describe el estado y los proximos cortes.

## Regla principal

Antes de mover una pieza identificar:

- entradas y salidas de datos;
- invariantes y validaciones;
- movimientos de cuenta;
- auditoria;
- permisos/rol/local;
- pantallas que la consumen;
- pruebas y documentos afectados.

Mover codigo no autoriza cambiar comportamiento.

## Capas actuales

```text
src/App.tsx              orquestacion
src/application/         comandos multi-entidad probables
src/types.ts             tipos compartidos
src/data/                seed y normalizacion
src/infrastructure/      adaptadores de persistencia local
src/lib/                 reglas/helpers puros o compartidos
src/components/          UI transversal
src/features/*           pantallas por dominio
src/styles/              estilos
```

## Criterio de ubicacion

- Regla sin React: `src/lib` o futuro `src/domain`.
- Operacion de negocio que coordina entidades: futuro `src/application`.
- UI usada por varias features: `src/components`.
- UI propia de un modulo: carpeta de su feature.
- Seed/migracion: `src/data`, separando datos demo de normalizadores.
- Persistencia: `src/infrastructure`; el adaptador actual es local y versionado.

Evitar archivos `index.ts` generales que oculten ciclos. Preferir imports explicitos.

## Dependencias que deben conservarse

| Modulo | Asociaciones |
| --- | --- |
| Caja | maquinas, lecturas, movimientos, cuentas, diferencias, auditoria |
| Diferencias | balance cerrado, efectivo/banco declarado, movimientos de cuenta, auditoria |
| Cuentas | origen operativo, `balanceId`, cuenta, usuario y estado |
| Salarios | personal, periodo trabajado, caja opcional, cuenta personal/local, auditoria |
| Locales/maquinas | taller, caja abierta, recaudaciones, contadores, historial |
| Gastos/regalos | caja, cuenta local, resultado economico, cliente/categoria, auditoria |
| Transferencias/capital | caja, cuenta banco/efectivo, cuentas corrientes, auditoria |
| Clientes/personal | papelera, movimientos relacionados, archivos y auditoria |

## AGENTS anidados

- Cada `src/features/*/AGENTS.md` es un mapa de lectura corto.
- Debe enlazar reglas compartidas y modulo, no copiarlos.
- Una feature nueva recibe su `AGENTS.md` antes de crecer.
- Si un corte cruza features, leer los `AGENTS.md` de ambos lados.

## Componentes transversales actuales

- `ui.tsx`: tarjetas, botones, modales y selector de columnas.
- `MonthlyPeriodSelector.tsx`: periodos mensuales.
- `balanceReferences.ts`: referencia de recaudacion por `balanceId`.
- `sorting.ts`: ordenamiento.
- `display.ts`: nombres e IDs visibles.

Duplicaciones pendientes:

- `Differences.tsx` conserva presentacion/nombres locales ya disponibles en helpers compartidos.
- `Counters.tsx` conserva una tarjeta informativa local.
- Confirmacion con `window.confirm` se repite en varias features.
- `ClosedBalanceSummary` y `ClientEditor` son usados entre features y deberian evaluarse como UI compartida.

## Proximos cortes recomendados

### Corte A - Higiene transversal

- Reutilizar UI/presentacion existente.
- Completado: confirmacion centralizada sin cambiar flujo.
- Completado: eliminado `WelcomeScreen.tsx` y estados de pantalla heredados despues de confirmar ausencia de usos.
- Fecha local y timestamps historicos ya tienen pruebas.
- `pnpm check` ya ejecuta typecheck y pruebas; queda agregar lint gradual.

Riesgo: bajo/medio.

### Corte B - Locales, maquinas y taller

Dividir `features/admin/LocationsMachines.tsx` en:

```text
features/admin/locations/Locals.tsx
features/admin/locations/LocalEditor.tsx
features/admin/locations/LocalHistoryModal.tsx
features/admin/machines/Machines.tsx
features/admin/machines/MachineEditor.tsx
features/admin/machines/MachineHistoryModal.tsx
features/admin/workshop/WorkshopMachinePicker.tsx
```

Estado: editores, historiales y helpers estan separados en `features/admin/locationsMachines/`. Las tablas y modales de asociacion permanecen en la fachada; alta/edicion/cierre/baja, reset, traslado y asignacion delegan en comandos probados de `application/locations/` y `application/machines/`.

Riesgo: alto por caja, taller, historial y contadores.

### Corte C - Movimientos del cajero

Estado completado para negocio: `CashierClients`, `CashierSalaryPayments` y `MovementTable` estan separados, y gastos, transferencias, regalos y capital delegan altas/anulaciones en `application/movements/operatingMovementCommands.ts`. La fachada conserva la composicion de formularios y tablas.

Riesgo: alto por impactos contables y anulaciones.

### Corte D - Liquidacion salarial

Estado parcial: `SalarySettlementEditor.tsx` ya separa la escritura. Permanecen juntos pantalla, detalle, cuentas y cierres para evitar duplicar el estado del periodo seleccionado.

Riesgo: alto.

### Corte E - Datos y persistencia

```text
data/seed/
data/normalizers/
data/migrations/
infrastructure/storage/localAppDataRepository.ts
```

El snapshot versionado y el repositorio local ya existen. `application/ports/AppDataRepository.ts` define el contrato asincrono; `hooks/useAppDataRepository.ts` hidrata y serializa escrituras; `infrastructure/storage/localAppDataRepository.ts` es el adaptador activo. `data/normalizeData.ts` separa normalizacion/migracion de `appData.ts`; falta dividir el seed demo y agregar migraciones incrementales cuando cambie el esquema.

Riesgo: muy alto; puede afectar datos existentes.

### Corte F - Comandos de dominio

Completados con contexto inyectable y pruebas:

- apertura;
- contadores;
- cierre;
- diferencias;
- alta/correccion/anulacion salarial.

Pendientes de extraer uno por vez:

- completado: movimientos operativos;
- completado: locales/maquinas.

Cada comando debe ser puro o recibir explícitamente reloj/ID, devolver error tipado y aplicar auditoria/movimientos de manera consistente.

## Regla para pruebas

- Primero caracterizar comportamiento actual.
- Probar helpers/comando antes de cambiar import en la pantalla.
- Probar caso valido, validacion, anulacion y auditoria.
- En reglas contables, verificar saldos e impactos completos.
- En tablas modificadas, verificar orden por columnas visibles.

## Validacion de cada corte

```text
pnpm test
pnpm run build
http://127.0.0.1:5173/ -> 200
prueba manual del rol afectado
git diff --check
documentacion actualizada
```

Cerrar commit local por corte estable. No mezclar un movimiento mecanico con una nueva regla funcional en el mismo commit.

## Referencias

- Dependencias actuales: `docs/MAPA_TECNICO.md`.
- Prioridades: `docs/PLAN_MEJORA_TECNICA_Y_TOKENS.md`.
- Reglas contables: `docs/REGLAS_CONTABLES.md`.
- Arquitectura futura: `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`.
