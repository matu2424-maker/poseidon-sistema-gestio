# Poseidon Sistema de Gestion

Aplicacion web local para gestionar caja diaria, maquinas, gastos, transferencias, regalos, salarios, clientes, cierres, reportes, cuentas corrientes y auditoria del local Poseidon.

El sistema esta en etapa de prueba local. No usa Supabase/Auth real ni storage real de archivos todavia.

## Stack tecnico

- React
- Vite
- TypeScript
- CSS global simple
- Persistencia local con `localStorage`
- Usuarios simulados en frontend

## Estado actual

- Persistencia: `localStorage`, clave `poseidon-sistema-gestion-v2`.
- Login local: se selecciona un usuario activo desde una lista, sin contrasena.
- Local principal: `Poseidon`.
- La demo inicial trae datos para probar: 3 maquinas activas, 3 cajas cerradas de julio 2026, una diferencia pendiente, gastos, salarios, regalos, transferencias, aportes, retiros, cuentas corrientes y auditoria.
- El sistema mantiene preparacion multi-local, aunque hoy se trabaja con Poseidon.
- Los comprobantes e imagenes guardan metadatos, no el archivo completo, para evitar superar el limite de `localStorage`.
- Supabase/Auth real y storage real quedan pendientes para una etapa posterior.
- No publicar ni desplegar sin confirmacion explicita.

## Ejecutar el proyecto

### Camino oficial en Windows

Usar siempre:

```text
iniciar-poseidon.bat
```

Abrir:

```text
http://127.0.0.1:5173/
```

Este script levanta Vite en modo desarrollo con puerto estricto. No usar Python, `pnpm preview` ni servidores alternativos para el trabajo diario.

Para verificar el entorno sin iniciar el servidor:

```text
iniciar-poseidon.bat --check
```

Para liberar el puerto si quedo un proceso colgado:

```text
detener-poseidon.bat
```

Si faltan dependencias, ejecutar una vez:

```bash
pnpm install
```

## Validacion minima

Antes de cerrar cambios:

```bash
pnpm run build
```

Y verificar que responda:

```text
http://127.0.0.1:5173/
```

## Documentacion de trabajo

- `docs/CONTEXTO_RAPIDO_CODEX.md`: entrada rapida para retomar.
- `docs/HANDOFF_TECNICO_POSEIDON.md`: handoff completo para migrar el proyecto a otra cuenta/agente.
- `docs/CONTEXTO_INICIAL_NUEVA_CUENTA.md`: prompt corto para iniciar una nueva cuenta de ChatGPT con el contexto minimo.
- `docs/REGLAS_GENERALES.md`: reglas generales de trabajo, auditoria y documentacion.
- `docs/REGLAS_CONTABLES.md`: matriz de impactos economicos, financieros y cuentas corrientes.
- `docs/REGLAS_VISUALES.md`: criterios visuales permanentes.
- `docs/MODULARIZACION_REFERENCIAS.md`: plan de refactor modular con referencias cruzadas.
- `docs/PLAN_MEJORA_TECNICA_Y_TOKENS.md`: plan para mejorar estructura y reducir consumo de contexto/tokens.
- `docs/contextos/`: contextos cortos para trabajar por modulo sin releer todo el sistema.
- `docs/modulos/`: especificacion funcional por pantalla/modulo.

Cuando un modulo este estable, Codex debe sugerir un commit local. El commit no se hace sin confirmacion explicita del usuario.

## Usuarios de prueba

| Usuario | Rol |
| --- | --- |
| `cajero1` | Cajero |
| `cajero2` | Cajero |
| `encargado` | Encargado |
| `admin` | Administrador |

## Roles

- `CAJERO`: opera caja diaria, contadores, gastos, transferencias, regalos, salarios y clientes desde un panel sin barra lateral.
- `ENCARGADO`: revisa diferencias, gastos, cierres periodicos, cuentas corrientes, personal/salarios, clientes, reportes y auditoria. Puede cambiar a funcion cajero.
- `ADMINISTRADOR`: gestiona locales, maquinas, taller, usuarios, personal, liquidaciones, clientes, categorias, reportes, auditoria y cuentas corrientes. Puede cambiar a funcion cajero.

La auditoria registra usuario real y funcion usada.

## Modulos implementados

