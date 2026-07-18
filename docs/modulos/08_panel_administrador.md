# Modulo 08 - Panel del administrador

## Objetivo

Gestion completa del sistema sin mezclar operativa de caja directa.

## Reglas

- Administrador puede gestionar todo.
- Para operar caja cambia a funcion Cajero.
- No debe usar menu lateral para abrir/cerrar/cargar caja.
- Puede consultar `Resumen de cajas` desde `Cierres y reportes` sin cambiar de funcion.
- Toda accion sensible debe auditarse.

## Menus principales

- Inicio.
- Control y auditoria.
- Cierres y reportes.
- Gestion.
- Personas.
- Sistema.

## Funciones

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
- Datos locales: exportacion, importacion, carga integral del escenario demo y reinicio operativo local con respaldo automatico.

## Codigo actual

- `src/App.tsx`: estado global, acciones principales y composicion de pantallas.
- `src/data/appData.ts`, `src/data/normalizeData.ts` y `src/data/migrateData.ts`: datos demo, normalizacion estructural y migraciones incrementales separadas.
- `src/features/layout/AppShell.tsx`: pantalla inicial, login, layout lateral y cambio a funcion Cajero.
- `src/navigation/screens.ts`: menu agrupado, titulos, permisos y requisito de caja abierta.
- `src/features/dashboard/AdminDashboard.tsx`: panel administrativo y accesos rapidos.
- `src/features/dashboard/RoleDashboard.tsx`: seleccion compatible del panel por funcion efectiva.
- `src/features/admin/Settings.tsx`: usuarios y categorias/subcategorias de gastos.
- `src/features/admin/LocationsMachines.tsx` y `src/features/admin/locationsMachines/`: locales, maquinas, taller, editores e historiales separados.
- `src/features/admin/Clients.tsx`: clientes administrativos y editor compartido.
- `src/features/admin/Staff.tsx`: personal, historial salarial y papelera.
- `src/features/salaries/SalarySettlements.tsx`: liquidacion de salarios.
- `src/features/reports/Reports.tsx`: reportes iniciales y exportaciones.
- `src/features/reports/Periodic.tsx`: cierres periodicos.
- `src/features/accounts/CurrentAccounts.tsx`: cuentas corrientes.
- `src/components/ui.tsx`: componentes compartidos y selector de columnas.
- `src/features/system/LocalDataMaintenance.tsx`: mantenimiento del snapshot local, acceso al reinicio limpio y accion demo visible solo cuando recibe `onLoadDemo`.
- `src/application/system/resetOperationalData.ts`: permiso, limpieza determinista y auditoria del reinicio local.
- `src/application/system/loadDemoData.ts`: permiso, reemplazo determinista por el escenario integral y auditoria de la carga demo.

## Refactor pendiente

- La primera migracion incremental ya esta separada; quedan para el bloque final la validacion runtime profunda y futuras migraciones versionadas. Cualquier refactor adicional debe justificarse por reduccion real de contexto, riesgo o duplicacion.

## Presentacion

- Tablas administrativas usan encabezado claro, tipografia compacta y todas sus columnas visibles de datos continuan siendo ordenables.
- Formularios, modales, filtros y selectores de columnas respetan pesos maximos de `600` y radios de hasta `8px`.
- La accion `Cargar datos demo` explica que recupera usuarios, maquinas, cajas historicas, diferencias, movimientos y auditoria; tambien advierte que descarga un respaldo y reemplaza la base actual sin mezclarla.
