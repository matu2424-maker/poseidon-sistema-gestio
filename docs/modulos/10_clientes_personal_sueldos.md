# Modulo 10 - Clientes, personal y salarios

## Clientes

- Identificador principal: documento.
- Tipo documento: Cedula o Pasaporte.
- Cedula acepta solo numeros.
- Pasaporte acepta letras y numeros.
- Documento obligatorio.
- No puede duplicarse tipo + documento en clientes activos/inactivos.
- Pueden tener foto y archivo de documento como metadatos.
- Cajero puede agregar, editar y enviar a papelera.
- La tabla de clientes desde cajero es ordenable por ID, cliente, documento, categoria, telefono, email y estado; `Acciones` no se ordena.
- El selector multiple de clientes para regalos es ordenable por ID, cliente, documento, categoria y telefono; el checkbox de seleccion no se ordena.
- Administrador puede gestionar clientes.
- La tabla administrativa de clientes es ordenable por ID, cliente, documento, categoria, local, estado, telefono, email, foto y archivo de cedula/pasaporte; `Acciones` no se ordena.

## Personal

- Administrador puede agregar, editar, dar de baja y enviar a papelera.
- Datos principales: nombre, apellido, documento, direccion, telefono, email, nacimiento, cargo, local, fecha ingreso, tipo de salario, salario base, adelantos, vacaciones, contacto emergencia, cuenta bancaria, horarios y notas.
- En el alta/edicion de personal se muestra una nota de campos obligatorios y cada campo requerido lleva `*`.
- Campos obligatorios: nombre, apellido, cargo, local, estado, tipo salario y salario nominal.
- Cargo no es texto libre: se selecciona entre `Cajera/o`, `Encargado/a`, `Mantenimiento` y `Limpieza`.
- Horarios por dia de semana.
- Baja no elimina historial.
- La tabla principal de personal permite ordenar por ID, nombre, cargo, local, salario, estado, vacaciones, aguinaldo estimado y salario vacacional estimado; `Acciones` no se ordena.

## Liquidacion de salarios