- Pantalla inicial y login local.
- Panel de cajero.
- Panel de encargado en redisenio.
- Panel de administrador.
- Apertura de caja diaria.
- Carga de contadores IN/OUT con guardado manual.
- Gastos con categorias/subcategorias.
- Transferencias.
- Regalos asociados a clientes.
- Pago simple de salarios desde cajero.
- Clientes con documento, foto y archivo de cedula/pasaporte como metadatos.
- Retiros y aportes de capital.
- Cierre de caja con declaracion de efectivo y banco.
- Resumen de cajas cerradas.
- Diferencias de caja con gestion por encargado/admin.
- Cuentas corrientes de local efectivo, local banco, empleados y transferencias.
- Locales con maquinas asociadas, historial y cierre de local.
- Maquinas con taller, desuso, reset, historial y auditoria.
- Personal y liquidacion simple de salarios.
- Liquidacion de salarios por periodo trabajado, con tabla por empleado, detalle ordenable, cuenta corriente del empleado y cierre de liquidacion.
- Papelera para personal y clientes.
- Reportes y exportacion Excel-compatible.
- Auditoria general.
- Cierre periodico semanal, quincenal, mensual o por rango de fechas.

## Reglas contables importantes

- Resultado economico = `resultado de maquinas - gastos - salarios - regalos`.
- Transferencias, aportes, retiros, efectivo inicial y banco inicial son movimientos financieros o de caja; no cambian el resultado economico.
- Las diferencias de efectivo o banco no modifican el resultado economico.
- Las diferencias si mueven la cuenta corriente del local al cerrar caja, para que la siguiente apertura use el saldo real declarado.
- Las diferencias quedan pendientes, visibles y auditadas hasta que un encargado o administrador las verifique, corrija o anule con observacion.
- Corregir una diferencia permite editar efectivo/banco declarado y recalcula los movimientos de cuenta de esa recaudacion.
- La pantalla de Diferencias funciona como historial por periodo: mes actual, mes anterior o intervalo manual, incluyendo diferencias ya resueltas/corregidas.
- Si se anula una diferencia, se anulan sus movimientos de cuenta; cualquier correccion adicional posterior debe hacerse con ajuste explicito y auditado.
- En salarios, el salario pagado no puede superar el salario base, salario pagado + adelantos tampoco puede superar el salario base y salario pagado + adelantos + descuentos tampoco puede superar el salario base.
- En salarios, `Pagado / Entregado` no resta descuentos porque descuento no es dinero entregado; `Cubierto base` es salario pagado + adelantos + descuentos.
- `EXTRA` queda como codigo tecnico interno y en la interfaz se muestra como `Premio / Gratificacion`, separado del modulo Regalos de clientes.
- Los cambios de salario base son prospectivos: no afectan cierres de liquidacion ya cerrados y requieren reconfirmacion si impactan liquidaciones abiertas.
- El salario se controla por periodo trabajado; un pago realizado del 1 al 10 del mes siguiente puede quedar asociado al mes trabajado anterior.

## Panel del cajero

- Si no hay caja abierta, solo permite `Clientes`, `Resumen cajas` y `Abrir caja`.
- Si hay caja abierta, permite operar contadores, gastos, transferencias, regalos, salarios, retiros/aportes y cierre.
- Al cerrar caja se envia al resumen de cajas.
- Los importes se escriben como numeros simples y se visualizan con separador de miles por punto.
- IN/OUT actual no puede ser menor al anterior.

## Panel del encargado

Estado actual del panel:

- Diferencias del local activo.
- Cuenta efectivo.
- Cuenta banco.
- Ingreso total del mes actual hasta hoy.
- Salida total del mes actual hasta hoy.
- Resultado neto del mes actual hasta hoy.
- Accesos rapidos a diferencias, cuentas corrientes, control de gastos, salarios y resumen de cajas.

Para volver a cargar los datos demo, entrar como `admin` y usar `Reiniciar demo`.

El encargado tambien accede desde la barra lateral a:

- Diferencias.
- Control de gastos.
- Auditoria.
- Cuentas corrientes.
- Caja diaria.
- Cierre periodico.
- Reportes.
- Personal.
- Liquidacion de salarios.
- Clientes.

## Administracion

El administrador puede gestionar:

- Locales.
- Maquinas.
- Taller.
- Categorias de gastos.
- Usuarios.
- Personal.
- Liquidacion de salarios.
- Clientes.
- Papelera.
- Reportes.
- Auditoria.
- Cuentas corrientes.
- Diferencias.

Para operar caja, administrador y encargado cambian a funcion `CAJERO`.

## Criterios visuales

- Disenar pensando en 1080p.
- Botones alineados y consistentes.
- Acciones al borde inferior/derecho dentro de tarjetas.
- Tablas compactas y legibles.
- No repetir arriba y abajo los datos que ya muestra la barra superior.
- En pantallas del encargado, los recuadros de resumen usan estetica tipo `Datos de caja`: etiqueta chica, valor fuerte debajo, filas etiqueta/dato y botones alineados abajo a la derecha.
- La barra lateral usa grupos desplegables y abre automaticamente el grupo activo.

