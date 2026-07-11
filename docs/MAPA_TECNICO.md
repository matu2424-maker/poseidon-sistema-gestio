# Poseidon - Mapa tecnico

Ultima actualizacion: 2026-07-10

Fuente canonica de propiedad de archivos, capas, dependencias y deuda tecnica. No contiene reglas funcionales completas; consultar `docs/POSEIDON_FUNCIONAMIENTO.md` y `docs/modulos/`.

## Stack y ejecucion

- React 19, TypeScript estricto y Vite.
- CSS global.
- Persistencia local con snapshot versionado en `localStorage`.
- Vitest para pruebas puras.
- Entrada: `src/main.tsx` -> `src/App.tsx`.
- Servidor: `iniciar-poseidon.bat` en `http://127.0.0.1:5173/`.

## Flujo principal

```text
main.tsx
  -> App.tsx (estado AppData, usuario, rol efectivo, pantalla)
     -> layout y panel por rol
     -> feature activa
        -> comandos de src/application para operaciones multi-entidad
        -> helpers puros de src/lib
        -> patchData(AppData)
        -> auditoria
     -> infrastructure/storage persiste y valida snapshot local
```

## Estructura y propiedad

```text
src/
  App.tsx                  orquestacion global y composicion
  application/             comandos atomicos, contexto y resultados tipados
  types.ts                 tipos de dominio actuales
  data/appData.ts          seed demo, reset y fachada de normalizacion
  data/normalizeData.ts    migracion y normalizacion del snapshot actual
  data/appDataIds.ts       IDs tecnicos compartidos de local/taller
  infrastructure/storage/ snapshot, validacion y repositorio local
  lib/                     reglas y helpers compartidos
  components/              UI reutilizable transversal
  hooks/                   estado UI compartido, como avisos
  navigation/screens.ts    titulos, menus, permisos y requisitos por pantalla
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
| `lib/storage.ts` | Preferencias locales de columnas |
| `infrastructure/storage/snapshot.ts` | Formato y validacion runtime del snapshot |
| `infrastructure/storage/localAppDataRepository.ts` | Lectura, escritura, importacion y exportacion local |
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
| `confirmations.ts` | Punto unico de reconfirmacion de interfaz |
| `navigation/screens.ts` | Registro tipado de pantallas, menus, roles y caja requerida |

## Comandos de aplicacion

| Archivo | Operacion atomica |
| --- | --- |
| `application/cash/openCash.ts` | Apertura, aportes iniciales, lecturas, cuentas y auditoria |
| `application/cash/saveReading.ts` | Validacion/guardado de contador, resultado, cuenta y auditoria |
| `application/cash/closeCash.ts` | Cierre, retiros, maquinas, diferencias, cuentas, historial y auditoria |
| `application/differences/manageDifference.ts` | Verificacion, correccion/anulacion, delta contable y auditoria |
| `application/salaries/salarySettlementCommands.ts` | Alta, correccion y anulacion salarial con cuentas y auditoria |

## Componentes compartidos

- `components/ui.tsx`: `InfoCard`, `FormButtons`, `Modal`, `ColumnChooser`.
- `components/MonthlyPeriodSelector.tsx`: selector mensual comun.
- `components/WelcomeScreen.tsx`: heredado y sin uso; candidato a eliminar.
- `features/cashier/MovementTable.tsx`: marco y tabla ordenable para movimientos del cajero.
- `features/clients/clientTable.ts`: orden y estados compartidos de clientes.

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
- `CashierClients` reutiliza `ClientEditor` desde `features/admin`; es el cruce pendiente mas claro para el siguiente corte.
- Estos cruces funcionan, pero los componentes realmente transversales deberian migrar a `components/` o una feature compartida cuando se refactoricen.

## Estado de modularizacion

- `App.tsx` ya no contiene las pantallas completas; conserva estado global, login, apertura de caja, navegacion y composicion.
- Las reglas puras principales estan en `src/lib`.
- Features cuentan con `AGENTS.md` cortos de referencia.
- `LocationsMachines.tsx` ya separa editores, historiales y helpers en `features/admin/locationsMachines/`.
- `Movements.tsx` ya separa clientes, salarios y tabla/panel compartido.
- `SalarySettlements.tsx` ya separa su editor de escritura.
- `appData.ts` ya delega la normalizacion/migracion en `data/normalizeData.ts`.
- El siguiente foco no es seguir reduciendo `App.tsx` por tamano, sino separar CSS, ampliar validacion estatica y continuar sacando comandos de negocio de React.

## Concentracion de codigo

Medicion de referencia 2026-07-10:

| Archivo | Lineas aproximadas | Riesgo |
| --- | ---: | --- |
| `features/admin/LocationsMachines.tsx` | 828 | Medio: tablas y modales de asociacion; editores/historiales ya separados |
| `features/admin/locationsMachines/HistoryModals.tsx` | 759 | Medio: dos historiales complejos, sin mutaciones |
| `data/appData.ts` | 834 | Medio: seed demo; normalizacion ya separada |
| `data/normalizeData.ts` | 508 | Alto por impacto: migracion central, aunque aislada |
| `features/cashier/Movements.tsx` | 754 | Medio: gastos, transferencias, regalos y capital |
| `features/salaries/SalarySettlements.tsx` | 965 | Medio/alto: listado, detalle, cuentas y cierres; editor separado |
| `features/admin/Staff.tsx` | 696 | Medio: personal, editor y papelera |
| `App.tsx` | 531 | Medio: orquestacion y algunos comandos |
| `styles/global.css` | 3232 | Medio: alcance global |

Las cifras son orientativas; volver a medir antes de planificar un corte.

## Deuda tecnica priorizada

### Alta

- Movimientos operativos, locales/maquinas, cierres periodicos y maestros todavia conservan algunas mutaciones en handlers React.
- Cobertura automatizada insuficiente para ciclos completos.
- El snapshot sigue limitado por la cuota del navegador, aunque ya no recorta historiales para forzar guardado.

Completado en integridad local: los movimientos persistidos se conservan, las anulaciones usan contramovimientos y las bajas definitivas validan referencias.

### Media

- Duplicaciones de UI/presentacion restantes, incluido `ClientEditor` consumido desde dos features.
- CSS global grande.
- IDs locales no son adecuados para concurrencia online.

Completado en navegacion: registro tipado de pantallas, permisos por funcion, requisito de caja abierta, menus/titulos centralizados, confirmacion unica y avisos compartidos. Se eliminaron estados de pantalla heredados sin render y `WelcomeScreen.tsx` sin uso.

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
pnpm run typecheck
pnpm run build
iniciar-poseidon.bat
http://127.0.0.1:5173/ -> 200
git diff --check
```

La prueba manual debe usar el rol y flujo afectados. Actualizar este mapa solo cuando cambien propiedad de archivos, dependencias, arquitectura o deuda tecnica.
