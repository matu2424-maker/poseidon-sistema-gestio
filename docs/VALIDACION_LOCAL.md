# Poseidon - Validacion local

Ultima actualizacion: 2026-07-26

Este documento define la validacion tecnica y funcional minima. Es la unica fuente canonica para conteos y evidencia vigente; otros documentos deben referenciarlo sin copiar esas cifras. No reemplaza las pruebas especificas de cada modulo.

## Validacion automatica

Con el runtime del proyecto disponible:

```bash
pnpm run check:agents
pnpm run check:workstreams
pnpm run check:governance
pnpm run check:skills
pnpm run check:design
pnpm run check
pnpm run build
pnpm run release:check
pnpm run check:commit
```

`pnpm run check` ejecuta, en orden:

1. Validacion de 28 controles de agentes Codex.
2. Validacion de 67 controles de chats, propietarios y referencias de workstreams, incluido Calidad y Pruebas.
3. Validacion de 52 controles SOPM-Lite: 7 decisiones, 2 migraciones, 17 capacidades, estado y rutas.
4. Validacion de cuatro skills y sus contratos.
5. Validacion de 38 controles de gobierno visual, pilotos, referencias, tablas accesibles y pesos tipograficos funcionales.
6. TypeScript sin emitir archivos.
7. ESLint sobre `src/`, `e2e/` y `scripts/`, sin aceptar advertencias.
8. Vitest sobre `src/` y `scripts/`.

`check:agents`, `check:governance`, `check:workstreams`, `check:skills` y `check:design` pueden ejecutarse por separado. `check:workstreams` incluye gobierno para evitar una coordinacion parcialmente validada. `check:commit` selecciona el control proporcional a las rutas preparadas y es la entrada obligatoria antes de un commit.

`pnpm run release:check` se ejecuta despues del commit candidato. Exige un worktree limpio y valida version, changelog, runtime, package manager, rutas sensibles, Vercel, workflow y etiqueta esperada.

## Backend preparatorio

La comprobacion completa requiere Docker:

```bash
pnpm exec supabase start
pnpm run backend:check
pnpm exec supabase stop --no-backup
```

`backend:check` ejecuta lint de base y cuatro archivos pgTAP. El workflow de
`release/test` reproduce estos pasos en una base descartable.

En el equipo local actual no estan disponibles Docker ni `psql`. Por eso:

- las seis migraciones y cuatro pruebas SQL fueron parseadas sin error;
- los cuatro planes pgTAP coinciden con sus aserciones;
- Vitest controla orden, transacciones, permisos, RLS y contratos sensibles;
- no se declara lint PostgreSQL ni pgTAP local aprobado.

La activacion remota permanece bloqueada hasta contar con una ejecucion real
desde base vacia.

## Rendimiento de la validacion profunda

La medicion reproducible se ejecuta sin escribir datos:

```bash
pnpm run measure:snapshot-validation
```

Acepta `--records=<cantidad>` y `--runs=<cantidad>`. La referencia final del 2026-07-19, con 10.000 eventos de auditoria y 20 ejecuciones, dio mediana `19,73 ms`, p95 `21,54 ms` y maximo `22,52 ms` en este equipo. Es evidencia comparativa para detectar regresiones; no es un umbral rigido de CI porque depende del hardware y la carga local.

## Entorno y servidor

```text
iniciar-poseidon.bat --check
```

`--check` valida Node, Vite y si el puerto 5173 esta libre u ocupado sin iniciar otro servidor. Si esta libre, iniciar con `iniciar-poseidon.bat`. Si esta ocupado, comprobar smoke y navegador antes de asumir que el proceso corresponde a Poseidon. Para liberar el puerto usar `detener-poseidon.bat`.

Con `iniciar-poseidon.bat` activo:

```bash
pnpm run smoke:localhost
pnpm run test:e2e
```

El smoke HTTP exige respuesta `200`, nodo `#root` y titulo de Poseidon en `http://127.0.0.1:5173/`.

## Chrome como fuente canonica

- Toda validacion manual que lea o modifique datos locales se realiza en el perfil habitual de Chrome del usuario.
- El origen canonico es exactamente `http://127.0.0.1:5173/`; `localhost`, otro perfil, incognito u otro navegador mantienen almacenamientos independientes.
- Codex nombra una sesion `Poseidon - <tarea>`, crea las pestanas de trabajo dentro de ese grupo y evita reclamar pestanas personales abiertas por el usuario.
- Al finalizar se conservan solo las pestanas utiles para el usuario; las temporales se cierran.
- El navegador integrado no se usa para crear, editar, importar ni validar datos operativos.
- Si Chrome no esta disponible o no puede controlarse, registrar la limitacion y no sustituirlo silenciosamente por otro navegador.
- Evitar que el usuario y una automatizacion modifiquen simultaneamente el mismo perfil de Chrome.
- Antes de importar, reiniciar o reemplazar datos del perfil canonico, generar respaldo y solicitar confirmacion.

