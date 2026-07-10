# Poseidon - Mapa tecnico

Ultima actualizacion: 2026-07-10

Fuente canonica de propiedad de archivos, capas, dependencias y deuda tecnica. No contiene reglas funcionales completas; consultar `docs/POSEIDON_FUNCIONAMIENTO.md` y `docs/modulos/`.

## Stack y ejecucion

- React 19, TypeScript estricto y Vite.
- CSS global.
- Persistencia local con `localStorage`.
- Vitest para pruebas puras.
- Entrada: `src/main.tsx` -> `src/App.tsx`.
- Servidor: `iniciar-poseidon.bat` en `http://127.0.0.1:5173/`.

## Flujo principal

```text
main.tsx
  -> App.tsx (estado AppData, usuario, rol efectivo, pantalla)
     -> layout y panel por rol
     -> feature activa
        -> helpers puros de src/lib
        -> patchData(AppData)
        -> auditoria
     -> storage.ts persiste snapshot local
```

## Estructura y propiedad

```text
src/
  App.tsx                  orquestacion global y composicion
  types.ts                 tipos de dominio actuales
  data/appData.ts          seed, reset y normalizacion local
  lib/                     reglas y helpers compartidos
  components/              UI reutilizable transversal
  features/
    layout/                bienvenida, login, shell y menus
    dashboard/             paneles iniciales por rol
    cashier/               apertura, movimientos, contadores y cierre
    manager/               diferencias y control de gastos
    accounts/              cuentas corrientes
    salaries/              liquidacion salarial
    admin/                 locales, maquinas, personal, clientes y ajustes
    audit/                 bitacora
    reports/               reportes y cierres periodicos
  styles/global.css        estilos actuales
```

## Librerias internas

| Archivo | Responsabilidad |
| --- | --- |
| `money.ts` | Formato y entrada de importes/contadores |
| `dates.ts` | Fecha/hora actual y rangos base |
| `periods.ts` | Periodos mensuales y etiquetas |
| `display.ts` | Nombres, roles e IDs visibles |
| `ids.ts` | IDs locales actuales |
| `audit.ts` | Construccion de eventos de auditoria |
| `storage.ts` | Snapshot local y preferencias de columnas |
| `currentAccounts.ts` | IDs, creacion y saldos de cuentas |
| `accountMovements.ts` | Movimientos derivados, sincronizacion y saldo corrido |
| `cashTotals.ts` | Totales por caja y resultado de lecturas |
| `differences.ts` | Estados y calculos de diferencias |
| `salaryRules.ts` | Conceptos, base, periodos y limites salariales |
| `balanceReferences.ts` | Recaudacion asociada por `balanceId` |
| `sorting.ts` | Ordenamiento compartido de tablas |
| `clients.ts`, `people.ts` | Reglas de clientes y personal |
| `files.ts`, `export.ts` | Metadata local y exportaciones |
| `machineHistory.ts` | Eventos de historial de maquinas |

## Componentes compartidos

- `components/ui.tsx`: `InfoCard`, `FormButtons`, `Modal`, `ColumnChooser`.
- `components/MonthlyPeriodSelector.tsx`: selector mensual comun.
- `components/WelcomeScreen.tsx`: heredado y sin uso; candidato a eliminar.

## Dependencias criticas

| Modulo | Lee | Produce o modifica | Referencias obligatorias |
| --- | --- | --- | --- |
| Caja | locales, maquinas, cuentas, usuarios | balances, readings, movimientos, auditoria | `CODEX_CAJA`, modulos 01/02/05 |
| Diferencias | balances, cuentas, auditoria | declarados, estados, movimientos de cuenta | `CODEX_DIFERENCIAS`, modulos 06/11/12 |
| Cuentas | cuentas, movimientos, balances | vistas y saldo corrido | `CODEX_CUENTAS_CORRIENTES`, modulo 11 |
| Salarios | personal, historial, caja, cuentas | liquidaciones, cierres y movimientos | `CODEX_SALARIOS`, modulos 10/11/12 |
| Locales/maquinas | locales, maquinas, readings, balances | asociaciones, contadores e historial | `CODEX_LOCALES_MAQUINAS`, modulos 03/09 |
| Movimientos cajero | caja, clientes, personal, categorias | gastos, regalos, transferencias, salarios, capital | `CODEX_CAJA`, modulo 04 |
| Auditoria | todos los comandos sensibles | eventos append-only conceptuales | `CODEX_AUDITORIA`, modulo 12 |

