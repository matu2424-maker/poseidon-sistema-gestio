# Poseidon - Handoff tecnico completo

Ultima actualizacion: 2026-07-10

Este documento permite que otro agente continue el desarrollo de Poseidon Sistema de Gestion sin haber leido el chat original. Debe leerse antes de modificar codigo, documentacion, configuracion o datos.

## Ordenes directas para el agente que continua

1. Antes de modificar codigo, lee este handoff completo.
2. Luego lee `AGENTS.md`, `docs/CONTEXTO_RAPIDO_CODEX.md`, `docs/REGLAS_GENERALES.md`, `docs/POSEIDON_FUNCIONAMIENTO.md` y el contexto del modulo que se va a tocar.
3. Si el cambio toca caja, cierre, diferencias, cuentas corrientes, salarios, gastos, transferencias, regalos, retiros o aportes, lee `docs/REGLAS_CONTABLES.md`.
4. Si el cambio toca interfaz, lee `docs/REGLAS_VISUALES.md`.
5. Si el cambio mueve codigo entre archivos, lee `docs/MODULARIZACION_REFERENCIAS.md`.
6. No publiques ni despliegues sin autorizacion explicita del usuario.
7. No actives Supabase/Auth/Storage real sin autorizacion explicita.
8. No cambies reglas contables sin revisar `docs/REGLAS_CONTABLES.md` y documentar la razon.
9. Antes de editar, propone el cambio y espera aprobacion cuando el pedido sea exploratorio, salvo que el usuario diga explicitamente `hacelo`, `implementa`, `ejecuta` o una orden equivalente.
10. Si el usuario marca un objetivo activo para ejecutar mejoras, trabaja con autonomia dentro de ese objetivo: implementa, valida, documenta y commitea bloques locales estables sin pedir permiso paso a paso.
11. Aun con objetivo activo, no hagas push, publicacion, despliegue, conexion externa, cambios destructivos amplios ni decisiones de producto ambiguas sin confirmacion explicita.
12. Si modificas codigo, actualiza la documentacion correspondiente en el mismo bloque.
13. Toda tabla nueva o modificada debe permitir ordenar por cada columna visible de datos. Columnas de accion como `Editar`, `Gestionar`, `Ver` o `Eliminar` son la excepcion.
14. No borres historial operativo. Usa anulacion, estado, papelera o ajuste auditado.
15. Valida con `pnpm run build` y verifica `http://127.0.0.1:5173/`.
16. Para levantar localhost usa solo `iniciar-poseidon.bat`; si el puerto esta ocupado usa `detener-poseidon.bat`.
17. No uses Python, `pnpm preview` ni servidores alternativos para el flujo diario.
18. Si un bloque queda estable y validado, haz commit local como punto de control. No hagas push, publicacion ni despliegue sin pedido explicito del usuario.

## Ordenes contables criticas

- Resultado economico = resultado maquinas - gastos - salarios - regalos.
- Transferencias, aportes, retiros, efectivo inicial y banco inicial no cambian resultado economico.
- Diferencias de efectivo/banco no cambian resultado economico.
- Diferencias si mueven `Local / Efectivo` o `Local / Banco` para que la siguiente caja abra con saldo real declarado.
- `PENDIENTE` requiere gestion.
- `VERIFICADA` confirma que la diferencia existe y mantiene movimientos activos.
- `CORREGIDA` permite editar efectivo/banco declarado, recalcula diferencias, actualiza saldo proximo y resincroniza movimientos.
- `ANULADA` anula los movimientos de diferencia y revierte su impacto en cuentas.
- Salario pagado no puede superar salario base.
- Salario pagado + adelantos no puede superar salario base.
- Salario pagado + adelantos + descuentos no puede superar salario base.
- Descuento salarial no es salida de caja ni dinero entregado.

## Ordenes visuales

- Disenar para 1080p.
- Mantener botones alineados y de tamano consistente dentro de la misma zona.
- No repetir titulos que ya aparecen en la barra superior.
- Usar tablas compactas y profesionales.
- Evitar pantallas cargadas de tarjetas cuando la tabla debe ser el foco.
- Las acciones en tarjetas van al borde inferior y preferentemente a la derecha.
- Los recuadros con colores laterales quedan principalmente para botones o tarjetas de accion.
- En pantallas administrativas, el cuerpo debe arrancar directo con descripcion, filtros, resumen o tabla; no repetir el nombre de la pantalla.

