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
- Administrador puede gestionar clientes.

## Personal

- Administrador puede agregar, editar, dar de baja y enviar a papelera.
- Datos principales: nombre, apellido, documento, direccion, telefono, email, nacimiento, cargo, local, fecha ingreso, tipo de salario, salario base, adelantos, vacaciones, contacto emergencia, cuenta bancaria, horarios y notas.
- En el alta/edicion de personal se muestra una nota de campos obligatorios y cada campo requerido lleva `*`.
- Campos obligatorios: nombre, apellido, cargo, local, estado, tipo salario y salario nominal.
- Cargo no es texto libre: se selecciona entre `Cajera/o`, `Encargado/a`, `Mantenimiento` y `Limpieza`.
- Horarios por dia de semana.
- Baja no elimina historial.

## Liquidacion de salarios

- Etapa actual: registro manual, no liquidacion legal automatica.
- Conceptos: SALARIO, ADELANTO, EXTRA, AGUINALDO, SALARIO_VACACIONAL, HORAS_EXTRAS y DESCUENTO. `SUELDO` y `AJUSTE` quedan como conceptos heredados para compatibilidad; `AJUSTE` se normaliza como Extra.
- Pago de salarios del cajero y liquidacion de encargado/admin comparten esta misma lista de conceptos.
- Admin/encargado ven la liquidacion por periodo con el mismo selector de `Cuentas corrientes`: mes actual, mes anterior y consulta historica por rango manual.
- La vista principal se organiza por empleado y muestra nombre, salario base, extras, bonos, descuentos, total, adelantos, salario pagado, pendiente y accion.
- La vista principal no tiene buscador.
- La vista principal no muestra la cuenta corriente del personal y no tiene alta global de liquidaciones.
- Cada fila de empleado tiene boton `Detalle` para entrar a su pantalla de liquidacion.
- Cada empleado activo inicia cada periodo mensual con un salario base tomado de `Personal` y su historial salarial.
- La liquidacion se trabaja por periodo devengado/trabajado. El salario de enero puede pagarse del 1 al 10 de febrero, pero la liquidacion debe quedar asociada a enero.
- Encargado/admin pueden modificar tipo de salario y salario base; cada cambio genera historial con fecha efectiva, valor anterior, valor nuevo, usuario y motivo.
- Tipos de salario disponibles: mensual, jornal y hora. Para mensual, el salario base representa 30 dias de trabajo.
- Una liquidacion con concepto `Salario` no reemplaza la base: registra un pago realizado contra el pendiente.
- Debajo del nombre se muestra si no hay liquidacion cargada o cuantas liquidaciones activas tiene el empleado, con su estado consolidado.
- Si el empleado activo no tiene pagos del periodo, aparece en la tabla y su salario base integra los totales.
- Total por empleado = salario base + extras + horas extras + bonos - descuentos.
- Liquidado por empleado = salario pagado + adelantos + extras + bonos - descuentos.
- Pendiente por empleado = salario base - salario pagado - adelantos - descuentos. Es el dinero de salario base que falta entregarle al empleado.
- El salario pagado no puede superar el salario base del periodo.
- La suma de salario pagado + adelantos no puede superar el salario base del periodo. Si supera, se muestra error y no se guarda.
- Los adelantos restan pendiente pero no se suman al total.
- El resumen global muestra pendientes, total salarios, total salarios base y extras.
- En el detalle de empleado se muestra un resumen compacto de salario base, adelantos, extras, bonos, total, liquidado y pendiente, junto con local, periodo, tipo/cargo y descuentos.
- En `Detalle` se ve el desglose del empleado, liquidaciones del periodo y cuenta corriente del empleado.
- En `Liquidaciones del periodo`, el boton `Agregar liquidacion` abre un formulario con mes, personal fijo, concepto principal, monto y notas.
- La tabla `Liquidaciones del periodo` permite ordenar por mes, concepto, salario pagado, adelanto, extra, bonos, descuento y estado.
- El personal no se puede cambiar en ese formulario porque se entra desde el detalle del empleado.
- El estado no se carga manualmente: al guardar, la liquidacion queda `CONFIRMADA`.
- Eliminar una liquidacion es una baja logica auditada: cambia su estado a `ANULADA`, deja de impactar totales, pero no borra el historial.
- Impacto por concepto: salario suma a salario pagado; adelanto suma a adelantos; aguinaldo y salario vacacional suman a bonos; extra y horas extras suman a extras; descuento resta directo del salario base y no genera salida de caja.
- Cada liquidacion guarda origen (`CAJA` o `LIQUIDACION`), usuario creador, usuario aprobador, fecha de aprobacion y, si se elimina, usuario/fecha de anulacion.
- Los movimientos de cuenta generados por liquidaciones usan el usuario real que ejecuto la accion; no deben quedar como `system` salvo datos migrados sin usuario.
- La pantalla permite exportar el resumen del periodo en formato CSV compatible con Excel.
- La cuenta corriente del empleado se consulta dentro del detalle de cada empleado.
- La cuenta corriente del empleado muestra fecha, concepto, monto, total, pendiente y usuario. Todas sus columnas son ordenables. `Total` es base + extras + horas extras + bonos - descuentos al momento del movimiento, y `Pendiente` es el pendiente al momento de registrar ese movimiento.
- La cuenta corriente del empleado usa el periodo trabajado de la liquidacion. Un pago cargado hoy para un mes anterior se ve en el detalle de ese mes anterior.
- Al hacer clic en un movimiento de la cuenta corriente del empleado se abre un detalle completo con origen, usuario, recaudacion asociada y notas.
- La pantalla permite cerrar la liquidacion del periodo seleccionado. El cierre guarda una foto auditada con totales, empleados, liquidaciones incluidas, usuario y fecha.
- Abajo se muestra historial de cierres de liquidacion. Anular un cierre no borra las liquidaciones ni la auditoria.
- Las cuentas personales no se muestran en `Cuentas corrientes`; se consultan desde este modulo.
- Cajero carga pago simple desde caja abierta.
- Salarios de una caja nueva siempre inician en 0.
- Eliminar salario antes de cerrar caja elimina su movimiento asociado.

## Papelera

- Aplica a personal y clientes.
- Permite restaurar.
- Permite eliminar definitivamente con confirmacion y auditoria.
