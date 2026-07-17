# Modulo 04 - Gastos, transferencias, regalos, salarios, retiros y aportes

Las altas y anulaciones de gastos, transferencias, regalos, retiros y aportes se ejecutan mediante `src/application/movements/operatingMovementCommands.ts`. Cada comando valida funcion, rol real, usuario activo, local asignado y caja abierta, y actualiza entidad, cuentas y auditoria en una operacion tipada. La interfaz conserva solamente formularios, confirmaciones y mensajes.

## Regla comun de efectivo

- Gastos, transferencias desde efectivo, regalos en efectivo, retiros operativos en efectivo y pagos salariales consultan el saldo activo `Local / Efectivo` antes de guardar.
- El importe igual al disponible se acepta. Si la salida dejaria saldo negativo, el comando se rechaza antes de crear entidad, movimiento o auditoria.
- Un aporte real en efectivo puede cubrir el faltante. No se crea una operacion pendiente automaticamente.
- Anulaciones y reversos siguen permitidos porque restituyen saldo y conservan historial.
- Antes de cualquier alta, la caja abierta debe estar conciliada: `efectivo esperado` tiene que coincidir con `Local / Efectivo`.
- Si existe un delta tecnico, se rechazan tambien los aportes ordinarios porque mueven ambos calculos por igual y no corrigen el desacople.
- Una anulacion o correccion historica con impacto en efectivo se bloquea mientras exista otra caja abierta del mismo local. Los reversos pertenecientes a la caja abierta se mantienen disponibles.
- Banco se controla por separado y no forma parte de esta regla.

## Gastos

- Se cargan directo desde tabla.
- La tabla operativa del cajero es ordenable por categoria, descripcion y monto; `Accion` no se ordena.
- Obligatorio: categoria, subcategoria y monto.
- Opcional: descripcion y comprobante.
- Comprobante guarda solo metadatos.
- Se pueden eliminar/anular antes de cerrar caja.
- Categorias y subcategorias se definen desde administrador.
- Encargado/admin revisan gastos en `Control de gastos`, pantalla ubicada en `src/features/manager/Expenses.tsx`.
- El Encargado asignado tambien puede registrar y eliminar gastos de la caja abierta desde `Cargar gastos`, sin cambiar a Cajero. El comando usa su funcion `ENCARGADO`, el mismo `balanceId` y la misma cuenta `Local / Efectivo`.
- Encargado/admin no pueden anular un gasto historico con impacto en efectivo mientras exista otra caja abierta del local.
- La tabla de control permite ordenar por todas las columnas visibles de datos.

## Transferencias

- Se cargan con comprobante, nombre/cliente, monto y cuenta.
- La tabla operativa es ordenable por cliente, nombre, comprobante, cuenta, monto y estado; `Accion` no se ordena.
- Pueden asociarse a cliente.
- Salen de `Local / Efectivo`, entran en `Local / Banco` y se registran en la cuenta Transferencias.
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

- Formularios y tablas operativas usan tipografia compacta, encabezado claro e importes monoespaciados.
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
- Toda liquidacion que entregue dinero valida efectivo disponible. Al corregir una liquidacion del mismo local se controla solamente el incremento neto respecto de la reemplazada.
- Una liquidacion administrativa con salida de efectivo debe quedar asociada a la caja abierta del local. No puede modificar solo el libro contable mientras la caja calcula otro saldo.
- Se pueden anular antes de cerrar caja; la anulacion es logica, queda auditada y deja de impactar caja, liquidacion y cuenta personal.

## Retiros y aportes

- Tipo inicia vacio y es obligatorio.
- La tabla operativa es ordenable por tipo, medio, persona, monto, fecha y nota; `Accion` no se ordena.
- Momento no se muestra en pantalla operativa; se guarda como OPERATIVO.
- Medio: EFECTIVO o TRANSFERENCIA.
- Persona: RICARDO o MATHIAS.
- Retiros salen de cuenta corriente del local.
- Aportes entran a cuenta corriente del local.
- Un retiro operativo en efectivo se rechaza si supera el saldo `Local / Efectivo`; un retiro por transferencia queda fuera de esta validacion.
- La carga admite funcion `CAJERO` o `ENCARGADO`. Para Encargado exige local asignado y conserva rol real, funcion, usuario y recaudacion en auditoria.
- El Administrador conserva el flujo `Trabajar como cajero`; esta excepcion no amplia su funcion administrativa.
- La pantalla muestra caja activa, efectivo disponible, banco actual y funcion usada. Una salida sin fondos se rechaza completa; no se crea cuota, deuda ni movimiento parcial.
