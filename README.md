# Poseidon Sistema de Gestion

Aplicacion web para operar y controlar caja diaria, maquinas, movimientos, tesoreria, salarios, clientes, cierres, reportes, cuentas corrientes y auditoria del local Poseidon.

El proyecto sigue en etapa de prueba controlada. El desarrollo y los datos
operativos permanecen locales; la beta publica `0.1.0-beta.1` esta disponible
como demo en [poseidon-sistema-gestio.vercel.app](https://poseidon-sistema-gestio.vercel.app).
No usa autenticacion real, base remota ni almacenamiento real de archivos. El
esquema Supabase versionado es preparatorio y permanece desactivado.

## Stack

- React 19 y React Router 8.
- Vite 6.
- TypeScript.
- Zod 4 mediante `zod/mini` para validar el snapshot completo en runtime.
- CSS por capas y features.
- Vitest y Playwright.
- Persistencia local versionada sobre `localStorage` mediante `AppDataRepository`.
- Supabase CLI, SQL y pgTAP para preparar el backend transaccional sin
  conectarlo al frontend.

## Estado actual

- Snapshot local esquema `5`, bajo la clave compatible `poseidon-sistema-gestion-v2`.
- Login de prueba por seleccion de usuario, sin contrasena.
- Local operativo actual: Poseidon.
- Preparacion estructural multi-local, aunque la operacion se concentra en Poseidon.
- Sincronizacion entre pestanas del mismo navegador y control optimista de conflictos.
- Exportacion, importacion y recuperacion del snapshot local.
- Validacion runtime estricta del snapshot completo antes de cargar, importar, migrar o guardar, con informe por ruta y recuperacion del contenido rechazado.
- Reinicio operativo local con respaldo automatico, maestros conservados, cuentas/contadores en cero y auditoria nueva.
- Los archivos adjuntos conservan solamente nombre y tipo; no se guarda contenido pesado en `localStorage`.
- Las migraciones financieras son incrementales, deterministas y auditables.
- La evidencia automatizada vigente y sus conteos se mantienen en `docs/VALIDACION_LOCAL.md`.
- Version candidata: `0.1.0-beta.1`, commit `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`.
- Node y pnpm fijados para builds reproducibles.
- `release/test` y la etiqueta `v0.1.0-beta.1` permanecen congelados en el commit candidato; `main` continua con documentacion y controles posteriores.
- Workflow CI activo con Actions compatibles con Node 24; la evidencia remota vigente se registra en `docs/VALIDACION_LOCAL.md`.
- Vercel publica explicitamente desde `release/test`; los cambios diarios de `main` no generan despliegues automaticos.
- Seis migraciones SQL, RLS, pgTAP, gateway RPC y matriz de migracion estan en
  estado `VALIDATING`; `VITE_POSEIDON_BACKEND` sigue en `local`.

## Modelo financiero vigente

Poseidon opera solo en pesos uruguayos (`UYU`) y separa cuatro cuentas de dinero:

| Ambito | Efectivo | Banco |
| --- | --- | --- |
| Caja | `Caja / Efectivo` | `Caja / Banco` |
| Tesoreria | `Principal / Efectivo` | `Principal / Banco` |

Tambien existen cuentas patrimoniales independientes para los socios `MATHIAS` y `RICARDO`.

- La Caja representa los fondos operativos disponibles para una recaudacion.
- Principal representa los fondos generales de la empresa.
- Un traspaso Caja <-> Principal conserva el patrimonio y no cambia el resultado economico.
- El traspaso mantiene el mismo medio: efectivo con efectivo, banco con banco.
- Un aporte o retiro de socio es una operacion patrimonial real entre Principal y la cuenta del socio.
- No existe el concepto de custodia ni se selecciona una persona para un traspaso interno.
- Los movimientos nuevos que entregan dinero no pueden dejar una cuenta de dinero negativa.
- Los movimientos historicos no se borran: se anulan o compensan con contramovimientos.

Formula economica:

```text
resultado economico = resultado de maquinas - gastos - salarios - regalos
```

No integran ese resultado:

- transferencias internas;
- traspasos Caja <-> Principal;
- aportes o retiros de socios;
- saldos iniciales;
- diferencias de control.

La fuente completa es `docs/REGLAS_CONTABLES.md`.

## Roles y funciones

| Rol real | Funcion principal |
| --- | --- |
| Cajero | Opera la recaudacion desde Caja |
| Encargado | Controla el local y opera Tesoreria Principal |
| Administrador | Administra el sistema y opera Tesoreria Principal |

- Encargado y Administrador pueden cambiar expresamente a funcion Cajero.
- La auditoria conserva usuario real, rol real y funcion utilizada.
- Desde funcion administrativa, Encargado y Administrador registran gastos y liquidaciones desde Principal.
- Para cargar contadores, movimientos propios de una recaudacion o cerrar caja deben trabajar como Cajero.
- El encargado ve solamente los locales asignados; la demo lo asigna a Poseidon.

## Flujo de caja

1. La primera caja de un local declara un aporte real de uno de los socios a Principal.
2. El sistema traspasa esos fondos de Principal a Caja para iniciar la operacion.
3. Las siguientes cajas heredan los saldos vigentes de Caja.
4. Los movimientos del Cajero afectan Caja y quedan asociados al `balanceId` activo.
5. Al cerrar se puede traspasar efectivo y/o banco desde Caja a Principal.
6. El remanente declarado queda en Caja y sera el saldo inicial de la siguiente recaudacion.
7. Una diferencia entre esperado y declarado se registra como control auditado; no cambia el resultado economico.

Si el efectivo esperado de una caja es negativo, el cierre se bloquea. El usuario debe ingresar fondos reales a Principal y traspasarlos a Caja. Si el calculo de la caja no coincide con el libro `Caja / Efectivo`, el sistema exige una reconciliacion tecnica auditada; un traspaso ordinario no disimula ese desacople.

## Modulos implementados

- Inicio, ingreso local y navegacion por URL.
- Paneles separados para Cajero, Encargado y Administrador.
- Apertura y cierre de caja.
- Contadores IN/OUT con guardado manual.
- Gastos, transferencias, regalos y pagos salariales de caja.
- Traspasos Caja <-> Principal.
- Gastos y liquidaciones administrativas desde Principal.
- Aportes y retiros patrimoniales de Mathias y Ricardo.
- Resumen de recaudaciones y diferencias de caja.
- Cuentas corrientes de Caja, Principal, socios, transferencias y personal.
- Locales, maquinas, taller, desuso e historial.
- Clientes, personal, papelera y liquidacion de salarios.
- Cierre salarial mensual inmutable con revisiones correctivas.
- Reportes, cierre periodico y auditoria.
- Respaldo e importacion de datos locales.

## Ejecutar en Windows

Camino oficial:

```text
iniciar-poseidon.bat
```

Abrir:

```text
http://127.0.0.1:5173/
```

Durante la etapa local, abrir y validar siempre en el perfil habitual de Chrome. Ese perfil y ese origen exacto son la unica fuente operativa de datos; el navegador integrado y los perfiles automatizados mantienen copias aisladas y descartables.

Comprobar el entorno sin iniciar otro proceso:

```text
iniciar-poseidon.bat --check
```

Liberar el puerto oficial:

```text
detener-poseidon.bat
```

No usar Python, `pnpm preview` ni un servidor alternativo para el trabajo diario.

Si faltan dependencias:

```bash
pnpm install
```

## Validacion

Con el runtime del proyecto disponible:

```bash
pnpm run check
pnpm run check:governance
pnpm run build
pnpm run measure:snapshot-validation
pnpm run release:check
pnpm run check:commit
```

Con Docker y Supabase local disponible:

```bash
pnpm exec supabase start
pnpm run backend:check
pnpm exec supabase stop --no-backup
```

Sin Docker, `backend:check` no puede ejecutar PostgreSQL. La CI de
`release/test` y el disparo manual crean una base descartable para esa puerta.

Con el servidor oficial activo:

```bash
pnpm run smoke:localhost
pnpm run test:e2e
```

`pnpm run check` incluye agentes, workstreams, gobierno SOPM-Lite, skills, gobierno visual, TypeScript, ESLint y Vitest. La matriz manual por rol se encuentra en `docs/VALIDACION_LOCAL.md`.

## Usuarios de prueba

| Usuario | Rol |
| --- | --- |
| `cajero1` | Cajero |
| `cajero2` | Cajero |
| `encargado` | Encargado |
| `admin` | Administrador |

## Estructura principal

```text
src/App.tsx                         Orquestacion global y composicion
src/navigation/                     Rutas, titulos, menus y permisos
src/application/cash/               Apertura, lecturas y cierre
src/application/treasury/           Traspasos Caja/Principal y socios
src/application/expenses/           Gastos administrativos desde Principal
src/application/movements/          Movimientos operativos de Caja
src/application/salaries/           Liquidaciones y cierres salariales
src/application/ports/              Repositorio local y gateway remoto
src/data/                            Seed, normalizacion y migraciones
src/infrastructure/storage/          Snapshot y adaptador local
src/infrastructure/remote/           Configuracion, RPC y mapeo de migracion
supabase/migrations/                 Esquema relacional preparatorio
supabase/tests/database/             Pruebas pgTAP
src/lib/currentAccounts.ts           Definicion y saldos de cuentas
src/lib/accountMovements.ts          Asientos y contramovimientos
src/lib/cashTotals.ts                Totales de una recaudacion
src/lib/periodicTotals.ts            Consolidacion periodica
src/features/cashier/                Experiencia del Cajero
src/features/manager/                Control de diferencias y gastos
src/features/accounts/               Tesoreria y cuentas corrientes
src/features/salaries/               Liquidacion salarial
src/features/reports/                Reportes y cierres periodicos
src/types.ts                         Contratos de datos
```

## Documentacion canonica

- `docs/INDICE_DOCUMENTACION.md`: puerta de entrada y rutas de lectura.
- `docs/CONTEXTO_RAPIDO_CODEX.md`: contexto minimo para retomar.
- `docs/REGLAS_GENERALES.md`: reglas transversales.
- `docs/REGLAS_CONTABLES.md`: modelo economico, financiero y patrimonial.
- `docs/POSEIDON_FUNCIONAMIENTO.md`: funcionamiento completo vigente.
- `docs/MAPA_TECNICO.md`: propietarios, dependencias y deuda tecnica.
- `docs/MAPA_RUTAS.md`: URLs y protecciones.
- `docs/modulos/`: especificacion por modulo.
- `docs/contextos/`: contextos cortos para Codex.
- `docs/coordinacion/`: chats, estado, decisiones, migraciones, capacidades e integracion.
- `docs/contextos/CODEX_CALIDAD_PRUEBAS.md`: contrato del workstream permanente que prueba y asesora a Central.
- `docs/VALIDACION_LOCAL.md`: validacion automatica y manual.
- `docs/RELEASES_Y_DESPLIEGUES.md`: versiones, ambientes, candidatos y rollback.
- `docs/MATRIZ_MIGRACION_APPDATA_POSTGRESQL.md`: correspondencia local/remota.
- `CHANGELOG.md`: contenido de cada version.

## Limites actuales

- `localStorage` no es una base multiusuario ni durable.
- La sincronizacion actual cubre pestanas del mismo navegador, no equipos distintos.
- Chrome en `http://127.0.0.1:5173/` es la referencia operativa temporal; otros navegadores, perfiles u origenes conservan bases independientes.
- Los adjuntos no conservan el archivo real.
- La autorizacion es local y simulada.
- Multi-local completo, Auth, RPC de negocio, base remota activa y storage real
  quedan pendientes. El modo local usa `AppDataRepository`; la ruta remota usa
  `PoseidonCommandGateway` hacia PostgreSQL/Supabase, sin snapshot unico ni
  base local intermedia.

## Publicacion

La beta `0.1.0-beta.1` esta desplegada en el proyecto Vercel existente `poseidon-sistema-gestio`. La rama de produccion de ese proyecto es `release/test`, y `vercel.json` impide que `main` genere despliegues automaticos.

Flujo vigente:

```text
main validado -> candidato congelado en release/test + v0.1.0-beta.N -> despliegue explicito
```

La publicacion conserva datos separados en el `localStorage` de cada navegador. El dominio del plan Hobby es publico: funciona solamente como demo, no representa una base compartida y no debe recibir datos reales. Consultar `docs/RELEASES_Y_DESPLIEGUES.md`.

No hacer nuevos push, desplegar otra version, conectar Supabase ni activar otro servicio externo sin pedido explicito.
