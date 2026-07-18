# Poseidon - Mapa tecnico

Ultima actualizacion: 2026-07-18

Fuente canonica de propiedad de archivos, capas, dependencias y deuda tecnica. No contiene reglas funcionales completas; consultar `docs/POSEIDON_FUNCIONAMIENTO.md` y `docs/modulos/`.

## Stack y ejecucion

- React 19, React Router 8 en modo declarativo, TypeScript estricto y Vite.
- CSS por capas con manifiesto global.
- Persistencia local con snapshot versionado en `localStorage`.
- Vitest para pruebas puras e integracion de comandos.
- Playwright con Chrome para caja, diferencias/auditoria y navegacion por rol.
- Entrada: `src/main.tsx` -> `BrowserRouter` -> `src/App.tsx`.
- Servidor: `iniciar-poseidon.bat` en `http://127.0.0.1:5173/`.

## Infraestructura Codex

```text
.codex/config.toml                         interrupciones visibles, sin limites propios
.codex/agents/poseidon_scope_mapper.toml        mapa de alcance, solo lectura
.codex/agents/poseidon_accounting_reviewer.toml revision contable, solo lectura
.codex/agents/poseidon_ui_reviewer.toml         custodio de diseno, solo lectura
.agents/skills/poseidon-module-change/           flujo modular autorizado
.agents/skills/poseidon-visual-qa/               verificacion visual y responsive
.agents/skills/poseidon-accounting-regression/   matriz de regresion contable
.agents/skills/poseidon-localhost-diagnostics/   arranque y diagnostico local
docs/PROTOCOLO_AGENTES_CODEX.md            fuente canonica de delegacion
docs/coordinacion/                          chats, estado, decisiones, migraciones, capacidades y cola
docs/contextos/CODEX_CALIDAD_PRUEBAS.md     contrato corto del workstream de calidad
docs/calidad/                               informes de calidad autorizados
e2e/quality/                                pruebas E2E propiedad de Calidad
docs/SKILLS_POSEIDON.md                     fuente canonica de skills
docs/REGISTRO_DELEGACIONES_AGENTES.md      medicion acumulada
docs/plantillas/REPORTE_DELEGACION_AGENTES.md contrato de cada registro
docs/SISTEMA_VISUAL_POSEIDON.md             patrones y referencias de diseno
docs/REVISIONES_DE_DISENO_POSEIDON.md       evidencia de tres revisiones UI
scripts/validate-agent-config.mjs           validador ejecutable
scripts/agent-config-validation.mjs         reglas puras del validador
scripts/validate-skills.mjs                 validador ejecutable de skills
scripts/skill-config-validation.mjs         reglas puras del validador de skills
scripts/precommit-check.mjs                 seleccion proporcional previa al commit
scripts/validate-design-system.mjs          validador de gobierno visual
scripts/capture-visual-references.mjs       capturas aprobadas reproducibles
scripts/validate-governance.mjs             validador ejecutable de gobierno SOPM-Lite
scripts/governance-config-validation.mjs    reglas puras de estado, decisiones, migraciones y capacidades
```

- El proyecto no fija cantidad de hilos ni profundidad; aplica la capacidad disponible de Codex y el protocolo de no superposicion.
- Los perfiles no forman parte del runtime de Poseidon ni modifican su arquitectura funcional.
- El agente principal conserva autorizacion, integracion, validacion, documentacion y commits.
- `Poseidon Calidad y Pruebas` es un workstream permanente aislado: prueba commits exactos y asesora a Central, sin decidir producto ni editar contratos compartidos.
- Para implementacion se usa inicialmente el `worker` integrado de Codex con propiedad explicita de archivos.
- `pnpm run check:agents` valida perfiles; `check:workstreams` valida chats y gobierno SOPM-Lite; `check:governance` valida solo sus registros; `check:skills` valida procedimientos; `check:design` valida patrones visuales; `pnpm run check` ejecuta todos antes del codigo.
- `.githooks/pre-commit` y `scripts/precommit-hook.ps1` ejecutan `pnpm run check:commit` con el runtime disponible en Windows.
- Todo subagente terminado se registra; no se considera un perfil nuevo sin tres delegaciones utiles de la misma especialidad.

