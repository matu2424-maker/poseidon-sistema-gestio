# Contexto Codex - Layout base y navegacion

Ultima actualizacion: 2026-07-09

Leer este contexto antes de modificar pantalla inicial, login local, barra superior, menu lateral, layout de cajero o navegacion base.

Referencias asociadas:

- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/00_base_sistema.md`
- `docs/modulos/01_panel_cajero.md`
- `docs/modulos/07_panel_encargado.md`
- `docs/modulos/08_panel_administrador.md`
- `docs/MODULARIZACION_REFERENCIAS.md`

## Codigo actual

- Pantalla inicial, login, layout lateral de encargado/admin, layout del cajero y estado vacio operativo viven en `src/features/layout/AppShell.tsx`.
- `src/App.tsx` conserva estado global, datos, persistencia, acciones y composicion de pantallas.
- `Panel` vive en `src/features/dashboard/RoleDashboard.tsx` porque cruza datos de caja, diferencias, cuentas y accesos por rol.

## Reglas criticas

- Login local es por seleccion de usuario, sin contrasena.
- Cajero usa `CashierWorkspace`, sin barra lateral.
- Encargado y administrador usan `Shell` con menu lateral agrupado y desplegable.
- Encargado/admin solo operan caja cambiando a funcion Cajero.
- Evitar repetir titulo/datos que ya aparecen en barra superior.
- Botones deben quedar alineados y verse bien en 1080p.
- No cambiar permisos ni menu sin revisar modulos 07 y 08.

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