Si la extension figura instalada pero Codex no puede conectarse, realizar una sola reconexion mediante el plugin y comprobarla abriendo una pestana temporal. No inferir el estado del control solo desde claves del registro de Windows. Si la conexion oficial sigue sin estar disponible, reinstalar el plugin desde Codex, reiniciar Chrome y repetir esa comprobacion antes de usar datos operativos.

Esta regla evita confundir copias independientes de `localStorage`; no convierte la persistencia local en una base multiusuario.

La suite Playwright usa un perfil aislado de Chrome. `e2e/support/poseidon.ts` centraliza la limpieza de la clave local, sesion e ingreso por usuario. Los casos cubren apertura, tres lecturas, cierre y persistencia; diferencias/auditoria; rutas, permisos y funcion activa; conflicto entre pestañas; cierre salarial correctivo; tesoreria; cierre periodico; formularios administrativos; reinicio e importacion invalida. Las trazas y capturas se conservan solo cuando falla.

El perfil de Playwright es descartable: valida comportamiento reproducible y nunca reemplaza ni certifica el estado operativo del perfil canonico de Chrome.

## Smoke de interfaz por rol

### Cajero

1. Entrar como `Cajero 1`.
2. Sin caja abierta, verificar que solo se pueda abrir caja, consultar clientes y ver resumen de cajas.
3. Intentar una pantalla que requiera caja debe mostrar `Necesita abrir una nueva caja para poder operar.`.
4. Con caja abierta, verificar contadores, gastos, transferencias, regalos, salarios, Caja/Principal y cierre.
5. Verificar que un traspaso Principal -> Caja actualice ambos libros y el efectivo esperado sin cambiar el resultado economico.
6. En cierre, registrar un traspaso Caja -> Principal y comprobar que la proxima apertura herede solo el remanente de Caja.

### Encargado

1. Entrar como `Encargado` y confirmar `Funcion: Encargado`.
2. Ver diferencias, cuentas de efectivo/banco y totales mensuales.
3. Abrir `Cierres y reportes`: debe mostrar Resumen de cajas, Cierre periodico y Reportes; no apertura/cierre operativo.
4. Abrir Resumen de cajas y comprobar tabla ordenable y detalle de recaudacion.
5. En Liquidacion de salarios, abrir una foto cerrada y verificar bloqueo del periodo y flujo correctivo.
6. Registrar un gasto y una liquidacion desde Principal sin caja abierta; comprobar que Caja no cambie.
7. En Cuentas corrientes, registrar Caja/Principal y un aporte/retiro real de socio; verificar asientos y auditoria.
8. Usar `Trabajar como cajero` para apertura, contadores, movimientos y cierre; el usuario real debe seguir siendo Encargado.

### Administrador

1. Entrar como `Administrador` y confirmar grupos Inicio, Control, Cierres, Gestion, Personas y Sistema.
2. Abrir Locales, Maquinas y Taller.
3. Abrir el editor flotante de un local y de una maquina sin guardar cambios.
4. Verificar Datos locales, Auditoria y Resumen de cajas.
5. Usar `Trabajar como cajero` solo para operaciones de caja; el usuario real debe seguir siendo Administrador.

## Criterio visual

- Verificar escritorio 1920 x 1080 y un viewport movil menor a 720 px cuando cambie CSS o layout.
- No debe haber superposiciones, texto fuera de controles ni scroll horizontal innecesario.
- Todas las columnas visibles de datos deben ordenar; Acciones queda exceptuada.

## Evidencia vigente al 2026-07-24