## Flujo principal

```text
main.tsx
  -> BrowserRouter
  -> App.tsx (estado AppData, usuario, rol efectivo, pantalla derivada de URL)
     -> navigation/screens.ts (ruta, titulo, rol, menu, requisito de caja)
     -> infrastructure/session (usuario y funcion de la pestaña)
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
    cash/                   apertura, lecturas y cierre
    treasury/               Caja/Principal y movimientos de socios
    expenses/               gastos administrativos desde Principal
    movements/              movimientos operativos de Caja
    salaries/               liquidaciones y cierres salariales
    system/                 mantenimiento destructivo controlado del entorno local
    ports/                  contrato de repositorio y cola asincrona ordenada
  types.ts                 tipos de dominio actuales
  data/appData.ts          seed demo, reset y fachada de normalizacion
  data/normalizeData.ts    normalizacion estructural del snapshot
  data/migrateData.ts      hidratacion y migraciones financieras incrementales
  data/schemaVersion.ts    version canonica del snapshot local
  data/appDataIds.ts       IDs tecnicos compartidos de local/taller
  infrastructure/storage/ snapshot, validacion y adaptador local
  infrastructure/session/ sesion local de pestaña para usuario y funcion
  lib/                     reglas y helpers compartidos
  components/              UI reutilizable transversal
  hooks/                   estado UI compartido, como avisos
  navigation/screens.ts    rutas, titulos, menus, permisos y requisitos por pantalla
  features/
    layout/                bienvenida, login, shell y menus
    dashboard/             selector compatible y panel independiente por rol
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
  styles/features/         estilos compartidos y extensiones exclusivas por panel de rol
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
| `infrastructure/storage/snapshot.ts` | Formato y validacion runtime; esquema actual 5 separa migracion financiera de normalizacion |
| `application/ports/AppDataRepository.ts` | Puerto asincrono, resultado de conflicto/fallo, suscripcion opcional a cambios y codec de respaldo |
| `application/ports/asyncOperationQueue.ts` | Ordena escrituras y permite continuar tras un fallo |
| `hooks/useAppDataRepository.ts` | Hidratacion, version esperada, sincronizacion pasiva entre pestanas, bloqueo y recuperacion sin acoplar App al adaptador |
| `infrastructure/storage/localAppDataRepository.ts` | Adaptador `localStorage`, eventos de cambio, comparacion optimista, importacion y exportacion local |
| `currentAccounts.ts` | IDs, creacion y saldos de Caja, Principal, socios, personal y transferencias |
| `accountMovements.ts` | Asientos dobles, saldo corrido, contramovimientos y ajustes append-only |
| `cashTotals.ts` | Totales de Caja por recaudacion, excluyendo pagos administrativos desde Principal |
| `periodicTotals.ts` | Consolidacion periodica de cajas cerradas y operaciones de Principal sin `balanceId` |
| `cashAvailability.ts` | Disponibilidad por cuenta, rechazo atomico y reconciliacion Caja/libro |
| `data/migrateData.ts` | Migraciones por `schemaVersion`; esquema 5 agrega Principal/socios preservando Caja y resultado |
| `differences.ts` | Estados y calculos de diferencias |
| `salaryRules.ts` | Conceptos, base, periodos y limites salariales |
| `balanceReferences.ts` | Recaudacion asociada por `balanceId` |
| `sorting.ts` | Ordenamiento compartido e indicador accesible `aria-sort` |
| `managerCashActivity.ts` | Reconstruccion de intervenciones del Encargado por `balanceId`, estado vigente e impacto informativo por cuenta |
| `clients.ts`, `people.ts` | Reglas de clientes y personal |
| `files.ts`, `export.ts` | Metadata local y exportaciones |
| `machineHistory.ts` | Eventos de historial de maquinas |
| `confirmations.ts` | Punto unico de reconfirmacion de interfaz |
| `navigation/screens.ts` | Registro tipado de pantallas, menus, roles y caja requerida |
| `docs/coordinacion/WORKSTREAMS.json` | Propiedad verificable de chats permanentes y contratos reservados |
| `docs/coordinacion/PROJECT_STATUS.json` | Fase, ordenes, riesgos y proximas acciones sin duplicar el HEAD de Git |
| `docs/coordinacion/DECISIONS.json` | Registro de decisiones transversales con documentos individuales |
| `docs/coordinacion/MIGRATIONS.json` | Historial verificable de migraciones y reparaciones de datos |
| `docs/coordinacion/CAPABILITIES.json` | Inventario de agentes, skills y validadores activos |

## Comandos de aplicacion

| Archivo | Operacion atomica |
| --- | --- |
| `application/cash/openCash.ts` | Apertura; primera caja crea aporte de socio y traspaso Principal -> Caja; siguientes heredan Caja |
| `application/cash/saveReading.ts` | Validacion/guardado de contador, reconciliacion previa, resultado, cuenta y auditoria |
| `application/movements/operatingMovementCommands.ts` | Gastos, transferencias y regalos de Caja; alta legacy de capital deshabilitada |
| `application/treasury/treasuryCommands.ts` | Traspasos Caja/Principal y aportes/retiros de socios con fondos, permisos, asientos y auditoria |
| `application/expenses/principalExpenseCommands.ts` | Alta/anulacion de gastos desde Principal/Efectivo o Principal/Banco, sin `balanceId` |
| `application/locations/localCommands.ts` | Alta, edicion, cierre y baja de locales con cuentas, maquinas, historial y auditoria |
| `application/machines/machineCommands.ts` | Alta, edicion, reset, taller, asignacion y baja de maquinas |
| `application/cash/closeCash.ts` | Cierre, traspasos Caja -> Principal, remanente declarado, diferencias, maquinas e historial |
| `application/differences/manageDifference.ts` | Verificacion, correccion/anulacion, delta contable y auditoria |
| `application/salaries/salarySettlementCommands.ts` | Caja/Efectivo para Cajero y Principal para Encargado/Admin; correccion neta, anulacion y auditoria |
| `application/salaries/salaryClosureCommands.ts` | Cierre mensual definitivo y ciclo de revisiones correctivas |
| `application/system/resetOperationalData.ts` | Reinicio local con permisos, limpieza determinista y auditoria nueva; el respaldo se descarga desde `App.tsx` antes de ejecutar |

## Componentes compartidos

- `components/ui.tsx`: `InfoCard`, `FormButtons`, `Modal` con gestion de foco/Escape y `ColumnChooser`.
- `components/MonthlyPeriodSelector.tsx`: selector mensual comun.
- `features/cashier/MovementTable.tsx`: marco y tabla ordenable para movimientos del cajero.
- `features/cashier/ManagerCashActivity.tsx`: detalle ordenable de intervenciones del Encargado consumido por el cierre, sin escritura contable.
- `features/clients/clientTable.ts`: orden y estados compartidos de clientes.

## Dependencias criticas

| Modulo | Lee | Produce o modifica | Referencias obligatorias |
| --- | --- | --- | --- |
| Caja | locales, maquinas, cuentas, usuarios, tesoreria | balances, readings, traspasos, movimientos y auditoria | `CODEX_NUCLEO_CAJA`, modulos 02/04/05 |
| Diferencias | balances, cuentas, auditoria | declarados, estados, movimientos de cuenta | `CODEX_DIFERENCIAS`, modulos 06/11/12 |
| Cuentas/Tesoreria | cuentas, movimientos, balances, socios | vistas, saldo corrido, traspasos y movimientos patrimoniales | `CODEX_CUENTAS_CORRIENTES`, modulos 04/11 |
| Salarios | personal, historial, caja, cuentas | liquidaciones, cierres y movimientos | `CODEX_SALARIOS`, modulos 10/11/12 |
| Locales/maquinas | locales, maquinas, readings, balances | asociaciones, contadores e historial | `CODEX_LOCALES_MAQUINAS`, modulos 03/09 |
| Movimientos cajero | caja, clientes, personal, categorias, Principal | gastos, regalos, transferencias, salarios y traspasos | `CODEX_CAJERO`, `CODEX_NUCLEO_CAJA`, modulos 01/04 |
| Periodico | cajas, Principal, socios, gastos y salarios | resumen y foto del rango | modulos 07/11/12 |
| Auditoria | todos los comandos sensibles | eventos append-only conceptuales | `CODEX_AUDITORIA`, modulo 12 |

## Asociaciones transversales

- `balanceId` vincula movimientos, salarios y lecturas con una recaudacion.
- Gastos/salarios administrativos desde Principal no tienen `balanceId`; `localId` y periodo conservan su alcance.
- Traspasos Caja/Principal operativos usan `balanceId` cuando existe caja abierta; apertura/cierre lo generan automaticamente.
- `paymentAccountId` identifica la cuenta que entrego dinero.
- `localId` determina alcance operativo y permisos futuros.
- `staffId`, `clientId` y `machineId` vinculan historiales con maestros.
- `parentClosureId` encadena revisiones salariales y `correctionClosureId` vincula cada movimiento con su ajuste abierto.
- Una accion contable puede modificar entidad operativa, movimientos de cuenta y auditoria; no deben separarse al extraer comandos.
- Cuenta personal usa periodo salarial; caja usa `balanceId`.
- Rol real y funcion usada son datos distintos de auditoria.

## Cruces actuales entre features

- Cuentas y Salarios reutilizan `ClosedBalanceSummary` desde `features/cashier`.
- `CashierClients` reutiliza `ClientEditor` desde `features/admin`; es el cruce pendiente mas claro para el siguiente corte.
- Estos cruces funcionan, pero los componentes realmente transversales deberian migrar a `components/` o una feature compartida cuando se refactoricen.

## Estado de modularizacion

- `App.tsx` ya no contiene las pantallas completas; conserva estado global, login, apertura de caja, navegacion y composicion.
- La pantalla activa ya no vive en `useState`: se deriva de `location.pathname`; `navigate` actualiza el historial del navegador.
- `sessionStorage` conserva usuario y funcion activa al recargar la pestaña; cerrar sesion elimina ese dato local.
- Las reglas puras principales estan en `src/lib`.
- Features cuentan con `AGENTS.md` cortos de referencia.
- `LocationsMachines.tsx` ya separa editores, historiales y helpers en `features/admin/locationsMachines/`.
- `Movements.tsx` ya separa clientes, salarios y tabla/panel compartido.
- `Movements.tsx` contiene movimientos propios del Cajero. Encargado/Admin usan `manager/Expenses`, `accounts/CurrentAccounts` y `salaries/SalarySettlementEditor` sobre Principal.
- `SalarySettlements.tsx` ya separa su editor de escritura.
- El cierre salarial y sus revisiones ya se ejecutan mediante comandos; `salaryClosures.ts` comparte calculo, snapshot y bloqueo entre dominio e interfaz.
- `appData.ts` delega la normalizacion estructural en `data/normalizeData.ts`; `data/migrateData.ts` hidrata segun la version y evita reconstrucciones financieras silenciosas en snapshots vigentes.
- Las pantallas funcionales se cargan bajo demanda desde `navigation/lazyScreens.ts`; el arranque, login, shell y recuperacion quedan estaticos.
- El siguiente foco no es seguir reduciendo `App.tsx` por tamano, sino continuar sacando comandos de negocio de React.
- `Diferencias` reutiliza el `Modal` compartido de `components/ui.tsx`; sus estilos dejaron de depender de `features/salaries.css` y pertenecen a `features/admin.css` con breakpoints en `responsive.css`.

## Concentracion de codigo

Medicion de referencia 2026-07-12:

| Archivo | Lineas aproximadas | Riesgo |
| --- | ---: | --- |
| `features/admin/LocationsMachines.tsx` | 795 | Bajo/medio: tablas y modales; mutaciones delegadas a comandos |
| `features/admin/locationsMachines/HistoryModals.tsx` | 759 | Medio: dos historiales complejos, sin mutaciones |
| `data/appData.ts` | 839 | Medio: seed demo; normalizacion ya separada |
| `data/normalizeData.ts` | 578 | Medio/alto: normalizacion central sin decidir migraciones financieras vigentes |
| `data/migrateData.ts` | 155 | Alto por impacto: migraciones incrementales y reconciliacion auditada |
| `features/cashier/Movements.tsx` | 580 | Bajo/medio: formularios y tablas; negocio operativo delegado a comandos |
| `features/salaries/SalarySettlements.tsx` | 1.050 | Medio/alto: listado, detalle, cuentas y presentacion de snapshots; escritura y cierres separados |
| `features/admin/Staff.tsx` | 716 | Medio: personal, editor y papelera |
| `App.tsx` | 558 | Medio: orquestacion, rutas, sesion, local activo y algunos comandos |
| `styles/features/admin.css` | 1.286 | Medio: tablas, modales y administracion |
| `styles/features/cash.css` | 821 | Medio: caja, cierre y resumen |
| `styles/features/dashboards.css` | 579 | Bajo/medio: paneles por rol |
| `styles/global.css` | 7 | Bajo: manifiesto de imports |

Las cifras cuentan lineas fisicas y son orientativas; volver a medir antes de planificar un corte.

## Deuda tecnica priorizada

### Alta

- Los comandos nuevos de Caja, tesoreria, gastos Principal y salarios validan actor, funcion, usuario, local y fondos. Operaciones sensibles que aun viven en handlers React deben extraerse con la misma politica.
- El local operativo de `App.tsx` sigue resolviendose como Poseidon o el primer local; la estructura de datos es multi-local, pero el contexto operativo multi-local aun no esta completo.
- La apertura ya rechaza cualquier segunda caja abierta del mismo local, sin depender de la fecha. Traslados/asignaciones de maquinas, ajustes administrativos de contadores y cierre de local tambien se bloquean durante esa caja.
- Guardado de cierres periodicos, revision administrativa de gastos y algunos maestros todavia conservan mutaciones en handlers React.
- Cobertura E2E todavia es insuficiente para todo el ciclo de tesoreria, cierre periodico y formularios administrativos.
- El snapshot sigue limitado por la cuota del navegador, aunque ya no recorta historiales y conserva el intento fallido para descargar o reintentar.
- El adaptador local compara el snapshot esperado con el almacenado y evita que una pestaña desactualizada sobrescriba otra.

El mismo adaptador notifica cambios: una pestana pasiva se rehidrata automaticamente, mientras una pestana con revision local pendiente conserva el conflicto y el respaldo de recuperacion.

Completado en integridad local: los movimientos persistidos se conservan, las anulaciones usan contramovimientos y las bajas definitivas validan referencias.

### Media

- La validacion runtime inicial del snapshot reconoce la estructura por sus colecciones principales. Las migraciones 3 -> 4 y 4 -> 5 estan separadas, pero falta validacion profunda de campos, enums y relaciones.
- El cierre salarial inmutable esta implementado con snapshot por empleado, bloqueo del periodo, revision correctiva enlazada y migracion explicita de cierres heredados.
- Duplicaciones de UI/presentacion restantes, incluido `ClientEditor` consumido desde dos features.
- Selectores CSS todavia son globales por clase, aunque los archivos ya estan separados por propiedad.
- IDs locales no son adecuados para concurrencia online.

Completado en navegacion: React Router, URL estable por pantalla, ruta directa, recarga, Atrás/Adelante, sesion de pestaña, permisos por funcion, requisito de caja abierta, menus/titulos centralizados, confirmacion unica y avisos compartidos. Se eliminaron estados de pantalla heredados sin render y `WelcomeScreen.tsx` sin uso.

### Baja por ahora

- Carga diferida completada. Tras incorporar React Router, la medicion del 2026-07-12 deja el bundle inicial en 328,76 kB y Locales/Maquinas en 53,78 kB, ambos sin advertencia de chunk grande y por debajo del bundle historico de 507,03 kB.
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

`pnpm run check` ejecuta `check:agents`, `check:workstreams` (incluido gobierno), `check:skills`, `check:design`, typecheck, ESLint y la suite automatizada. `check:commit` selecciona ese control completo o validadores de infraestructura segun las rutas preparadas. La prueba manual debe usar el rol y flujo afectados segun `docs/VALIDACION_LOCAL.md`.
