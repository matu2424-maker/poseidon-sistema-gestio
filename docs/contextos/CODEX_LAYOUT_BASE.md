# Contexto Codex - Layout base y navegacion

Ultima actualizacion: 2026-07-16

Leer este contexto antes de modificar pantalla inicial, login local, barra superior, menu lateral, layout de cajero o navegacion base.

Referencias asociadas:

- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/00_base_sistema.md`
- `docs/modulos/01_panel_cajero.md`
- `docs/modulos/07_panel_encargado.md`
- `docs/modulos/08_panel_administrador.md`
- `docs/MODULARIZACION_REFERENCIAS.md`
- `docs/MAPA_RUTAS.md`

## Codigo actual

- Pantalla inicial, login, layout lateral de encargado/admin, layout del cajero y estado vacio operativo viven en `src/features/layout/AppShell.tsx`.
- `src/App.tsx` conserva estado global, sesion, acciones y composicion; la pantalla se deriva de React Router.
- `src/navigation/screens.ts` define la URL estable de cada pantalla; `docs/MAPA_RUTAS.md` documenta el contrato completo.
- `src/infrastructure/session/localSession.ts` conserva `userId` y funcion activa durante la pestaña para soportar recarga.
- Recuperacion y mantenimiento local viven en `src/features/system/`; el repositorio versionado vive en `src/infrastructure/storage/`.
- `RoleDashboard.tsx` conserva la entrada compatible y delega en `CashierDashboard.tsx`, `ManagerDashboard.tsx` o `AdminDashboard.tsx` segun la funcion efectiva.
- Cada panel tiene contexto y propietario de chat separado; `DashboardActionCard.tsx` y la seleccion de rol siguen reservados al chat central.

## Reglas criticas

- Login local es por seleccion de usuario, sin contrasena.
- Cajero usa `CashierWorkspace`, sin barra lateral.
- Encargado y administrador usan `Shell` con menu lateral agrupado y desplegable.
- Encargado/admin solo operan caja cambiando a funcion Cajero.
- Evitar repetir titulo/datos que ya aparecen en barra superior.
- Botones deben quedar alineados y verse bien en 1080p.
- Modales compartidos encierran/restauran foco y cierran con `Escape`; avisos usan region anunciable y filas clicables aceptan teclado.
- No cambiar permisos ni menu sin revisar modulos 07 y 08.
- Rutas directas y recargas deben respetar los mismos permisos que los botones de navegacion.

## Asociaciones

- `Shell` usa grupos de menu segun rol efectivo.
- `CashierWorkspace` muestra resumen operativo de caja abierta y abre las funciones de cajero como vistas internas o modal.
- `titleForScreen` define el titulo de pantalla segun pantalla y rol.
- `roleLabels` vive en `src/lib/display.ts` y se comparte con auditoria/exportaciones.

## Pruebas manuales

1. Abrir la app en `http://127.0.0.1:5173/`.
2. Ver pantalla inicial y entrar al login.
3. Entrar como `cajero1` y verificar panel de cajero sin barra lateral.
4. Entrar como `encargado` y verificar menu lateral, datos de cabecera y boton de trabajar como cajero.
5. Entrar como `admin` y verificar menu lateral completo.
6. Cambiar de rol efectivo a cajero y volver al rol original.
