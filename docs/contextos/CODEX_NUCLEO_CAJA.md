# Contexto Codex - Nucleo de caja y control financiero

Ultima actualizacion: 2026-07-16

Leer este contexto antes de modificar comandos, formulas, cuentas, diferencias, saldos o auditoria asociados a una recaudacion. La interfaz del cajero se consulta en `CODEX_CAJERO`.

## Propiedad central o especializada

- `src/application/cash/`
- `src/application/movements/`
- `src/application/differences/`
- `src/lib/cashTotals.ts`
- `src/lib/accountMovements.ts`
- `src/lib/currentAccounts.ts`
- `src/lib/differences.ts`
- Contratos relacionados en `src/types.ts`, persistencia y normalizacion.

Estos archivos son contratos compartidos. Solo un chat recibe propiedad de escritura por bloque y el chat central integra el resultado.

## Comandos actuales

- `openCash.ts`: abre una unica caja por local, toma saldos iniciales y registra auditoria.
- `saveReading.ts`: valida IN/OUT, guarda lectura, resultado y movimiento asociado.
- `operatingMovementCommands.ts`: crea y anula movimientos operativos con cuenta y auditoria.
- `closeCash.ts`: cierra, registra retiros, diferencias, cuentas e historial.
- `manageDifference.ts`: verifica, corrige o anula diferencias sin alterar resultado economico.

## Invariantes

- Resultado economico = resultado de maquinas - gastos - salarios - regalos.
- Transferencias, aportes, retiros, saldos iniciales y diferencias son financieros.
- Solo existe una caja abierta por local.
- Una caja cerrada y su auditoria no se borran.
- Las diferencias sincronizan cuentas con lo declarado, pero no cambian resultado economico.
- Los movimientos asociados conservan `balanceId`, `localId`, cuenta, usuario y estado.
- Una pestaña desactualizada no sobrescribe el snapshot vigente.

## Consumidores

- Cajero: ejecuta operaciones diarias mediante la interfaz.
- Encargado: revisa cuentas, gastos y diferencias; no opera caja sin cambiar a funcion Cajero.
- Administrador: controla y audita; los ajustes usan comandos explicitos.
- Salarios, maquinas y reportes consumen identificadores y resultados de caja.

## Pruebas obligatorias

- Caso valido, validacion rechazada y auditoria de cada comando modificado.
- Saldos antes y despues, movimiento y contramovimiento cuando corresponda.
- Asociacion con `balanceId` y `localId`.
- Apertura, cierre y diferencia en efectivo y banco.
- `pnpm test`, `pnpm run build` y smoke por los roles afectados.