- Etapa actual: registro manual, no liquidacion legal automatica.
- Conceptos de liquidacion administrativa: SALARIO, ADELANTO, EXTRA, HORAS_EXTRAS, AGUINALDO, SALARIO_VACACIONAL y DESCUENTO. `SUELDO` y `AJUSTE` quedan como conceptos heredados para compatibilidad; `AJUSTE` se normaliza como Premio / Gratificacion.
- Pago de salarios del cajero usa una lista reducida para nuevos registros: solo SALARIO y ADELANTO.
- Todo pago del cajero sigue guardandose como `SalarySettlement`; no existe una tabla paralela de pagos.
- En cajero, el campo `Periodo trabajado` es obligatorio y se guarda en `SalarySettlement.period`.
- Sugerencia de periodo desde cajero: con fecha operativa entre dia 1 y 10 inclusive se sugiere mes anterior; desde dia 11 se sugiere mes actual.
- El pago del cajero sale de la caja actual por `balanceId`, pero se muestra en liquidacion y cuenta personal segun el periodo trabajado elegido.
- `EXTRA` queda como codigo tecnico interno; en la interfaz se muestra `Premio / Gratificacion` y no pertenece al modulo Regalos de clientes.
- HORAS_EXTRAS significa pago por horas trabajadas fuera del horario/base.
- Admin/encargado ven la liquidacion por periodo mensual.
- El selector muestra primero el nombre del mes anterior, luego el mes actual y luego `Consultar mes`.
- Los botones de mes anterior y mes actual mantienen el mismo ancho aunque cambie el nombre del mes.
- El selector mensual reutiliza el componente compartido con Diferencias y Cuentas corrientes para mantener etiquetas, anos y medidas consistentes.
- `Consultar mes` permite elegir mes y ano; no usa rango libre entre dos fechas.
- Al abrir la pantalla, el periodo inicial se sugiere segun fecha de pago: del dia 1 al 10 se abre mes anterior; desde el dia 11 se abre mes actual.
- La sugerencia es solo inicial e informativa; el usuario puede cambiar manualmente el periodo.
- La vista principal se organiza por empleado y muestra nombre, salario base, premios y horas, bonos, descuentos, total, adelantos, salario pagado, pendiente y accion.
- La vista principal no tiene buscador.
- La vista principal no muestra la cuenta corriente del personal y no tiene alta global de liquidaciones.
- Cada fila de empleado tiene boton `Detalle` para entrar a su pantalla de liquidacion.
- Cada empleado activo inicia cada periodo mensual con un salario base tomado de `Personal` y su historial salarial.
- La liquidacion se trabaja por periodo devengado/trabajado. El salario de enero puede pagarse del 1 al 10 de febrero, pero la liquidacion debe quedar asociada a enero.
- Encargado/admin pueden modificar tipo de salario y salario base; cada cambio genera historial con fecha efectiva, valor anterior, valor nuevo, usuario y motivo.
- El historial salarial dentro del editor de personal permite ordenar por fecha efectiva, tipo anterior, tipo nuevo, salario anterior, salario nuevo, usuario y motivo.
- El cambio de salario base es prospectivo: no modifica liquidaciones cerradas. Si la fecha efectiva afecta un cierre de liquidacion cerrado, se bloquea.
- Si el cambio afecta periodos abiertos con liquidaciones activas, se pide reconfirmacion antes de guardar.
- Tipos de salario disponibles: mensual, jornal y hora. Para mensual, el salario base representa 30 dias de trabajo.
- Una liquidacion con concepto `Salario` no reemplaza la base: registra un pago realizado contra el pendiente.
- Debajo del nombre se muestra si no hay liquidacion cargada o cuantas liquidaciones activas tiene el empleado, con su estado consolidado.
- Si el empleado activo no tiene pagos del periodo, aparece en la tabla y su salario base integra los totales.
- Total por empleado = salario base + premio/gratificacion + horas extras + bonos - descuentos.
- Pagado / Entregado por empleado = salario pagado + adelantos + premio/gratificacion + horas extras + bonos.
- Cubierto base por empleado = salario pagado + adelantos + descuentos.
- Pendiente por empleado = salario base - salario pagado - adelantos - descuentos. Es el dinero de salario base que falta entregarle al empleado.
- El salario pagado no puede superar el salario base del periodo.
- La suma de salario pagado + adelantos no puede superar el salario base del periodo. Si supera, se muestra error y no se guarda.
- La suma de salario pagado + adelantos + descuentos no puede superar el salario base del periodo. El descuento cubre base, pero no es dinero entregado.
- Los adelantos restan pendiente pero no se suman al total.
- El resumen global muestra pendientes, total salarios, total salarios base y premios/horas.
- En el detalle de empleado se muestra un resumen compacto de salario base, adelantos, premios/horas, bonos, total, cubierto base, pagado/entregado y pendiente, junto con local, periodo, tipo/cargo y descuentos.
- En `Detalle` se ve el desglose del empleado, liquidaciones del periodo y cuenta corriente del empleado.
- En `Liquidaciones del periodo`, el boton `Agregar liquidacion` abre un formulario con mes, personal fijo, concepto principal, monto y notas.
- La tabla `Liquidaciones del periodo` permite ordenar por mes, concepto, salario pagado, adelanto, premio/gratificacion, horas extras, bonos, descuento y estado.
- El personal no se puede cambiar en ese formulario porque se entra desde el detalle del empleado.
- El estado no se carga manualmente: al guardar, la liquidacion queda `CONFIRMADA`.
- Eliminar una liquidacion o un pago de salario desde cajero es una baja logica auditada: cambia su estado a `ANULADA`, deja de impactar caja, totales y cuenta personal, pero no borra el historial.
- Impacto por concepto: salario suma a salario pagado; adelanto suma a adelantos; aguinaldo y salario vacacional suman a bonos; premio/gratificacion suma como reconocimiento interno del empleado; horas extras suma como pago de horas trabajadas fuera de horario; descuento resta directo del salario base y no genera salida de caja.
- Cada liquidacion guarda origen (`CAJA` o `LIQUIDACION`), usuario creador, usuario aprobador, fecha de aprobacion y, si se elimina, usuario/fecha de anulacion.
- Los movimientos de cuenta generados por liquidaciones usan el usuario real que ejecuto la accion; no deben quedar como `system` salvo datos migrados sin usuario.
- La pantalla permite exportar el resumen del periodo en formato CSV compatible con Excel.
- La cuenta corriente del empleado se consulta dentro del detalle de cada empleado.
- La cuenta corriente del empleado muestra fecha, concepto, monto, total, pendiente y usuario. Todas sus columnas son ordenables. `Total` es base + premio/gratificacion + horas extras + bonos - descuentos al momento del movimiento, y `Pendiente` es el pendiente al momento de registrar ese movimiento.
- La cuenta corriente del empleado usa el periodo trabajado de la liquidacion. Un pago cargado hoy para un mes anterior se ve en el detalle de ese mes anterior.
- Al hacer clic en un movimiento de la cuenta corriente del empleado se abre un detalle completo con origen, usuario, recaudacion asociada y notas.
- Si el movimiento tiene `balanceId`, desde ese detalle se puede abrir el resumen completo de la recaudacion asociada.
- La pantalla permite cerrar la liquidacion del periodo seleccionado. El cierre guarda una foto auditada con totales, empleados, liquidaciones incluidas, usuario y fecha.
- Abajo se muestra historial de cierres de liquidacion. Anular un cierre no borra las liquidaciones ni la auditoria.
- La tabla de historial de cierres de liquidacion permite ordenar por ID, periodo, empleados, total salarios, cubierto base, pagado/entregado, pendiente, usuario, fecha cierre y estado.
- Las cuentas personales no se muestran en `Cuentas corrientes`; se consultan desde este modulo.
- Cajero carga pago simple desde caja abierta.
- Salarios de una caja nueva siempre inician en 0.
- Anular salario antes de cerrar caja deja el movimiento asociado en estado anulado y no impacta caja, liquidacion ni cuenta personal.

## Papelera

- Aplica a personal y clientes.
- Permite restaurar.
- Permite eliminar definitivamente con confirmacion y auditoria.
- Las tablas de papelera permiten ordenar por sus columnas visibles de datos; `Accion` no se ordena.
