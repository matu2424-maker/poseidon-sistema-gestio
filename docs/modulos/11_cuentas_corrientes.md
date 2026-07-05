# Modulo 11 - Cuentas corrientes

## Objetivo

Llevar libro interno de saldos y movimientos sin cargar saldos manuales.

## Tipos de cuenta

- Transferencias.
- Local / Efectivo.
- Local / Banco.

Nota: las cuentas `Personal` existen internamente para registrar salarios y adelantos, pero se consultan desde `Liquidacion de salarios`, no desde esta pantalla.
En el detalle de cada empleado, la cuenta corriente personal muestra fecha, concepto, monto, total, pendiente y usuario, con todas sus columnas ordenables.

## Reglas

- Los saldos se calculan desde movimientos.
- Cada local tiene cuenta de efectivo y cuenta banco.
- Existe cuenta unica de transferencias.
- La pantalla no muestra cuentas personales; esas cuentas se ven dentro de `Liquidacion de salarios`.
- La pantalla no repite el titulo `Cuentas corrientes` dentro del contenido, porque ya aparece en la barra superior.
- El encabezado interno muestra una descripcion operativa y contadores de cuentas/movimientos.
- El encargado ve solamente cuentas y movimientos de sus locales asignados. En la demo actual ve Poseidon.
- Al abrir la pantalla se muestra siempre el mes corriente.
- Se puede alternar entre `Mes actual`, `Mes anterior` y `Consulta historica`.
- En `Consulta historica` se selecciona manualmente un intervalo de fechas.
- Los saldos, entradas, salidas, listado de cuentas y movimientos respetan el periodo seleccionado.
- La tabla de movimientos muestra: fecha, tipo, detalle, usuario, debito, credito y saldo.
- `Debito` representa salidas de la cuenta y `Credito` representa entradas.
- El saldo es corrido: toma el saldo activo anterior al rango y acumula los movimientos visibles.
- Al hacer clic en un movimiento se abre una ventana flotante con el detalle completo.
- Si el movimiento esta asociado a una recaudacion, la ventana muestra la recaudacion asociada y permite abrir el resumen completo de esa recaudacion.

## Impactos

- Resultado maquinas positivo -> entrada Local / Efectivo.
- Resultado maquinas negativo -> salida Local / Efectivo.
- Gastos -> salida Local / Efectivo.
- Regalos -> salida Local / Efectivo.
- Salarios -> salida Local / Efectivo y movimiento en cuenta personal.
- Transferencias -> entrada Local / Banco y cuenta Transferencias.
- Retiros -> salida Local / Efectivo o Local / Banco.
- Aportes -> entrada Local / Efectivo o Local / Banco.
- La pantalla no muestra tarjetas superiores de entrada/salida/saldo local; el foco queda en periodo, cuentas y movimientos.

## Auditoria

- Cada movimiento debe registrar origen, usuario, fecha, concepto, monto, direccion y estado.
- Si se anula un origen, se anula su movimiento asociado.
