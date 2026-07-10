# Modulo 09 - Locales, maquinas y taller

## Codigo actual

- La pantalla de Locales, la pantalla de Maquinas/Taller, los editores flotantes y los modales de historial viven en `src/features/admin/LocationsMachines.tsx`.
- `src/App.tsx` solo enruta hacia `AdminLocals` y `AdminMachines`.
- Las reglas de contadores y totales se comparten con `src/lib/cashTotals.ts`, `src/lib/machineHistory.ts`, `src/lib/currentAccounts.ts` y `src/lib/accountMovements.ts`.

## Locales

- ID numerico corto.
- Estados: ACTIVO, INACTIVO, CERRADO.
- Tabla principal con buscador, ordenamiento y selector de columnas.
- Columnas fijas: ID, Local, Estado, Maquinas, Recaudaciones, Acciones.
- Clic en nombre abre historial.
- El modal de historial de local permite ordenar las tablas de Datos, Maquinas, Estados, Recaudaciones y Auditoria por sus columnas visibles.
- Clic en cantidad de maquinas abre ventana con maquinas asociadas.
- La ventana de maquinas asociadas permite ordenar el listado por ID, maquina, estado, ubicacion, IN actual y OUT actual; `Accion` no se ordena.
- El historial de maquinas dentro de esa ventana permite ordenar por fecha, ID, maquina, movimiento y detalle.
- Agregar/editar abre ventana flotante.
- Desde agregar/editar se pueden asociar maquinas del Taller.

## Cierre de local

- Al pasar a CERRADO, las maquinas vuelven al Taller.
- Debe haber aviso previo y confirmacion.
- Movimiento queda en historial y auditoria.

## Maquinas

- Nacen por defecto en Taller.
- ID corto visible.
- Estados: ACTIVA, INACTIVA, MANTENIMIENTO, DESUSO.
- DESUSO solo puede estar en Taller.
- DESUSO aparece solo en apartado de desuso del Taller.
- No aparece en listado general de Maquinas.
- El historial dentro del editor de maquina permite ordenar por fecha, local, movimiento y detalle.
- El modal de historial de maquina permite ordenar sus pestañas de Locales, Contadores y Auditoria por todas las columnas visibles de datos.

## Taller

- Contiene maquinas disponibles.
- Contiene apartado de maquinas en desuso.
- El apartado de maquinas en desuso permite ordenar por ID, maquina, IN actual y OUT actual; `Accion` no se ordena.
- Desde Taller se asignan maquinas a locales.
- Los selectores de maquinas del Taller permiten ordenar por todas sus columnas visibles de datos; el checkbox de seleccion no se ordena.

## Eliminacion de maquinas

- Primero debe estar en Taller.
- No puede eliminarse si tiene recaudaciones.
- Si no tiene recaudaciones, puede eliminarse con confirmacion y auditoria.

## Reset de contadores

- Solo desde administrador.
- No puede hacerse si hay caja abierta para el local.
- Pone IN y OUT en 0.
- Queda en auditoria e historial de maquina.
