# Contexto Codex - Nucleo de caja y control financiero

Ultima actualizacion: 2026-07-17

Leer este contexto antes de modificar comandos, formulas, cuentas, diferencias, saldos o auditoria asociados a una recaudacion. La interfaz del cajero se consulta en `CODEX_CAJERO`.

## Propiedad central o especializada

- `src/application/cash/`
- `src/application/movements/`
- `src/application/differences/`
- `src/lib/cashTotals.ts`
- `src/lib/accountMovements.ts`
- `src/lib/currentAccounts.ts`
- `src/lib/cashAvailability.ts`
- `src/lib/differences.ts`
- `src/data/migrateData.ts`
- `src/data/schemaVersion.ts`
- Contratos relacionados en `src/types.ts`, persistencia y normalizacion.

Estos archivos son contratos compartidos. Solo un chat recibe propiedad de escritura por bloque y el chat central integra el resultado.

## Comandos actuales

- `openCash.ts`: abre una unica caja por local, toma saldos iniciales y registra auditoria.
- `saveReading.ts`: valida IN/OUT, guarda lectura, resultado y movimiento asociado.
- `operatingMovementCommands.ts`: crea y anula movimientos operativos con cuenta y auditoria.
- `cashAvailability.ts`: obtiene el saldo activo `Local / Efectivo`, valida nuevas salidas y compara la caja abierta con el libro local.
- `migrateData.ts`: hidrata por version y ejecuta reconciliaciones financieras causales, auditadas e idempotentes.
- `closeCash.ts`: cierra, registra retiros, diferencias, cuentas e historial.
- `manageDifference.ts`: verifica, corrige o anula diferencias sin alterar resultado economico.

## Invariantes

- Resultado economico = resultado de maquinas - gastos - salarios - regalos.
- Transferencias, aportes, retiros, saldos iniciales y diferencias son financieros.
- Solo existe una caja abierta por local.
- Una caja cerrada y su auditoria no se borran.
- Las diferencias sincronizan cuentas con lo declarado, pero no cambian resultado economico.
- Los movimientos asociados conservan `balanceId`, `localId`, cuenta, usuario y estado.
- Gastos, transferencias desde efectivo, regalos, retiros operativos en efectivo y pagos salariales no pueden dejar `Local / Efectivo` por debajo de cero.
- El limite exacto se acepta; un aporte previo aumenta el disponible y una correccion salarial consume solo su incremento neto.
- Anulaciones y reversos siguen permitidos. Un resultado de maquinas negativo se registra, pero bloquea nuevas salidas y cierre hasta que un aporte cubra el faltante.
- Un cierre con efectivo esperado negativo falla antes de comparar retiros o crear diferencias, auditoria y movimientos.
- Durante una caja abierta debe cumplirse `efectivo esperado === Local / Efectivo`. Un delta es una desconciliacion tecnica, no una diferencia declarada por el cajero.
- Una desconciliacion bloquea contadores, movimientos, salarios, aportes ordinarios y cierre. El aviso debe mostrar ambos saldos y el delta sin ofrecer un aporte como solucion.
- La migracion esquema 3 -> 4 puede agregar un puente `MIGRACION` solo si las transferencias historicas reconstruidas explican exactamente el delta. No cambia banco ni resultado economico y no borra movimientos previos.
- Una mutacion historica de efectivo se bloquea si hay otra caja abierta del mismo local; los reversos de la caja vigente siguen permitidos.
- Esta regla no introduce estado pendiente ni modifica banco o resultado economico.
- Una pestana pasiva se sincroniza con el ultimo guardado; si tiene una mutacion propia pendiente, conserva el conflicto en vez de mezclar versiones.
- Una pestaña desactualizada no sobrescribe el snapshot vigente.

## Consumidores

- Cajero: ejecuta operaciones diarias mediante la interfaz.
- Encargado: revisa cuentas, gastos y diferencias; ademas puede registrar gastos y retiros/aportes en la caja abierta de su local desde funcion `ENCARGADO`.
- Administrador: controla y audita; los ajustes usan comandos explicitos.
- Salarios, maquinas y reportes consumen identificadores y resultados de caja.

## Pruebas obligatorias

- Caso valido, validacion rechazada y auditoria de cada comando modificado.
- Limite exacto, exceso sin mutacion, aporte previo, correccion salarial neta y saldo negativo heredado.
- Snapshot esquema 3 con transferencias reconstruidas, puente causal exacto, idempotencia y esquema 4 sin reconstruccion financiera silenciosa.
- Caja/libro desconciliados: bloqueos sin mutacion, aviso visible y rechazo del cierre antes de diferencias o retiros.
- Saldos antes y despues, movimiento y contramovimiento cuando corresponda.
- Asociacion con `balanceId` y `localId`.
- Dos pestanas: alta del Encargado visible para Cajero sin recarga manual y conflicto preservado ante una version local realmente desactualizada.
- Apertura, cierre y diferencia en efectivo y banco.
- `pnpm test`, `pnpm run build` y smoke por los roles afectados.
