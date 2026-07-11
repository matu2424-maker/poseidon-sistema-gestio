# Poseidon Sistema de Gestion

Aplicacion web local para gestionar caja diaria, maquinas, gastos, transferencias, regalos, salarios, clientes, cierres, reportes, cuentas corrientes y auditoria del local Poseidon.

El sistema esta en etapa de prueba local. No usa Supabase/Auth real ni storage real de archivos todavia.

## Stack tecnico

- React
- Vite
- TypeScript
- CSS global simple
- Persistencia local versionada con `localStorage`
- Usuarios simulados en frontend

## Estado actual

- Persistencia: snapshot JSON versionado en `localStorage`, clave `poseidon-sistema-gestion-v2`.
- El administrador puede exportar e importar respaldos desde `Sistema > Datos locales`.
- Si el snapshot esta corrupto, la aplicacion no lo reemplaza: ofrece descargarlo antes de iniciar datos nuevos.
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
pnpm run check
pnpm run build
```

Con el servidor activo, verificar que responda:

```bash
pnpm run smoke:localhost
pnpm run test:e2e
```

La prueba E2E usa Chrome en modo aislado y exige que `iniciar-poseidon.bat` ya este activo. Recorre apertura, carga de las tres maquinas, cierre sin diferencias y persistencia de la recaudacion tras recargar.

La matriz de smoke por rol esta en `docs/VALIDACION_LOCAL.md`.

URL:

```text
http://127.0.0.1:5173/
```

## Documentacion de trabajo

- `docs/INDICE_DOCUMENTACION.md`: puerta de entrada, perfiles de lectura y fuentes canonicas.
- `docs/CONTEXTO_RAPIDO_CODEX.md`: entrada rapida para retomar.
- `docs/HANDOFF_TECNICO_POSEIDON.md`: handoff compacto para otra cuenta/agente.
- `docs/CONTEXTO_INICIAL_NUEVA_CUENTA.md`: prompt corto para iniciar una nueva cuenta de ChatGPT con el contexto minimo.
- `docs/REGLAS_GENERALES.md`: reglas generales de trabajo, auditoria y documentacion.
- `docs/REGLAS_CONTABLES.md`: matriz de impactos economicos, financieros y cuentas corrientes.
- `docs/REGLAS_VISUALES.md`: criterios visuales permanentes.
- `docs/VALIDACION_LOCAL.md`: comandos y smoke funcional por rol.
- `docs/MODULARIZACION_REFERENCIAS.md`: plan de refactor modular con referencias cruzadas.
- `docs/PLAN_MEJORA_TECNICA_Y_TOKENS.md`: plan para mejorar estructura y reducir consumo de contexto/tokens.
- `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`: diseno futuro, no implementado.
- `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`: etapas y controles para una migracion futura autorizada.
- `docs/contextos/`: contextos cortos para trabajar por modulo sin releer todo el sistema.
- `docs/modulos/`: especificacion funcional por pantalla/modulo.

Cuando un bloque quede estable y validado, se cierra con commit local segun las reglas de trabajo. No hacer push, publicacion ni despliegue sin confirmacion explicita.

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
- Respaldo/importacion validada de datos locales.
- Cierre periodico semanal, quincenal, mensual o por rango de fechas.

## Reglas contables importantes

- Resultado economico = `resultado de maquinas - gastos - salarios - regalos`.
- Transferencias, aportes, retiros, efectivo inicial y banco inicial son movimientos financieros o de caja; no cambian el resultado economico.
- Las diferencias de efectivo o banco no modifican el resultado economico.
- Las diferencias si mueven la cuenta corriente del local al cerrar caja, para que la siguiente apertura use el saldo real declarado.
- Las diferencias quedan pendientes, visibles y auditadas hasta que un encargado o administrador las verifique, corrija o anule con observacion.
- Corregir una diferencia permite editar efectivo/banco declarado y recalcula los movimientos de cuenta de esa recaudacion.
- La pantalla de Diferencias funciona como historial por periodo: mes actual, mes anterior o consulta historica por mes/ano, incluyendo diferencias ya verificadas/corregidas/anuladas.
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
src/navigation/lazyScreens.ts Carga diferida de pantallas por feature
src/data/appData.ts            Datos demo, reset operativo, ID visible de caja y normalizacion/migracion
src/types.ts                   Tipos principales del sistema
src/lib/                       Reglas compartidas: dinero, fechas, periodos, referencias de recaudacion, auditoria, clientes, archivos, exportacion, storage, presentacion, IDs, personal, historial de maquinas, cuentas, movimientos, caja, diferencias, salarios y ordenamiento
src/components/                Componentes compartidos: tarjetas, modales, botones, selector de columnas y selector mensual
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
docs/INDICE_DOCUMENTACION.md   Indice, rutas de lectura y fuentes canonicas
docs/HANDOFF_TECNICO_POSEIDON.md Handoff tecnico compacto
docs/CONTEXTO_INICIAL_NUEVA_CUENTA.md Prompt corto para iniciar nueva cuenta
docs/RETOMAR_MANANA.md         Resumen para retomar trabajo
docs/MAPA_TECNICO.md           Propiedad, dependencias y deuda tecnica
docs/CONTEXTO_RAPIDO_CODEX.md  Contexto corto para cargar rapido el proyecto
docs/REGLAS_GENERALES.md       Reglas transversales de trabajo y auditoria
docs/ARQUITECTURA_OBJETIVO_ONLINE.md Diseno futuro sin implementar
docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md Plan futuro reversible
docs/modulos/                  Reglas detalladas por panel o modulo
AGENTS.md                      Instrucciones para Codex/agentes
iniciar-poseidon.bat           Camino oficial para levantar localhost
detener-poseidon.bat           Libera el puerto local 5173
```

## Refactor pendiente

`src/App.tsx` ya es principalmente orquestador. Las proximas prioridades son dividir Locales/Maquinas, Movimientos y Salarios; separar seed de normalizacion; y extraer comandos de dominio con pruebas. El plan y las referencias cruzadas viven en `docs/PLAN_MEJORA_TECNICA_Y_TOKENS.md` y `docs/MODULARIZACION_REFERENCIAS.md`.

## Documentacion viva

- Indice y fuentes canonicas: `docs/INDICE_DOCUMENTACION.md`
- Reglas funcionales: `docs/POSEIDON_FUNCIONAMIENTO.md`
- Resumen para retomar: `docs/RETOMAR_MANANA.md`
- Mapa tecnico: `docs/MAPA_TECNICO.md`
- Contexto rapido: `docs/CONTEXTO_RAPIDO_CODEX.md`
- Reglas generales: `docs/REGLAS_GENERALES.md`
- Modulos: `docs/modulos/`
- Instrucciones de trabajo: `AGENTS.md`
- Arquitectura futura: `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`
- Migracion futura: `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`

## Publicacion

El proyecto sigue en modo local. `vercel.json` existe como preparacion historica, pero no se debe publicar, desplegar, conectar Supabase ni activar servicios externos sin confirmacion explicita.

Configuracion prevista para Vercel:

```text
Install Command: pnpm install
Build Command: pnpm run build
Output Directory: dist
```