## Resumen del proyecto

Poseidon Sistema de Gestion es una aplicacion web administrativa para gestionar:

- caja diaria;
- maquinas tragamonedas;
- recaudaciones;
- contadores IN/OUT;
- gastos;
- transferencias;
- regalos;
- retiros y aportes de capital;
- cierre de caja;
- diferencias de caja;
- cuentas corrientes internas;
- clientes;
- personal;
- liquidacion de salarios;
- locales, maquinas, taller y desuso;
- reportes;
- cierres periodicos;
- auditoria.

El sistema esta en prueba local. Hoy usa `localStorage`, usuarios simulados y archivos como metadatos. No hay backend real activo.

## Estado actual

- Stack: React + Vite + TypeScript.
- Estilos: CSS global en `src/styles/global.css`.
- Persistencia: `localStorage`.
- Clave: `poseidon-sistema-gestion-v2`.
- Login: seleccion local de usuario activo, sin contrasena.
- Usuarios demo: `cajero1`, `cajero2`, `encargado`, `admin`.
- Local principal: `Poseidon`.
- Demo inicial: 3 maquinas activas, 3 cajas cerradas de julio 2026, una diferencia pendiente, gastos, salarios, regalos, transferencias, aportes, retiros, cuentas corrientes y auditoria.
- Supabase/Auth/Storage real: pendiente.
- Vercel/publicacion: no publicar sin autorizacion explicita.

## Entorno y comandos

Dependencias principales segun `package.json`:

- `react`
- `react-dom`
- `lucide-react`
- `typescript`
- `vite`
- `@vitejs/plugin-react`

Instalacion si faltan dependencias:

```bash
pnpm install
```

Build:

```bash
pnpm run build
```

Servidor local oficial:

```text
iniciar-poseidon.bat
```

URL:

```text
http://127.0.0.1:5173/
```

Verificar entorno:

```text
iniciar-poseidon.bat --check
```

Liberar puerto:

```text
detener-poseidon.bat
```

En esta maquina puede ser necesario usar el runtime incluido por Codex para `pnpm`:

```powershell
$env:PATH='C:\Users\Mathias\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\Mathias\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;' + $env:PATH
& 'C:\Users\Mathias\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd' run build
```

## Estructura principal

```text
src/App.tsx                    Estado global, lectura/escritura local, acciones y composicion de pantallas
src/data/appData.ts            Datos demo, reset operativo, ID visible de caja y normalizacion/migracion
src/types.ts                   Tipos principales del dominio
src/lib/                       Reglas y helpers compartidos
src/components/ui.tsx          Componentes UI compartidos
src/features/layout/           Welcome, Login, Shell, CashierWorkspace
src/features/dashboard/        Paneles iniciales por rol
src/features/accounts/         Cuentas corrientes
src/features/cashier/          Apertura, cierre, contadores y movimientos del cajero
src/features/manager/          Diferencias y control de gastos
src/features/salaries/         Liquidacion de salarios
src/features/admin/            Clientes, personal, usuarios, categorias, locales, maquinas, taller
src/features/audit/            Auditoria
src/features/reports/          Reportes y cierres periodicos
src/styles/global.css          Estilos globales
docs/                          Documentacion funcional, tecnica y de reglas
```

## Arquitectura

`src/App.tsx` es el orquestador. Mantiene:

- estado global `AppData`;
- usuario logueado;
- rol efectivo/funcion usada;
- pantalla actual;
- mensajes;
- acciones principales que modifican datos;
- composicion de componentes por pantalla.

`src/data/appData.ts` contiene:

- `createSeedData()`;
- datos demo;
- `normalizeData()`;
- `clearOperationalData()`;
- `nextBalanceVisibleId()`;
- constantes de locales principales.

`src/lib/` contiene reglas compartidas:

- `money.ts`: dinero, contadores e inputs monetarios.
- `dates.ts`: fechas, horas y rangos mensuales.
- `audit.ts`: eventos de auditoria.
- `clients.ts`: documento, busqueda y duplicados de clientes.
- `export.ts`: CSV/Excel-compatible.
- `files.ts`: metadatos de archivos.
- `storage.ts`: `localStorage`, compactacion y preferencias.
- `currentAccounts.ts`: cuentas corrientes.
- `accountMovements.ts`: movimientos contables y sincronizacion.
- `cashTotals.ts`: totales de caja y contadores.
- `differences.ts`: diferencias de caja.
- `display.ts`: nombres visibles e IDs.
- `ids.ts`: IDs locales.
- `machineHistory.ts`: historial de maquinas.
- `people.ts`: nombres de personal e historial salarial.
- `salaryRules.ts`: conceptos, periodos, limites y calculos de salarios.
- `sorting.ts`: ordenamiento reusable de tablas.

