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

## Codigo actual

- `src/App.tsx`: estado global, acciones principales y composicion de pantallas.
- `src/data/appData.ts` y `src/data/normalizeData.ts`: datos demo y normalizacion/migracion separadas.
- `src/features/layout/AppShell.tsx`: pantalla inicial, login, layout lateral y cambio a funcion Cajero.
- `src/navigation/screens.ts`: menu agrupado, titulos, permisos y requisito de caja abierta.
- `src/features/dashboard/RoleDashboard.tsx`: paneles iniciales por rol y accesos rapidos.
- `src/features/admin/Settings.tsx`: usuarios y categorias/subcategorias de gastos.
- `src/features/admin/LocationsMachines.tsx` y `src/features/admin/locationsMachines/`: locales, maquinas, taller, editores e historiales separados.
- `src/features/admin/Clients.tsx`: clientes administrativos y editor compartido.
- `src/features/admin/Staff.tsx`: personal, historial salarial y papelera.
- `src/features/salaries/SalarySettlements.tsx`: liquidacion de salarios.
- `src/features/reports/Reports.tsx`: reportes iniciales y exportaciones.
- `src/features/reports/Periodic.tsx`: cierres periodicos.
- `src/features/accounts/CurrentAccounts.tsx`: cuentas corrientes.
- `src/components/ui.tsx`: componentes compartidos y selector de columnas.

## Refactor pendiente

- No queda pendiente conocido de datos demo/normalizacion. Cualquier nuevo refactor debe justificarse por reduccion real de contexto, riesgo o duplicacion.

## Presentacion

- Tablas administrativas usan encabezado claro, tipografia compacta y todas sus columnas visibles de datos continuan siendo ordenables.
- Formularios, modales, filtros y selectores de columnas respetan pesos maximos de `600` y radios de hasta `8px`.