## Asociaciones transversales

- `balanceId` vincula movimientos, salarios y lecturas con una recaudacion.
- `localId` determina alcance operativo y permisos futuros.
- `staffId`, `clientId` y `machineId` vinculan historiales con maestros.
- Una accion contable puede modificar entidad operativa, movimientos de cuenta y auditoria; no deben separarse al extraer comandos.
- Cuenta personal usa periodo salarial; caja usa `balanceId`.
- Rol real y funcion usada son datos distintos de auditoria.

## Cruces actuales entre features

- Cuentas y Salarios reutilizan `ClosedBalanceSummary` desde `features/cashier`.
- Movimientos del cajero reutiliza `ClientEditor` desde `features/admin`.
- Estos cruces funcionan, pero los componentes realmente transversales deberian migrar a `components/` o una feature compartida cuando se refactoricen.

## Estado de modularizacion

- `App.tsx` ya no contiene las pantallas completas; conserva estado global, login, apertura de caja, navegacion y composicion.
- Las reglas puras principales estan en `src/lib`.
- Features cuentan con `AGENTS.md` cortos de referencia.
- El siguiente foco no es seguir reduciendo `App.tsx` por tamaño, sino dividir features grandes y sacar comandos de negocio de React.

## Concentracion de codigo

Medicion de referencia 2026-07-10:

| Archivo | Lineas aproximadas | Riesgo |
| --- | ---: | --- |
| `features/admin/LocationsMachines.tsx` | 2260 | Muy alto: locales, maquinas, taller, editores e historiales |
| `data/appData.ts` | 1300 | Alto: seed y migracion/normalizacion mezclados |
| `features/cashier/Movements.tsx` | 1218 | Alto: seis movimientos operativos y clientes |
| `features/salaries/SalarySettlements.tsx` | 1139 | Alto: listado, detalle, editor, cuentas y cierres |
| `features/admin/Staff.tsx` | 696 | Medio: personal, editor y papelera |
| `App.tsx` | 531 | Medio: orquestacion y algunos comandos |
| `styles/global.css` | 3232 | Medio: alcance global |

Las cifras son orientativas; volver a medir antes de planificar un corte.

## Deuda tecnica priorizada

### Alta

- Snapshot completo en `localStorage`, sin esquema runtime versionado.
- Compaccion local puede recortar auditoria e historiales al superar cuota.
- Reglas/mutaciones todavia viven en handlers React.
- Cobertura automatizada insuficiente para ciclos completos.
- Fechas operativas deben independizarse de `toISOString()` UTC.

### Media

- Permisos, confirmaciones y mensajes distribuidos.
- Navegacion manual por union `Screen`, con estados heredados sin render.
- Duplicaciones de UI/presentacion restantes.
- CSS global grande.
- IDs locales no son adecuados para concurrencia online.

### Baja por ahora

- Bundle unico sin lazy loading: tamaño actual aceptable.
- `types.ts` grande: dividir solo junto con dominios estables.
- No incorporar store complejo antes de extraer comandos.

## Arquitectura futura

- Objetivo: `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`.
- Secuencia: `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`.
- Ambos son diseño; el estado real sigue siendo local.

## Validacion

```text
pnpm test
pnpm run build
iniciar-poseidon.bat
http://127.0.0.1:5173/ -> 200
git diff --check
```

La prueba manual debe usar el rol y flujo afectados. Actualizar este mapa solo cuando cambien propiedad de archivos, dependencias, arquitectura o deuda tecnica.
