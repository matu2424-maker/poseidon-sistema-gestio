# Contexto Codex - Caja diaria y cierre

Ultima actualizacion: 2026-07-10

Leer este contexto antes de modificar apertura, panel cajero, contadores, cierre o resumen de cajas. Referencias asociadas:

- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/01_panel_cajero.md`
- `docs/modulos/02_caja_diaria.md`
- `docs/modulos/03_contadores.md`
- `docs/modulos/04_movimientos_operativos.md`
- `docs/modulos/05_cierre_caja.md`
- `docs/contextos/CODEX_DIFERENCIAS.md`
- `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`

## Codigo actual

- `CashierWorkspace` vive en `src/features/layout/AppShell.tsx`.
- `Expenses`, `Transfers`, `Gifts`, `CashierSalaryPayments`, `CapitalMovements` y `CashierClients` viven en `src/features/cashier/Movements.tsx`.
- `OpenCash` vive en `src/features/cashier/OpenCash.tsx`.
- `ClosedBalanceSummary` vive en `src/features/cashier/ClosedBalanceSummary.tsx`.
- `Counters` vive en `src/features/cashier/Counters.tsx`.
- `CloseCash` vive en `src/features/cashier/CloseCash.tsx`.
- Movimientos operativos del cajero viven en `src/features/cashier/Movements.tsx`.
- Totales principales y calculo de lecturas estan en `src/lib/cashTotals.ts`.
- Movimientos de cuenta relacionados estan en `src/lib/accountMovements.ts`.
- Formato de dinero/contadores e inputs monetarios esta en `src/lib/money.ts`.
- Fechas base, hora visible y rangos mensuales estan en `src/lib/dates.ts`.
- IDs visibles de caja, nombres de usuario/local y etiquetas de rol compartidas estan en `src/lib/display.ts`.
- IDs locales se generan con `src/lib/ids.ts`.
- Historial de maquinas usa `src/lib/machineHistory.ts`.
- Cuentas del local y saldos iniciales usan helpers de `src/lib/currentAccounts.ts`.
- Estilos principales en `src/styles/global.css`.

## Reglas criticas

- Cajero no usa barra lateral.
- Si no hay caja abierta, solo puede usar Clientes, Resumen cajas y Abrir caja.
- Apertura toma saldos de cuentas del local.
- Primera caja exige aporte inicial efectivo/banco.
- Cierre calcula resultado economico separado del flujo financiero.
- Cierre crea diferencias si lo declarado no coincide con esperado.
- Despues de cerrar, ir a Resumen de cajas.
- Resumen de cajas muestra ultimas 10 cajas cerradas en tabla ordenable por todas sus columnas de datos; `Ver` es accion y no se ordena.
- Las tablas operativas compartidas de gastos, transferencias, regalos, salarios y retiros/aportes usan `MovementTable` y ordenan por todas sus columnas visibles de datos; la ultima columna de accion no se ordena.
- El selector multiple de clientes usado en regalos tambien es una tabla ordenable; el checkbox de seleccion no se ordena.
- Importes monetarios usan formato con punto de miles.
- IN/OUT actual no puede ser menor al anterior.

## Asociaciones

- Caja depende de maquinas, gastos, transferencias, regalos, salarios, retiros/aportes y cuentas.
- Cierre impacta diferencias y cuentas corrientes.
- Salarios cargados desde caja se imputan por `balanceId` y por `period`.
- Auditoria debe guardar usuario real y funcion usada.

## Pruebas manuales

1. Entrar como `cajero1`.
2. Si no hay caja abierta, abrir caja.
3. Cargar contadores.
4. Cargar gasto, transferencia, regalo, salario y retiro/aporte si aplica.
5. Cerrar caja declarando efectivo/banco.
6. Ver resumen de caja.
7. Revisar si diferencia aparece en Diferencias y Cuentas corrientes.
