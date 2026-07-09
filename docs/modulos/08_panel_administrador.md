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

- `src/App.tsx`: layout, menu, panel general y pantallas administrativas aun no extraidas.
- `src/features/admin/Settings.tsx`: usuarios y categorias/subcategorias de gastos.
- `src/features/admin/LocationsMachines.tsx`: locales, maquinas, taller, editores y modales de historial/asociaciones.
- `src/features/admin/Clients.tsx`: clientes administrativos y editor compartido.
- `src/features/admin/Staff.tsx`: personal, historial salarial y papelera.
- `src/features/salaries/SalarySettlements.tsx`: liquidacion de salarios.
- `src/features/reports/Reports.tsx`: reportes iniciales y exportaciones.
- `src/features/reports/Periodic.tsx`: cierres periodicos.
- `src/components/ui.tsx`: componentes compartidos y selector de columnas.

## Refactor pendiente

- Extraer layout/base administrativo restante: `Shell`, paneles iniciales por rol y tabla administrativa general si sigue siendo transversal.
