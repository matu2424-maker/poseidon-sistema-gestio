# Modulo 08 - Panel del administrador

## Objetivo

Gestion completa del sistema sin mezclar operativa de caja directa.

## Reglas

- Administrador puede gestionar todo.
- Para operar caja cambia a funcion Cajero.
- No debe usar menu lateral para abrir/cerrar/cargar caja.
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
- `src/data/appData.ts`: datos demo, limpieza operativa y normalizacion/migracion.
- `src/features/layout/AppShell.tsx`: pantalla inicial, login, layout lateral, menu agrupado y cambio a funcion Cajero.
- `src/features/dashboard/RoleDashboard.tsx`: paneles iniciales por rol y accesos rapidos.
- `src/features/admin/Settings.tsx`: usuarios y categorias/subcategorias de gastos.
- `src/features/admin/LocationsMachines.tsx`: locales, maquinas, taller, editores y modales de historial/asociaciones.
- `src/features/admin/Clients.tsx`: clientes administrativos y editor compartido.
- `src/features/admin/Staff.tsx`: personal, historial salarial y papelera.
- `src/features/salaries/SalarySettlements.tsx`: liquidacion de salarios.
- `src/features/reports/Reports.tsx`: reportes iniciales y exportaciones.
- `src/features/reports/Periodic.tsx`: cierres periodicos.
- `src/features/accounts/CurrentAccounts.tsx`: cuentas corrientes.
- `src/components/ui.tsx`: componentes compartidos y selector de columnas.

## Refactor pendiente

- No queda pendiente conocido de datos demo/normalizacion. Cualquier nuevo refactor debe justificarse por reduccion real de contexto, riesgo o duplicacion.
