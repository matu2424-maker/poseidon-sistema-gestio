# Modulo 12 - Auditoria

## Objetivo

Permitir rastrear que paso, cuando paso, quien lo hizo y con que funcion.

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

## Reglas

- La auditoria no se borra.
- Si encargado/admin trabajan como cajero, debe verse el usuario real y la funcion Cajero.
- Las diferencias deben conservar observacion original y revision posterior.
- Las eliminaciones definitivas requieren confirmacion.

