# Contexto Codex - Cuentas corrientes

Ultima actualizacion: 2026-07-10

Leer este contexto antes de modificar cuentas, saldos, movimientos o detalle de movimientos. Referencias asociadas:

- `docs/REGLAS_CONTABLES.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/contextos/CODEX_CAJA.md`
- `docs/contextos/CODEX_DIFERENCIAS.md`
- `docs/contextos/CODEX_SALARIOS.md`
- `docs/modulos/12_auditoria.md`

## Codigo actual

- Pantalla: `AdminCurrentAccounts` en `src/features/accounts/CurrentAccounts.tsx`.
- Tipos: `CurrentAccount`, `AccountMovement`, `CurrentAccountKind`, `AccountMovementSource`.
- Helpers extraidos: ids de cuenta local/personal/transferencias, creacion/asegurado de cuentas, `accountTotals` y `localAccountBalances` viven en `src/lib/currentAccounts.ts`.
- Movimientos por origen, sincronizacion y `accountTotalsFromMovements` viven en `src/lib/accountMovements.ts`.
- La tabla de movimientos es ordenable por fecha, tipo, detalle, usuario, debito, credito y saldo.

## Reglas criticas

- Saldos se calculan desde movimientos activos.
- No se cargan saldos manuales.
- Encargado ve solo locales asignados.
- Pantalla general no muestra cuentas personales; estas viven dentro de Liquidacion de salarios.
- Tabla muestra fecha, tipo, detalle, usuario, debito, credito y saldo.
- Saldo es corrido e incluye saldo anterior al rango.
- El listado lateral y el resumen de cuenta muestran `Saldo final`: saldo anterior + entradas - salidas del periodo.
- Diferencias de caja impactan cuentas local efectivo/banco, no resultado economico.

## Asociaciones

- Apertura de caja usa saldo local efectivo/banco.
- Cierre de caja crea retiros finales y diferencias.
- Gastos, regalos y salarios salen de efectivo.
- Transferencias entran en banco y cuenta transferencias.
- Retiros/aportes mueven efectivo o banco segun medio.
- Salarios mueven cuenta personal y local efectivo cuando corresponda.

## Pruebas manuales

1. Entrar como `encargado` o `admin`.
2. Ir a `Cuentas corrientes`.
3. Consultar mes actual, mes anterior e intervalo.
4. Abrir cuenta `Local / Efectivo`.
5. Abrir cuenta `Local / Banco`.
6. Hacer clic en movimiento con recaudacion asociada.
7. Verificar debito/credito/saldo corrido.
