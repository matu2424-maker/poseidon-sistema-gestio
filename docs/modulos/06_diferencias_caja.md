# Modulo 06 - Diferencias de caja

La gestion atomica vive en `src/application/differences/manageDifference.ts`; valida rol real, funcion activa, usuario activo, local, estado, caja abierta, observacion e importes, y aplica declarados, delta contable append-only y auditoria.

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
- ANULADA: anula la diferencia y sus movimientos de cuenta, deja diferencia efectiva en cero y ajusta los campos de base de la recaudacion objetivo al calculo esperado, sin borrar auditoria.
- La anulacion conserva los asientos originales y agrega contramovimientos activos de sentido contrario; no marca como inactivo el ajuste que debe llevar el saldo a cero.
- Los unicos estados vigentes son `PENDIENTE`, `VERIFICADA`, `CORREGIDA` y `ANULADA`.
- Matriz: `PENDIENTE -> VERIFICADA/CORREGIDA/ANULADA`; `VERIFICADA -> CORREGIDA/ANULADA`; `CORREGIDA -> CORREGIDA/ANULADA`; `ANULADA` es terminal.
- Compatibilidad historica: al cargar datos, `REVISADA` se convierte en `VERIFICADA`, `AJUSTADA` en `CORREGIDA` y `RESUELTA` se normaliza segun diferencia/gestion existente. Los eventos de auditoria no se borran.

## Obligatorio

- Elegir accion.
- Escribir observacion del encargado/admin.
- Mantener observacion original del cajero.
- No debe existir una caja `EN_PROCESO` del mismo local al gestionar. Una caja abierta de otro local no bloquea.

## Flujo de pantalla

- La pantalla usa el piloto visual minimalista de Poseidon: selector de periodo compacto, una superficie unica de resumen, tabla principal como foco y modal de gestion plano.
- La pantalla funciona como historial por periodo: boton del mes anterior, boton del mes actual o consulta historica por mes/ano.
- El periodo usa primero `operatingDate`; solo para datos heredados sin fecha operativa usa la fecha de cierre convertida a `America/Montevideo`.
- Debe mostrar todas las recaudaciones con historial real de diferencia o control en el periodo, incluidas verificadas, corregidas y anuladas. Una caja sin diferencia ni gestion no aparece como control artificial.
- El resumen superior muestra pendientes, diferencia efectivo, diferencia banco y gestionadas dentro de una sola superficie compacta.
- Las cuatro metricas consideran todo el periodo seleccionado. El buscador y el filtro de estado cambian solo la cantidad y filas de `resultados visibles`.
- La regla de impacto contable aparece como ayuda breve: mueve efectivo/banco del local para que la proxima caja abra con saldo real y no cambia resultado economico.
- Arriba de la tabla hay buscador por ID, local, fecha u observacion y filtro de estado, ambos con etiqueta visible.
- Se puede filtrar por pendientes, gestionadas, todas o por estado especifico.
- La tabla es compacta, usa encabezado claro y no muestra formularios largos por fila.
- Titulos, estados, metricas e historial respetan la escala global `400/500/600`, sin negrita generalizada.
- La tabla permite ordenar por todas sus columnas visibles de datos.
- La tabla principal muestra caja, fecha, local, diferencia efectivo, diferencia banco, estado, ultima gestion y accion.
- La observacion de cierre no se muestra como columna principal para mantener la tabla limpia; se ve dentro del detalle.
- Clic en una fila abre una ventana flotante con el detalle de efectivo/banco, observacion original y ultima gestion. `Gestionar` mantiene enfasis primario y `Ver detalle` aparece como accion secundaria.
- La gestion se guarda desde la ventana flotante con accion y observacion obligatoria.
- Antes de guardar, la interfaz reconfirma la accion y explica si mantiene, corrige o revierte el impacto contable.
- El error de observacion obligatoria se muestra dentro de la ventana flotante donde se esta gestionando la diferencia.
- Si la accion es `CORREGIDA`, la ventana muestra campos para efectivo declarado corregido y dinero banco declarado corregido.
- Una correccion no se acepta si falta alguno de los dos importes o si contiene un valor no numerico.
- En correccion, un campo vacio no se convierte en cero; permanece vacio y el error aparece dentro del modal.
- El comando vuelve a validar permisos: encargado solo puede gestionar cajas de sus locales asignados; administrador puede gestionar todos.
- Al guardar una correccion, se actualizan los importes declarados, campos de base, diferencias y movimientos de cuenta de la recaudacion objetivo.
- Si la recaudacion es historica, no se reescribe ninguna caja posterior ni sus fondos iniciales. El ajuste entra al libro con fecha de gestion.
- Cada delta crea un movimiento nuevo con ID unico y `previousAdjustmentId`; ajustes anteriores no se reemplazan.
- Al guardar una anulacion, se conservan los datos auditados del antes/despues, pero la diferencia efectiva queda en cero y los movimientos de cuenta quedan sin impacto activo.
- La ventana flotante muestra el historial completo auditado de cierre, revision, correccion o anulacion de esa recaudacion mediante secciones separadas por lineas y espacio, sin tarjetas anidadas.
- Para cierres historicos, el historial reconoce eventos de auditoria con entidad `Caja` ademas de `BalanceDiario` y `DiferenciaCaja`.
- Al guardar, el estado queda en la recaudacion y se registra auditoria.
- El evento auditado contiene local, recaudacion, saldos de efectivo/banco antes y despues, e IDs y datos de todos los movimientos nuevos.

## Revision tecnica cerrada

Los riesgos priorizados del piloto de subagentes del 2026-07-11 quedaron resueltos en este bloque: perfiles validados en tarea nueva, matriz de estados, bloqueo por caja abierta, historial append-only, IDs inyectables, finitud, periodo operativo, alcance local y auditoria contable autosuficiente.