## Estructura del proyecto

```text
src/App.tsx                    Estado global, lectura/escritura local, acciones y composicion de pantallas
src/data/appData.ts            Datos demo, reset operativo, ID visible de caja y normalizacion/migracion
src/types.ts                   Tipos principales del sistema
src/lib/                       Reglas compartidas: dinero, fechas, auditoria, clientes, archivos, exportacion, storage, presentacion, IDs, personal, historial de maquinas, cuentas, movimientos, caja, diferencias, salarios y ordenamiento
src/components/ui.tsx          Componentes compartidos: tarjetas, modales, botones basicos y selector de columnas
src/features/layout/           Pantalla inicial, login, layout lateral, layout cajero y navegacion base
src/features/dashboard/        Paneles iniciales por rol y accesos rapidos
src/features/accounts/         Cuentas corrientes y detalle de movimientos
src/features/cashier/          Pantallas extraidas de caja diaria y resumen
src/features/manager/          Diferencias y control de gastos del encargado/admin
src/features/salaries/         Liquidacion de salarios y detalle de empleado
src/features/admin/            Clientes, personal, papelera, usuarios y categorias extraidos
src/features/audit/            Bitacora general de auditoria
src/features/reports/          Reportes iniciales, exportaciones y cierres periodicos
src/styles/global.css          Estilos globales
src/components/WelcomeScreen.tsx Componente heredado/no conectado al flujo actual
docs/POSEIDON_FUNCIONAMIENTO.md Reglas funcionales vivas
docs/HANDOFF_TECNICO_POSEIDON.md Handoff tecnico completo para otra cuenta/agente
docs/CONTEXTO_INICIAL_NUEVA_CUENTA.md Prompt corto para iniciar nueva cuenta
docs/RETOMAR_MANANA.md         Resumen para retomar trabajo
docs/MAPA_TECNICO.md           Mapa tecnico de pantallas, clases y reglas
docs/CONTEXTO_RAPIDO_CODEX.md  Contexto corto para cargar rapido el proyecto
docs/REGLAS_GENERALES.md       Reglas globales funcionales, contables y esteticas
docs/modulos/                  Reglas detalladas por panel o modulo
AGENTS.md                      Instrucciones para Codex/agentes
iniciar-poseidon.bat           Camino oficial para levantar localhost
detener-poseidon.bat           Libera el puerto local 5173
```

## Refactor pendiente

`src/App.tsx` todavia concentra estado global, acciones principales y composicion de pantallas. Ya se extrajeron `src/types.ts`, datos demo/normalizacion y reglas compartidas hacia `src/data/`, `src/lib/`, `src/components/` y `src/features/`:

- `src/data/appData.ts`
- `money.ts`
- `dates.ts`
- `audit.ts`
- `clients.ts`
- `files.ts`
- `export.ts`
- `storage.ts`
- `sorting.ts`
- `currentAccounts.ts`
- `accountMovements.ts`
- `cashTotals.ts`
- `differences.ts`
- `display.ts`
- `ids.ts`
- `people.ts`
- `machineHistory.ts`
- `salaryRules.ts`
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
- `src/features/manager/Expenses.tsx`
- `src/features/salaries/SalarySettlements.tsx`
- `src/features/admin/Clients.tsx`
- `src/features/admin/Staff.tsx`
- `src/features/admin/Settings.tsx`
- `src/features/admin/LocationsMachines.tsx`
- `src/features/audit/Audit.tsx`
- `src/features/reports/Reports.tsx`
- `src/features/reports/Periodic.tsx`

Pendientes naturales:

- Mantener `src/App.tsx` como orquestador y extraer nuevos bloques solo cuando bajen contexto o reduzcan riesgo real.
- Seguir cerrando bloques estables con build, localhost y commit local.

## Documentacion viva

- Reglas funcionales: `docs/POSEIDON_FUNCIONAMIENTO.md`
- Resumen para retomar: `docs/RETOMAR_MANANA.md`
- Mapa tecnico: `docs/MAPA_TECNICO.md`
- Contexto rapido: `docs/CONTEXTO_RAPIDO_CODEX.md`
- Reglas generales: `docs/REGLAS_GENERALES.md`
- Modulos: `docs/modulos/`
- Instrucciones de trabajo: `AGENTS.md`

## Publicacion

El proyecto tiene `vercel.json`, pero no se debe publicar ni desplegar sin confirmacion explicita.

Configuracion prevista para Vercel:

```text
Install Command: pnpm install
Build Command: pnpm run build
Output Directory: dist
```
