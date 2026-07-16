# Modulo 12 - Auditoria

## Objetivo

Permitir rastrear que paso, cuando paso, quien lo hizo y con que funcion.

## Codigo actual

- La construccion central de eventos vive en `src/lib/audit.ts`.
- La pantalla general de bitacora vive en `src/features/audit/Audit.tsx`.
- `src/App.tsx` conserva el wrapper `audit(...)` para inyectar usuario real, rol real y funcion activa al crear eventos.

## Eventos a registrar

- Crear.
- Editar.
- Anular.
- Dar de baja.
- Enviar a papelera.
- Restaurar.
- Eliminar definitivo.
- Abrir caja.
- Cerrar caja.
- Crear pago de salario desde cajero.
- Anular pago de salario desde cajero.
- Crear/editar liquidacion de salario desde encargado/admin.
- Cambiar salario base o tipo de salario del personal.
- Cerrar periodo salarial definitivo.
- Iniciar, cerrar o cancelar ajuste correctivo salarial.
- Gestionar diferencia.
- Reset de contadores.
- Mover maquina.
- Cierre periodico.
- Ajustes sensibles.

## Campos esperados

- Fecha/hora.
- Usuario.
- Nombre de usuario.
- Rol real.
- Funcion usada.
- Accion.
- Entidad.
- ID entidad.
- Valor anterior.
- Valor nuevo.
- Motivo/observacion.
- Local asociado cuando pueda resolverse por entidad, recaudacion, cuenta o payload.
- Fotografia de `localIds` asociados al momento de crear el evento.

## Reglas

- Tabla, filtros y detalle usan la escala visual global, encabezado claro y jerarquia basada en espacio y color antes que negrita.
- La auditoria no se borra.
- Los eventos visibles son registros persistidos; no se inventan fechas durante el render.
- Contraseñas y contenido inline de archivos quedan omitidos del valor anterior/nuevo.
- El alcance local historico usa los `localIds` congelados del evento y no cambia si una entidad se mueve despues.
- Si encargado/admin trabajan como cajero, debe verse el usuario real y la funcion Cajero.
- Las diferencias deben conservar observacion original y revision posterior.
- La gestion de diferencias debe permitir auditar si los movimientos de cuenta quedaron activos (`VERIFICADA`/`CORREGIDA`) o anulados (`ANULADA`).
- Los pagos de salario desde cajero deben auditar periodo trabajado, caja asociada, concepto, monto, usuario real, rol real y funcion usada.
- La anulacion de pagos de salario desde cajero es logica: no borra el historial y debe dejar de impactar caja, liquidacion y cuenta personal.
- Los cambios de salario base deben auditar fecha efectiva, valor anterior, valor nuevo, usuario y motivo.
- Los descuentos salariales deben quedar auditados como reduccion de pendiente/base cubierta, no como salida de caja.
- Cada cierre salarial audita la foto completa, usuario, revision, cierre padre y motivo. Las operaciones correctivas guardan el ID de la revision que las autorizo.
- Un cierre salarial incluido en auditoria conserva sus `localIds` desde los snapshots por empleado.
- Las eliminaciones definitivas requieren confirmacion.
- La tabla principal de auditoria permite ordenar por fecha/hora, usuario, accion, entidad, funcion y motivo.
- La columna `Accion` abre el detalle y es la unica columna no ordenable por ser un comando.
- Administrador ve todos los eventos. Encargado ve solo eventos asociados a sus locales; eventos globales o sin contexto local resoluble quedan fuera de su vista.
- El detalle muestra valor anterior/nuevo, entidad e ID, local y motivo.
- Una gestion de diferencia muestra ademas saldos efectivo/banco antes y despues y los movimientos contables generados, incluidos sus IDs y `previousAdjustmentId`.
