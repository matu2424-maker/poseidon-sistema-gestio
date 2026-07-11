# Modulo 11 - Cuentas corrientes

## Objetivo

Llevar libro interno de saldos y movimientos sin cargar saldos manuales.

## Codigo actual

- La pantalla principal vive en `src/features/accounts/CurrentAccounts.tsx`.
- Los helpers de cuentas viven en `src/lib/currentAccounts.ts`.
- Los movimientos y totales derivados viven en `src/lib/accountMovements.ts`.
- El selector mensual vive en `src/components/MonthlyPeriodSelector.tsx` y sus reglas en `src/lib/periods.ts`.
- La resolucion de recaudaciones asociadas por `balanceId` vive en `src/lib/balanceReferences.ts`.

## Tipos de cuenta

- Transferencias.
- Local / Efectivo.
- Local / Banco.

Nota: las cuentas `Personal` existen internamente para registrar salarios y adelantos, pero se consultan desde `Liquidacion de salarios`, no desde esta pantalla.
En el detalle de cada empleado, la cuenta corriente personal muestra fecha, concepto, monto, total, pendiente y usuario, con todas sus columnas ordenables.
La cuenta personal se filtra por periodo trabajado de la liquidacion. Un pago cargado desde caja en febrero para el periodo trabajado enero se ve en enero y mantiene referencia a la recaudacion/caja de febrero.
En cuenta personal, `Total` sigue la obligacion del periodo: salario base + premio/gratificacion + horas extras + bonos - descuentos. `Pendiente` sigue el saldo de salario base pendiente despues de salario pagado, adelantos y descuentos.

## Reglas

- Los saldos se calculan desde movimientos.
- Los movimientos persistidos no se reescriben al iniciar la aplicacion.
- Anulaciones posteriores generan contramovimientos; correcciones de diferencias agregan el delta necesario.
- Cada local tiene cuenta de efectivo y cuenta banco.
- Existe cuenta unica de transferencias.
- La pantalla no muestra cuentas personales; esas cuentas se ven dentro de `Liquidacion de salarios`.
- La pantalla no repite el titulo `Cuentas corrientes` dentro del contenido, porque ya aparece en la barra superior.
- El encabezado interno muestra una descripcion operativa y contadores de cuentas/movimientos.
- El encargado ve solamente cuentas y movimientos de sus locales asignados. En la demo actual ve Poseidon.
- Al abrir la pantalla se muestra siempre el mes corriente.
- Se puede alternar entre el mes anterior, el mes actual y `Consulta historica`.
- Los botones de mes muestran el nombre del mes para evitar ambiguedad.
- En `Consulta historica` se selecciona mes y ano, no un intervalo libre de fechas.
- Los saldos, entradas, salidas, listado de cuentas y movimientos respetan el periodo seleccionado.
- La tabla de movimientos muestra: fecha, tipo, detalle, usuario, debito, credito y saldo.
- La tabla de movimientos permite ordenar por fecha, tipo, detalle, usuario, debito, credito y saldo.
- `Debito` representa salidas de la cuenta y `Credito` representa entradas.
- El saldo es corrido: toma el saldo activo anterior al rango y acumula los movimientos visibles.
- El saldo corrido se calcula con `accountLedgerRows()` para compartir una sola regla comprobable.
- El listado lateral y el resumen de la cuenta muestran `Saldo final`, calculado como saldo anterior al rango + entradas - salidas del periodo visible.
- Al hacer clic en un movimiento se abre una ventana flotante con el detalle completo.
- Si el movimiento esta asociado a una recaudacion, la ventana muestra la recaudacion asociada y permite abrir el resumen completo de esa recaudacion.

## Impactos

- Resultado maquinas positivo -> entrada Local / Efectivo.
- Resultado maquinas negativo -> salida Local / Efectivo.
- Gastos -> salida Local / Efectivo.
- Regalos -> salida Local / Efectivo.
- Salarios -> salida Local / Efectivo por caja/balanceId y movimiento en cuenta personal por periodo trabajado.
- Descuentos de salarios -> movimiento de cuenta personal que reduce pendiente/base cubierta, pero no genera salida Local / Efectivo ni cuenta como dinero entregado.
- Transferencias -> salida Local / Efectivo, entrada Local / Banco y entrada en cuenta Transferencias.
- Retiros -> salida Local / Efectivo o Local / Banco.
- Aportes -> entrada Local / Efectivo o Local / Banco.
- Diferencias de caja -> entrada o salida Local / Efectivo y/o Local / Banco, segun diferencia positiva o negativa, para reflejar el saldo real declarado.
- Anular una diferencia desde `Diferencias` anula tambien sus movimientos de cuenta.
- La pantalla no muestra tarjetas superiores de entrada/salida/saldo local; el foco queda en periodo, cuentas y movimientos.

## Auditoria

- Cada movimiento debe registrar origen, usuario, fecha, concepto, monto, direccion y estado.
- Si se anula un origen, se conserva el asiento y se agrega un contramovimiento. En salarios, transferencias, capital, gastos revisados y diferencias el impacto neto queda en cero sin perder historial.
