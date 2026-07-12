# Poseidon - Mapa tecnico

Ultima actualizacion: 2026-07-12

Fuente canonica de propiedad de archivos, capas, dependencias y deuda tecnica. No contiene reglas funcionales completas; consultar `docs/POSEIDON_FUNCIONAMIENTO.md` y `docs/modulos/`.

## Stack y ejecucion

- React 19, TypeScript estricto y Vite.
- CSS global.
- Persistencia local con snapshot versionado en `localStorage`.
- Vitest para pruebas puras e integracion de comandos.
- Playwright con Chrome para los flujos E2E criticos de cajero y diferencias/auditoria del encargado.
- Entrada: `src/main.tsx` -> `src/App.tsx`.
- Servidor: `iniciar-poseidon.bat` en `http://127.0.0.1:5173/`.

## Infraestructura Codex

```text
.codex/config.toml                         limites globales de subagentes
.codex/agents/poseidon_scope_mapper.toml        mapa de alcance, solo lectura
.codex/agents/poseidon_accounting_reviewer.toml revision contable, solo lectura
.codex/agents/poseidon_ui_reviewer.toml         custodio de diseno, solo lectura
.agents/skills/poseidon-module-change/           flujo modular autorizado
.agents/skills/poseidon-visual-qa/               verificacion visual y responsive
.agents/skills/poseidon-accounting-regression/   matriz de regresion contable
.agents/skills/poseidon-localhost-diagnostics/   arranque y diagnostico local
docs/PROTOCOLO_AGENTES_CODEX.md            fuente canonica de delegacion
docs/SKILLS_POSEIDON.md                     fuente canonica de skills
docs/REGISTRO_DELEGACIONES_AGENTES.md      medicion acumulada
docs/plantillas/REPORTE_DELEGACION_AGENTES.md contrato de cada registro
docs/SISTEMA_VISUAL_POSEIDON.md             patrones y referencias de diseno
docs/PILOTOS_DISENO_POSEIDON.md             evidencia de tres revisiones UI
scripts/validate-agent-config.mjs           validador ejecutable
scripts/agent-config-validation.mjs         reglas puras del validador
scripts/validate-skills.mjs                 validador ejecutable de skills
scripts/skill-config-validation.mjs         reglas puras del validador de skills
scripts/precommit-check.mjs                 seleccion proporcional previa al commit
scripts/validate-design-system.mjs          validador de gobierno visual
scripts/capture-visual-references.mjs       capturas aprobadas reproducibles
```

- Maximo tecnico de tres hilos abiertos, maximo operativo de dos trabajando en paralelo y profundidad uno.
- Los perfiles no forman parte del runtime de Poseidon ni modifican su arquitectura funcional.
- El agente principal conserva autorizacion, integracion, validacion, documentacion y commits.
- Para implementacion se usa inicialmente el `worker` integrado de Codex con propiedad explicita de archivos.
- `pnpm run check:agents` valida perfiles; `check:skills` valida procedimientos; `check:design` valida patrones visuales; `pnpm run check` ejecuta los tres antes del codigo.
- `.githooks/pre-commit` y `scripts/precommit-hook.ps1` ejecutan `pnpm run check:commit` con el runtime disponible en Windows.
- Todo subagente terminado se registra; no se considera un perfil nuevo sin tres delegaciones utiles de la misma especialidad.

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
  navigation/lazyScreens  carga diferida por pantalla/feature
  application/             comandos atomicos, contexto y resultados tipados
    ports/                  contrato de repositorio y cola asincrona ordenada
  types.ts                 tipos de dominio actuales
  data/appData.ts          seed demo, reset y fachada de normalizacion
  data/normalizeData.ts    migracion y normalizacion del snapshot actual
  data/appDataIds.ts       IDs tecnicos compartidos de local/taller
  infrastructure/storage/ snapshot, validacion y adaptador local
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
  styles/global.css        manifiesto ordenado de estilos
  styles/base.css          tokens, reset y controles base
  styles/layout.css        shell y estructura general
  styles/features/         paneles, caja, salarios y administracion
  styles/responsive.css    breakpoints al final de la cascada