`src/features/` contiene pantallas ya extraidas de `App.tsx`. Mantener este patron para nuevos refactors.

## Roles y navegacion

### Cajero

- No usa barra lateral.
- Si no hay caja abierta, solo puede usar `Clientes`, `Resumen cajas` y `Abrir caja`.
- Si hay caja abierta, puede operar contadores, gastos, transferencias, regalos, salarios, retiros/aportes y cierre.
- Al cerrar caja va directo a `Resumen de cajas`.

### Encargado

- Entra a `Panel encargado`.
- No opera caja desde menu lateral.
- Puede cambiar a funcion `CAJERO` desde cabecera.
- Revisa diferencias, gastos, cuentas corrientes, cierres periodicos, reportes, personal, liquidaciones y clientes.
- Ve solo datos de sus locales asignados. En demo trabaja con Poseidon.

### Administrador

- Gestiona todo.
- No opera caja desde menu lateral.
- Para abrir/cerrar/cargar caja cambia a funcion `CAJERO`.
- Puede reiniciar demo.

## Funcionalidades implementadas

- Pantalla inicial.
- Login local sin contrasena.
- Menu lateral agrupado y desplegable para encargado/admin.
- Panel del cajero.
- Panel del encargado.
- Panel del administrador.
- Apertura de caja diaria.
- Resumen de cajas cerradas.
- Carga de contadores IN/OUT.
- Validacion IN/OUT actual mayor o igual al anterior.
- Gastos con categorias/subcategorias.
- Control de gastos por encargado/admin.
- Transferencias.
- Regalos asociados a clientes.
- Pago simple de salarios desde cajero.
- Retiros y aportes de capital.
- Cierre de caja con efectivo y banco declarados.
- Diferencias de caja con gestion por encargado/admin.
- Cuentas corrientes de local efectivo, local banco, personal y transferencias.
- Locales con ID corto, locatario, telefono, email, direccion, Google Maps e imagenes como metadatos.
- Maquinas, taller, desuso, reset e historial.
- Personal con datos, cargo, horarios, salario, historial salarial y papelera.
- Clientes con documento, foto y cedula/pasaporte como metadatos.
- Liquidacion de salarios por periodo trabajado.
- Cuenta corriente del empleado dentro del detalle de liquidacion.
- Cierre de liquidacion de salarios como foto auditada.
- Reportes y exportacion CSV compatible con Excel.
- Cierre periodico semanal, quincenal, mensual o personalizado.
- Auditoria general.

## Reglas de caja

- Caja abre con saldo activo de `Local / Efectivo` y `Local / Banco`.
- Primera caja exige aporte inicial efectivo y banco.
- El saldo final declarado por el cajero define el saldo real de la siguiente apertura.
- Cierre registra usuario real y funcion usada.
- Si hay diferencia de efectivo o banco, observacion de cierre es obligatoria.
- Si hay maquinas pendientes sin observacion, no se puede cerrar.
- Contadores de una caja abierta no cambian por reset posterior de maquina. Para ver reset en 0 hay que cerrar caja, resetear y abrir nueva caja.

## Reglas de diferencias

- Diferencia efectivo = efectivo declarado - efectivo esperado.
- Diferencia banco = banco declarado - banco esperado.
- No modifican resultado economico.
- Si mueven cuentas del local.
- Pantalla `Diferencias` funciona como historial por periodo: mes actual, mes anterior o consulta historica por mes/ano.
- La tabla principal muestra caja, fecha, local, diferencia efectivo, diferencia banco, estado, ultima gestion y accion.
- La observacion original se consulta dentro del detalle para no cargar la grilla.
- El boton se mantiene como `Gestionar`.
- Modal de gestion muestra contexto, metricas, observaciones, formulario e historial.

## Reglas de salarios

