# Modulo 04 - Gastos, transferencias, regalos, salarios, retiros y aportes

## Gastos

- Se cargan directo desde tabla.
- Obligatorio: categoria, subcategoria y monto.
- Opcional: descripcion y comprobante.
- Comprobante guarda solo metadatos.
- Se pueden eliminar/anular antes de cerrar caja.
- Categorias y subcategorias se definen desde administrador.

## Transferencias

- Se cargan con comprobante, nombre/cliente, monto y cuenta.
- Pueden asociarse a cliente.
- Impactan en cuenta Local / Banco y cuenta Transferencias.
- Se pueden anular con auditoria.

## Regalos

- Siempre se manejan como efectivo en esta etapa.
- Obligatorio: cliente, referencia y monto.
- Detalle opcional.
- Cliente se selecciona desde lista con buscador y seleccion multiple.
- Referencia inicia por defecto en Cajero.
- Se pueden eliminar antes de cerrar caja.

## Salarios desde cajero

- Campos: personal, concepto y monto.
- Personal inicia vacio y es obligatorio.
- Conceptos: SALARIO, ADELANTO, EXTRA, AGUINALDO, SALARIO_VACACIONAL, HORAS_EXTRAS y DESCUENTO.
- `SUELDO` y `AJUSTE` quedan como conceptos heredados para compatibilidad con datos anteriores; `AJUSTE` se normaliza como Extra.
- El salario se liquida a mes vencido: el pago del 1 al 10 del mes siguiente puede corresponder al periodo trabajado anterior.
- Se pueden eliminar antes de cerrar caja.

## Retiros y aportes

- Tipo inicia vacio y es obligatorio.
- Momento no se muestra en pantalla operativa; se guarda como OPERATIVO.
- Medio: EFECTIVO o TRANSFERENCIA.
- Persona: RICARDO o MATHIAS.
- Retiros salen de cuenta corriente del local.
- Aportes entran a cuenta corriente del local.
