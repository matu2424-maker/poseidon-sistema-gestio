# Modulo 04 - Gastos, transferencias, regalos, salarios, retiros y aportes

## Gastos

- Se cargan directo desde tabla.
- La tabla operativa del cajero es ordenable por categoria, descripcion y monto; `Accion` no se ordena.
- Obligatorio: categoria, subcategoria y monto.
- Opcional: descripcion y comprobante.
- Comprobante guarda solo metadatos.
- Se pueden eliminar/anular antes de cerrar caja.
- Categorias y subcategorias se definen desde administrador.
- Encargado/admin revisan gastos en `Control de gastos`, pantalla ubicada en `src/features/manager/Expenses.tsx`.
- La tabla de control permite ordenar por todas las columnas visibles de datos.

## Transferencias

- Se cargan con comprobante, nombre/cliente, monto y cuenta.
- La tabla operativa es ordenable por cliente, nombre, comprobante, cuenta, monto y estado; `Accion` no se ordena.
- Pueden asociarse a cliente.
- Impactan en cuenta Local / Banco y cuenta Transferencias.
- Se pueden anular con auditoria.

## Regalos

- Siempre se manejan como efectivo en esta etapa.
- La tabla operativa es ordenable por clientes, detalle, referencia y monto; `Accion` no se ordena.
- Obligatorio: cliente, referencia y monto.
- Detalle opcional.
- Cliente se selecciona desde lista con buscador y seleccion multiple.
- Referencia inicia por defecto en Cajero.
- Se pueden eliminar antes de cerrar caja.

## Salarios desde cajero

- Campos: personal, concepto, periodo trabajado y monto.
- La tabla operativa es ordenable por personal, concepto, periodo trabajado, monto y estado; `Accion` no se ordena.
- Personal inicia vacio y es obligatorio.
- Conceptos visibles para nuevos registros desde cajero: `SALARIO` y `ADELANTO`.
- Encargado/admin siguen usando la lista completa desde `Liquidacion de salarios`: `SALARIO`, `ADELANTO`, `EXTRA`, `HORAS_EXTRAS`, `AGUINALDO`, `SALARIO_VACACIONAL` y `DESCUENTO`.
- `SUELDO` y `AJUSTE` quedan como conceptos heredados para compatibilidad con datos anteriores; `AJUSTE` se normaliza como Premio / Gratificacion.
- `EXTRA` queda como codigo tecnico interno; en interfaz se muestra como Premio / Gratificacion y no es el modulo Regalos de clientes.
- `HORAS_EXTRAS` significa pago por horas trabajadas fuera del horario/base.
- El campo `Periodo trabajado` es obligatorio y usa formato `YYYY-MM`.
- La sugerencia automatica toma la fecha operativa de la caja: dias 1 al 10 sugieren mes anterior; desde el dia 11 sugiere mes actual.
- El pago sale de la caja actual por `balanceId`, pero se imputa a la liquidacion del periodo trabajado seleccionado.
- La validacion de salario base usa el periodo trabajado, no la fecha de pago.
- La validacion bloquea salario pagado mayor al salario base, salario pagado + adelantos mayor al salario base y salario pagado + adelantos + descuentos mayor al salario base.
- Descuento reduce pendiente/base cubierta, pero no genera salida de caja ni cuenta como dinero entregado.
- Se pueden anular antes de cerrar caja; la anulacion es logica, queda auditada y deja de impactar caja, liquidacion y cuenta personal.

## Retiros y aportes

- Tipo inicia vacio y es obligatorio.
- La tabla operativa es ordenable por tipo, medio, persona, monto, fecha y nota; `Accion` no se ordena.
- Momento no se muestra en pantalla operativa; se guarda como OPERATIVO.
- Medio: EFECTIVO o TRANSFERENCIA.
- Persona: RICARDO o MATHIAS.
- Retiros salen de cuenta corriente del local.
- Aportes entran a cuenta corriente del local.