- El salario base nace de `Personal` y su historial salarial.
- La liquidacion se asocia al periodo trabajado, no necesariamente a la fecha de pago.
- Salario de enero puede pagarse del 1 al 10 de febrero, pero se imputa a enero.
- Cajero solo carga nuevos conceptos `SALARIO` y `ADELANTO`.
- Encargado/admin pueden cargar `ADELANTO`, `SALARIO`, `EXTRA`, `HORAS_EXTRAS`, `AGUINALDO`, `SALARIO_VACACIONAL`, `DESCUENTO`.
- En UI, `EXTRA` se muestra como `Premio / Gratificacion`.
- `SUELDO` y `AJUSTE` quedan como heredados para compatibilidad.
- `Pagado / Entregado` = salario pagado + adelantos + premio/gratificacion + horas extras + bonos.
- `Cubierto base` = salario pagado + adelantos + descuentos.
- `Pendiente` = salario base - cubierto base.
- El cierre de liquidacion guarda una foto auditada. No borra movimientos ni calcula obligaciones legales automaticamente.

## Reglas de cuentas corrientes

Existen cuentas:

- `Local / Efectivo`;
- `Local / Banco`;
- cuenta personal por empleado;
- cuenta unica de transferencias.

Los saldos se calculan desde movimientos, no se cargan manualmente.

Impactos:

- Resultado maquinas positivo entra en `Local / Efectivo`.
- Resultado maquinas negativo sale de `Local / Efectivo`.
- Gastos, regalos y salarios salen de `Local / Efectivo`.
- Transferencias entran en `Local / Banco` y en cuenta de transferencias.
- Retiros salen de efectivo o banco segun medio.
- Aportes entran en efectivo o banco segun medio.
- Diferencias entran o salen de efectivo/banco segun signo.

## Reglas de locales y maquinas

- Local principal: Poseidon.
- Locales tienen ID numerico corto.
- Estados de local: `ACTIVO`, `INACTIVO`, `CERRADO`.
- Si local pasa a `CERRADO`, sus maquinas vuelven al Taller con confirmacion.
- Maquinas nacen en Taller.
- Estados de maquina: `ACTIVA`, `INACTIVA`, `MANTENIMIENTO`, `DESUSO`.
- `DESUSO` solo se permite cuando la maquina esta en Taller.
- Maquinas en `DESUSO` solo aparecen en Taller/desuso, no en listado general.
- Para eliminar maquina debe estar en Taller.
- No se puede eliminar maquina con recaudaciones.
- Reset de contadores queda auditado y no debe hacerse con caja abierta del local.

## Reglas de clientes y personal

Clientes:

- Se identifican por documento.
- Documento obligatorio.
- Tipo: Cedula o Pasaporte.
- Cedula solo numeros.
- Pasaporte letras y numeros.
- No duplicar documento entre activos/inactivos.
- Foto y cedula/pasaporte se guardan como metadatos locales.
- Pueden ir a papelera.

Personal:

- Campos obligatorios: nombre, apellido, cargo, local, estado, tipo salario y salario nominal.
- Cargos: `Cajera/o`, `Encargado/a`, `Mantenimiento`, `Limpieza`.
- Cambios de salario generan historial con fecha efectiva.
- Cambios de salario base son prospectivos y no afectan cierres cerrados.
- Personal puede ir a papelera.

## Auditoria

Todo cambio importante debe registrar:

- fecha/hora;
- usuario real;
- rol real;
- funcion usada;
- accion;
- entidad;
- id de entidad;
- valor anterior;
- valor nuevo;
- motivo/observacion.

No usar eliminacion silenciosa.

## Convenciones de UI

- CSS global en `src/styles/global.css`.
- Tarjetas simples, radio bajo, colores sobrios.
- Evitar decoracion innecesaria.
- Tablas densas y escaneables.
- Columnas visibles de datos siempre ordenables.
- Acciones alineadas.
- Mensajes de error en la pantalla/modal donde ocurre el problema.
- Inputs monetarios: escribir `1000`, mostrar `1.000`.
- Si un monto en 0 recibe foco, se limpia; si queda vacio, vuelve a 0.

## Convenciones de documentacion

Actualizar docs en el mismo bloque del cambio:

- Regla global: `docs/REGLAS_GENERALES.md`.
- Regla contable: `docs/REGLAS_CONTABLES.md`.
- Regla visual: `docs/REGLAS_VISUALES.md`.
- Funcionamiento general: `docs/POSEIDON_FUNCIONAMIENTO.md`.
- Pantalla/modulo: `docs/modulos/`.
- Contexto corto: `docs/contextos/`.
- Mapa tecnico: `docs/MAPA_TECNICO.md`.
- Retomar trabajo: `docs/RETOMAR_MANANA.md`.
- Ejecucion/publicacion: `README.md`.