- GitHub Actions: [Poseidon Quality #3](https://github.com/matu2424-maker/poseidon-sistema-gestio/actions/runs/30116340060) aprobo `Check and build` y `Release E2E` sobre `release/test`, commit `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`, en 2 min 26 s.
- GitHub Actions: [Poseidon Quality #4](https://github.com/matu2424-maker/poseidon-sistema-gestio/actions/runs/30117602834) aprobo `Check and build` sobre `main`, commit `1151091b7164cf2735d537eb4dd13c90d09df312`, en 52 s y sin anotaciones de Node 20.
- GitHub Actions: [Poseidon Quality #6](https://github.com/matu2424-maker/poseidon-sistema-gestio/actions/runs/30121806269) aprobo `Check and build` sobre `main`, commit `b4ff2944db74de2dedcf7fb245ebbbe18db0cc85`, en 58 s.
- El workflow vigente en `main` usa `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6` y `actions/upload-artifact@v7`; `release:check` exige esas referencias para impedir una regresion al runtime interno Node 20.
- 42 archivos de pruebas y 213 casos aprobados, incluidos gobierno SOPM-Lite, preflight de release, workstream de Calidad, reinicio operativo, carga demo integral, tesoreria Caja/Principal, movimientos de socios, gastos desde Principal, cierres periodicos atomicos, revision/anulacion administrativa de gastos, migracion esquema 5, disponibilidad, reconciliacion, prioridad de cuentas de efectivo, caja, salarios, diferencias, resumen del Encargado, rutas, snapshot y conflictos de escritura.
- La validacion profunda cubre las 22 colecciones de `AppData`, campos, enums, importes finitos, IDs, referencias, asociaciones de local/recaudacion y preservacion del snapshot rechazado.
- La suite E2E en 9 archivos aprobo 20 de 20 casos: caja, fondos Caja/Principal en ambos sentidos, efectivo negativo, desacople caja/libro, formularios y anulaciones, panel responsive del Encargado, diferencias/auditoria, gasto administrativo desde Principal, cierre periodico, usuarios/categorias, importacion invalida, navegacion por roles, sincronizacion/conflicto, cierre salarial correctivo y reinicio operativo con respaldo.
- La misma suite aprobo 20 de 20 en modo CI con servidor aislado y Chromium, ademas del recorrido local con Chrome.
- Datos locales: reinicio comprobado con 0 gastos, 0 movimientos, Caja/Principal/socios en $0 y una auditoria nueva del Administrador.
- Datos locales: QA visual aprobada en 1366x768 y 390x844 sin overflow horizontal ni errores de consola.
- `check:skills` aprobado para cuatro skills y `check:commit` aprobado con seleccion automatica de `check` y `build`.
- `check:governance` aprobado para estado, decisiones, migraciones, capacidades, referencias, commits y scripts declarados.
- `check:design` aprobado con 38 controles, estado accesible de ordenamiento, limite automatico de peso funcional y dos referencias visuales reproducibles.
- TypeScript aprobado.
- ESLint aprobado con cero advertencias.
- Build de produccion aprobado.
- Runtime reproducible validado con Node `24.14.0`, pnpm `11.9.0` y lockfile congelado.
- Smoke HTTP aprobado.
- Browser: Administrador > Locales > Editar local aprobado.
- Browser: `/panel` -> `/locales`, recarga y Atrás/Adelante aprobados sin errores de consola.
- Browser: Encargado > Cierres y reportes > Resumen de cajas aprobado.
- Browser: Cajero sin caja > aviso, Clientes, Resumen y Abrir caja aprobado.
- Chrome canonico: control recuperado; acceso como Encargado, Control de gastos, detalle operativo y Cierre periodico aprobados sin errores de consola.
- Beta Vercel limpia: despliegue `PHp675DwSQ6Sy3VrC7p6SoBgkSsE`, fuente `release/test`, commit `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`, estado `Ready` en 30 s.
- Configuracion Vercel: se eliminaron 16 variables historicas de PostgreSQL/Supabase; el inventario de variables del proyecto quedo en 0 y el frontend no consume variables remotas.
- Beta Vercel posterior a la limpieza: dominio principal y rutas `/`, `/ingresar`, `/panel`, `/caja/abrir` y `/locales` respondieron HTTP `200`.
- Beta Chrome posterior a la limpieza: Cajero, Encargado y Administrador ingresaron correctamente; la navegacion finalizo en `/panel`.
- Rollback seguro: redesplegar `v0.1.0-beta.1` o su commit con la configuracion vigente. Los despliegues anteriores a la limpieza se conservan como evidencia, pero no deben promoverse.
- Cierre desconciliado: aviso con caja/libro/delta visible, aporte ordinario ausente y cierre deshabilitado; QA visual aprobada en 1280 x 720 y 390 x 844 sin overflow horizontal.
- Cuentas corrientes: grupos Caja, Principal, Socios y Otras; selector, movimientos y tabla ordenable aprobados en 1024 x 768 y 390 x 844 sin overflow global.
- Control de gastos: alta desde Principal con selector Efectivo/Banco, saldos disponibles, tabla ordenable y modal aprobados en 1366 x 768 y 390 x 844 sin errores de consola.
- Cierre con Caja/Efectivo negativo: bloqueo, importe faltante, detalle de movimientos del encargado y acceso a Mover fondos aprobados en 1366 x 768 y 390 x 844.
- Viewports 1920 x 1080 y 390 x 844 sin overflow horizontal en panel administrativo.
- CSS final mantuvo el mismo hash de salida tras separarlo por capas.

## Cobertura pendiente

Los flujos criticos de cajero, tesoreria, diferencias/auditoria, cierre
periodico, cierre salarial, recuperacion y navegacion por los tres roles tienen
E2E. Los recorridos nuevos de Locales, Maquinas, Personal, Clientes y Papelera
aprobaron `10/10`; personal conserva el bloqueo deliberado de eliminacion
definitiva cuando existe historial salarial.

El backend preparatorio aun requiere PostgreSQL real, RPC por flujo, Auth,
concurrencia, importacion/conciliacion y rollback antes de habilitarse.
