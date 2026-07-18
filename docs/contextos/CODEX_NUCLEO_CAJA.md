# Contexto Codex - Nucleo de caja y tesoreria

Ultima actualizacion: 2026-07-17

Leer antes de modificar comandos, formulas, cuentas, saldos, cierre, diferencias o auditoria financiera. La experiencia visual del cajero vive en `CODEX_CAJERO.md`; las reglas completas, en `docs/REGLAS_CONTABLES.md`.

## Propiedad compartida

- `src/application/cash/`
- `src/application/movements/`
- `src/application/treasury/`
- `src/application/expenses/`
- `src/application/differences/`
- `src/lib/cashTotals.ts`
- `src/lib/cashAvailability.ts`
- `src/lib/currentAccounts.ts`
- `src/lib/accountMovements.ts`
- `src/lib/periodicTotals.ts`
- `src/data/migrateData.ts`
- `src/data/normalizeData.ts`
- contratos de `src/types.ts` y persistencia.

Central asigna propietario temporal unico antes de editar estos contratos desde otro chat.

## Modelo vigente

- Moneda unica: UYU.
- Caja: Efectivo y Banco.
- Principal: Efectivo y Banco.
- Socios: Mathias y Ricardo como cuentas patrimoniales, no monetarias.
- No existe custodia.
- Resultado economico: maquinas - gastos - salarios - regalos.

## Comandos

- `openCash.ts`: primera apertura Socio -> Principal -> Caja; aperturas siguientes heredan Caja.
- `saveReading.ts`: valida contadores y sincroniza resultado de maquinas.
- `operatingMovementCommands.ts`: operaciones exclusivas del Cajero; el alta de capital legacy esta bloqueada.
- `treasuryCommands.ts`: Caja <-> Principal y movimientos reales de socios.
- `principalExpenseCommands.ts`: gastos administrativos desde Principal.
- `salarySettlementCommands.ts`: Caja para Cajero y Principal para liquidacion administrativa.
- `closeCash.ts`: traspaso final Caja -> Principal, declaracion, diferencias y foto cerrada.
- `manageDifference.ts`: verificar, corregir o anular diferencias con deltas append-only.

## Invariantes

- Una sola caja abierta por local.
- Caja abierta: `efectivo esperado === Caja / Efectivo`.
- Toda salida valida la cuenta monetaria real antes de mutar.
- Caja y Principal no admiten una nueva salida que deje saldo negativo.
- Un resultado de maquinas negativo se registra, pero bloquea nuevas salidas y cierre hasta financiar Principal y traspasar a Caja.
- Si existe caja abierta, todo traspaso Caja/Principal se asocia a su `balanceId`.
- Gastos y salarios administrativos usan Principal sin `balanceId` y no alteran efectivo esperado.
- Apertura y cierre generan traspasos automaticos inmutables.
- Traspasos y socios no modifican resultado economico.
- Diferencias ajustan Caja, no resultado.
- No se borran movimientos contabilizados; las anulaciones agregan reversos.

## Migraciones

- Esquema actual: 5.
- 3 -> 4: salida historica de transferencias y puente causal exacto.
- 4 -> 5: contrapartidas Principal para retiros legacy y cuentas patrimoniales para aportes legacy.
- Retiro legacy se interpreta como Caja -> Principal, no retiro de socio.
- Toda migracion es idempotente y auditada.

## Pruebas minimas

- Primera apertura en ambos medios.
- Caja <-> Principal en ambos sentidos y medios: exacto, exceso, sin asociacion y anulacion.
- Aporte/retiro de ambos socios sin concepto de custodia.
- Gasto y salario desde Caja y desde Principal.
- Cierre con traspasos no cero, remanente, diferencias y reapertura.
- Rechazo por rol, usuario inactivo, local ajeno y suplantacion de funcion.
- Migracion 4 -> 5 e idempotencia.
- `pnpm run check`, `pnpm run build`, E2E y smoke por roles afectados.
