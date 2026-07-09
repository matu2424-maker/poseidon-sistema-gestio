# Contexto Codex - Encargado

Ultima actualizacion: 2026-07-09

Leer este contexto antes de modificar panel del encargado, diferencias, control de gastos, cuentas corrientes o cierres periodicos. Referencias asociadas:

- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/07_panel_encargado.md`
- `docs/modulos/06_diferencias_caja.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/modulos/12_auditoria.md`
- `docs/contextos/CODEX_DIFERENCIAS.md`
- `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`

## Codigo actual

- Panel del encargado vive en `src/features/dashboard/RoleDashboard.tsx`.
- Menu y layout del encargado viven en `src/features/layout/AppShell.tsx`.
- Control de gastos vive en `src/features/manager/Expenses.tsx`.
- Cierre periodico vive en `src/features/reports/Periodic.tsx`.
- Diferencias usan helpers de `src/lib/differences.ts`.
- Movimientos de cuenta usan `src/lib/accountMovements.ts`.
- Saldos de local usan `src/lib/currentAccounts.ts`.

## Reglas criticas

- Encargado ve solo locales asignados.
- Encargado no opera caja desde el menu lateral; cambia a funcion Cajero si necesita operar caja.
- Panel del encargado no debe repetir titulos que ya muestra la barra superior.
- Diferencias se revisan, corrigen, verifican o anulan con auditoria completa.
- Cierres periodicos son fotos auditadas; no borran cajas ni movimientos.
- Toda tabla visible debe ordenar por cada columna de datos.

## Asociaciones

- Diferencias impactan cuentas local efectivo/banco.
- Control de gastos impacta caja, cuenta local efectivo y auditoria. Su tabla debe ordenar por todas las columnas visibles de datos.
- Cuentas corrientes deben permitir rastrear movimientos hasta la recaudacion.
- Salarios se revisan en `CODEX_SALARIOS`, aunque el encargado pueda gestionarlos.

## Pruebas manuales

1. Entrar como `encargado`.
2. Revisar panel inicial con local Poseidon.
3. Abrir Diferencias y gestionar una recaudacion.
4. Abrir Cuentas corrientes y verificar efectivo/banco.
5. Abrir Control de gastos y revisar/anular un gasto.
6. Confirmar que auditoria registra usuario y funcion.
