# Modulo 06 - Diferencias de caja

## Objetivo

Controlar diferencias de efectivo y banco sin ocultarlas y sin mezclarlas con el resultado economico.

## Reglas

- Diferencia efectivo = efectivo declarado - efectivo esperado.
- Diferencia banco = banco declarado - banco esperado.
- No modifican resultado economico.
- Si mueven cuentas corrientes del local al cerrar caja, para que la siguiente apertura use el saldo real declarado.
- El movimiento de diferencia queda separado de gastos, regalos, salarios y resultado de maquinas.
- Quedan visibles y auditadas.
- Encargado/admin deben gestionarlas.

## Acciones de gestion

- VERIFICADA: confirma que la diferencia existe y mantiene activos los movimientos de diferencia.
- CORREGIDA: permite editar efectivo declarado y banco declarado, recalcula diferencias, sincroniza cuentas y mantiene trazabilidad.
- ANULADA: anula la diferencia y sus movimientos de cuenta, deja diferencia efectiva en cero y revierte los saldos proximos de la recaudacion al calculo esperado, sin borrar auditoria.

## Obligatorio

- Elegir accion.
- Escribir observacion del encargado/admin.
- Mantener observacion original del cajero.

## Flujo de pantalla

- La pantalla usa una estetica minimalista similar a `Liquidacion de salarios`: selector de periodo compacto, resumen chico, tabla principal como foco y modal de gestion.
- La pantalla funciona como historial por periodo: boton del mes anterior, boton del mes actual o consulta historica por mes/ano.
- Debe mostrar todas las recaudaciones con historial de diferencia o control en el periodo, incluidas verificadas, corregidas, anuladas y resueltas.
- El resumen superior muestra pendientes, diferencia efectivo, diferencia banco y gestionadas.
- La regla de impacto contable aparece como ayuda breve: mueve efectivo/banco del local para que la proxima caja abra con saldo real y no cambia resultado economico.
- Arriba de la tabla hay buscador por ID, local, fecha u observacion y filtro de estado.
- Se puede filtrar por pendientes, gestionadas, todas o por estado especifico.
- La tabla es compacta y no muestra formularios largos por fila.
- La tabla permite ordenar por todas sus columnas visibles de datos.
- La tabla principal muestra caja, fecha, local, diferencia efectivo, diferencia banco, estado, ultima gestion y accion.
- La observacion de cierre no se muestra como columna principal para mantener la tabla limpia; se ve dentro del detalle.
- Clic en una fila o en `Gestionar` abre una ventana flotante con el detalle de efectivo/banco, observacion original y ultima gestion.
- La gestion se guarda desde la ventana flotante con accion y observacion obligatoria.
- El error de observacion obligatoria se muestra dentro de la ventana flotante donde se esta gestionando la diferencia.
- Si la accion es `CORREGIDA`, la ventana muestra campos para efectivo declarado corregido y dinero banco declarado corregido.
- Al guardar una correccion, se actualizan los importes declarados, saldos proximos, diferencias y movimientos de cuenta de la recaudacion.
- Al guardar una anulacion, se conservan los datos auditados del antes/despues, pero la diferencia efectiva queda en cero y los movimientos de cuenta quedan sin impacto activo.
- La ventana flotante muestra el historial completo auditado de cierre, revision, correccion o anulacion de esa recaudacion.
- Al guardar, el estado queda en la recaudacion y se registra auditoria.