## Documentos que debe leer el proximo agente

Orden recomendado:

1. `AGENTS.md`
2. `docs/HANDOFF_TECNICO_POSEIDON.md`
3. `docs/CONTEXTO_RAPIDO_CODEX.md`
4. `docs/REGLAS_GENERALES.md`
5. `docs/POSEIDON_FUNCIONAMIENTO.md`
6. `docs/MAPA_TECNICO.md`
7. `docs/REGLAS_CONTABLES.md` si toca contabilidad/caja/salarios.
8. `docs/REGLAS_VISUALES.md` si toca UI.
9. Contexto corto de `docs/contextos/` que corresponda.
10. Documento de `docs/modulos/` que corresponda.

## Estado de modularizacion

Ya salieron de `src/App.tsx`:

- tipos principales;
- datos demo/normalizacion;
- helpers de dinero, fechas, auditoria, storage, IDs, display;
- cuentas corrientes y movimientos contables;
- totales de caja;
- diferencias;
- salarios;
- clientes;
- archivos;
- ordenamiento;
- UI compartida;
- layout base;
- paneles por rol;
- cuentas corrientes;
- diferencias;
- gastos del encargado;
- apertura/resumen/cierre de caja;
- contadores;
- movimientos del cajero;
- liquidacion de salarios;
- clientes;
- personal;
- usuarios/categorias;
- locales/maquinas/taller;
- auditoria;
- reportes;
- cierres periodicos.

`src/App.tsx` sigue siendo orquestador. No refactorizar por deporte: extraer solo si baja contexto o reduce riesgo real.

## Pendientes conocidos

- Supabase/Auth real pendiente.
- Storage real de comprobantes/imagenes pendiente.
- Publicacion online pendiente de autorizacion.
- Posible limpieza futura: `src/components/WelcomeScreen.tsx` es heredado/no conectado.
- Continuar refinando panel del encargado por etapas si el usuario lo pide.
- Revisar y confirmar visualmente la ultima mejora de `Diferencias` en navegador antes de considerarla lista para commit.
- Commits locales pendientes si el usuario confirma: el ultimo bloque de UI de `Diferencias` y este handoff.

## Bugs o riesgos conocidos

- `localStorage` puede fallar si se intenta guardar archivos grandes/base64. Por eso solo se guardan metadatos de archivos.
- Hay texto sin acentos en varios lugares para evitar problemas de codificacion.
- Si el servidor local no levanta, usar `detener-poseidon.bat` y luego `iniciar-poseidon.bat`; no improvisar servidores alternativos.
- El sistema aun no tiene backend real; los datos viven en el navegador.
- Si se cambia normalizacion de datos, revisar `src/data/appData.ts` con mucho cuidado porque cruza todos los modulos.

## Recomendaciones para ahorrar tokens

- Leer primero `docs/CONTEXTO_RAPIDO_CODEX.md`.
- Leer solo el contexto corto del modulo afectado.
- Usar `rg` para buscar funciones concretas.
- No abrir `src/App.tsx` completo salvo necesidad.
- Trabajar por cortes chicos.
- No mezclar UI, contabilidad y refactor en el mismo bloque si no es necesario.
- Actualizar docs en el mismo bloque.
- Cerrar bloque estable con build, localhost y commit local cuando este validado.

## Ultimos commits relevantes

Ultimos commits locales observados al generar este handoff:

```text
07c9825 refactor: extrae datos demo
43e0fb7 refactor: reutiliza helpers de presentacion
afe9ddc refactor: elimina helper sin uso
e2a7fc8 refactor: extrae paneles por rol
dacbafa refactor: extrae cuentas corrientes
ae02fb9 refactor: extrae layout base
a224382 refactor: limpia app principal
35a1bd5 refactor: extrae locales y maquinas
422eb6b refactor: extrae cierres periodicos
d4bd350 refactor: extrae reportes
646086d refactor: extrae auditoria
a0ca47b refactor: extrae control de gastos
```

## Estado de trabajo al crear este handoff

Al momento de crear este documento habia cambios sin commit relacionados con:

- rediseño minimalista de `Diferencias`;
- documentacion de diferencias;
- este handoff y contexto inicial de nueva cuenta.

Antes de continuar en otra cuenta, ejecutar:

```bash
git status --short
pnpm run build
```

Y verificar:

```text
http://127.0.0.1:5173/
```