```

## Librerias internas

| Archivo | Responsabilidad |
| --- | --- |
| `money.ts` | Formato, entrada general y parser estricto de importes obligatorios |
| `dates.ts` | Fecha/hora, rangos base y fecha operativa en `America/Montevideo` |
| `periods.ts` | Periodos mensuales y etiquetas |
| `display.ts` | Nombres, roles e IDs visibles |
| `ids.ts` | IDs locales actuales |
| `audit.ts` | Construccion de eventos, resolucion de local y visibilidad por rol |
| `lib/storage.ts` | Preferencias locales de columnas |
| `infrastructure/storage/snapshot.ts` | Formato y validacion runtime; esquema actual 2 preserva cadena de ajustes |
| `application/ports/AppDataRepository.ts` | Puerto asincrono de datos y codec de respaldo |
| `application/ports/asyncOperationQueue.ts` | Ordena escrituras y permite continuar tras un fallo |
| `hooks/useAppDataRepository.ts` | Hidratacion, recuperacion y persistencia sin acoplar App al adaptador |
| `infrastructure/storage/localAppDataRepository.ts` | Adaptador `localStorage`, importacion y exportacion local |
| `currentAccounts.ts` | IDs, creacion y saldos de cuentas |
| `accountMovements.ts` | Movimientos derivados, saldo corrido y ajustes de diferencias append-only encadenados |
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
| `application/movements/operatingMovementCommands.ts` | Altas/anulaciones de gastos, transferencias, regalos y capital con cuenta y auditoria |
| `application/locations/localCommands.ts` | Alta, edicion, cierre y baja de locales con cuentas, maquinas, historial y auditoria |
| `application/machines/machineCommands.ts` | Alta, edicion, reset, taller, asignacion y baja de maquinas |
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
- Las pantallas funcionales se cargan bajo demanda desde `navigation/lazyScreens.ts`; el arranque, login, shell y recuperacion quedan estaticos.
- El siguiente foco no es seguir reduciendo `App.tsx` por tamano, sino continuar sacando comandos de negocio de React.
- `Diferencias` reutiliza el `Modal` compartido de `components/ui.tsx`; sus estilos dejaron de depender de `features/salaries.css` y pertenecen a `features/admin.css` con breakpoints en `responsive.css`.

## Concentracion de codigo

Medicion de referencia 2026-07-10:

| Archivo | Lineas aproximadas | Riesgo |
| --- | ---: | --- |
| `features/admin/LocationsMachines.tsx` | 795 | Bajo/medio: tablas y modales; mutaciones delegadas a comandos |
| `features/admin/locationsMachines/HistoryModals.tsx` | 759 | Medio: dos historiales complejos, sin mutaciones |
| `data/appData.ts` | 834 | Medio: seed demo; normalizacion ya separada |
| `data/normalizeData.ts` | 508 | Alto por impacto: migracion central, aunque aislada |
| `features/cashier/Movements.tsx` | 580 | Bajo/medio: formularios y tablas; negocio operativo delegado a comandos |
| `features/salaries/SalarySettlements.tsx` | 965 | Medio/alto: listado, detalle, cuentas y cierres; editor separado |
| `features/admin/Staff.tsx` | 696 | Medio: personal, editor y papelera |
| `App.tsx` | 531 | Medio: orquestacion y algunos comandos |
| `styles/features/admin.css` | 921 | Medio: tablas, modales y administracion |
| `styles/features/cash.css` | 821 | Medio: caja, cierre y resumen |
| `styles/features/dashboards.css` | 579 | Bajo/medio: paneles por rol |
| `styles/global.css` | 7 | Bajo: manifiesto de imports |

Las cifras son orientativas; volver a medir antes de planificar un corte.

## Deuda tecnica priorizada

### Alta

- Cierres periodicos y algunos maestros todavia conservan mutaciones en handlers React.
- Cobertura automatizada insuficiente para ciclos completos.
- El snapshot sigue limitado por la cuota del navegador, aunque ya no recorta historiales para forzar guardado.

Completado en integridad local: los movimientos persistidos se conservan, las anulaciones usan contramovimientos y las bajas definitivas validan referencias.

### Media

- Duplicaciones de UI/presentacion restantes, incluido `ClientEditor` consumido desde dos features.
- Selectores CSS todavia son globales por clase, aunque los archivos ya estan separados por propiedad.
- IDs locales no son adecuados para concurrencia online.

Completado en navegacion: registro tipado de pantallas, permisos por funcion, requisito de caja abierta, menus/titulos centralizados, confirmacion unica y avisos compartidos. Se eliminaron estados de pantalla heredados sin render y `WelcomeScreen.tsx` sin uso.

### Baja por ahora

- Carga diferida completada: bundle inicial reducido de 507,03 kB a 283,65 kB; Locales/Maquinas es el chunk funcional mayor con 50,65 kB.
- `types.ts` grande: dividir solo junto con dominios estables.
- No incorporar store complejo antes de extraer comandos.

## Arquitectura futura

- Objetivo: `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`.
- Secuencia: `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`.
- Ambos son diseño; el estado real sigue siendo local.

## Validacion

```text
pnpm run check
pnpm run build
iniciar-poseidon.bat
pnpm run smoke:localhost
pnpm run check:commit
git diff --check
```

`pnpm run check` ejecuta `check:agents`, `check:skills`, `check:design`, typecheck, ESLint y la suite automatizada. `check:commit` selecciona ese control completo o validadores de infraestructura segun las rutas preparadas. La prueba manual debe usar el rol y flujo afectados segun `docs/VALIDACION_LOCAL.md`.
