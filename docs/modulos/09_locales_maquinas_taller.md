# Modulo 09 - Locales, maquinas y taller

## Codigo actual

- Las tablas y modales de asociacion viven en `src/features/admin/LocationsMachines.tsx`; editores e historiales viven en `src/features/admin/locationsMachines/`.
- Las operaciones atomicas viven en `src/application/locations/localCommands.ts` y `src/application/machines/machineCommands.ts`.
- `src/App.tsx` solo enruta hacia `AdminLocals` y `AdminMachines`.
- Las reglas de contadores y totales se comparten con `src/lib/cashTotals.ts`, `src/lib/machineHistory.ts`, `src/lib/currentAccounts.ts` y `src/lib/accountMovements.ts`.

## Locales

- Un local con recaudaciones, maquinas, personal, clientes, usuarios, liquidaciones, tesoreria, movimientos de socios, cierres, cuentas o historial no se elimina fisicamente; debe pasar a `CERRADO`.

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
- Alta, edicion, cierre y baja exigen usuario Administrador real, funcion Administrador y estado activo; actualizan local, cuentas, maquinas, historial y auditoria en un unico comando.
- La baja permitida elimina el maestro y sus cuentas vacias, pero conserva los
  eventos de auditoria con el ID historico del local.

## Cierre de local

- Al pasar a CERRADO, las maquinas vuelven al Taller.
- No se puede cerrar un local mientras tenga una caja abierta.
- Debe haber aviso previo y confirmacion.
- Movimiento queda en historial y auditoria.

## Maquinas

- Nacen por defecto en Taller.
- Alta, edicion, reset, traslado, asignacion y baja se validan fuera de React mediante comandos tipados.
- ID corto visible.
- Estados: ACTIVA, INACTIVA, MANTENIMIENTO, DESUSO.
- DESUSO solo puede estar en Taller.
- DESUSO aparece solo en apartado de desuso del Taller.
- No aparece en listado general de Maquinas.
- El historial dentro del editor de maquina permite ordenar por fecha, local, movimiento y detalle.
- Con caja abierta no se puede mover una maquina hacia/desde el local ni ajustar sus contadores administrativos.
- El modal de historial de maquina permite ordenar sus pestañas de Locales, Contadores y Auditoria por todas las columnas visibles de datos.

## Taller

- `taller` es una ubicacion virtual valida para maquinas, historial y alcance de
  auditoria; no debe existir como fila en `locals`.
- Locales, maquinas, historiales y taller usan tablas compactas con encabezado claro y pesos maximos de `600`.
- Contiene maquinas disponibles.
- Contiene apartado de maquinas en desuso.
- El apartado de maquinas en desuso permite ordenar por ID, maquina, IN actual y OUT actual; `Accion` no se ordena.
- Desde Taller se asignan maquinas a locales.
- No se asignan maquinas a un local mientras tenga una caja abierta.
- Los selectores de maquinas del Taller permiten ordenar por todas sus columnas visibles de datos; el checkbox de seleccion no se ordena.

## Eliminacion de maquinas

- Primero debe estar en Taller.
- No puede eliminarse si tiene recaudaciones.
- Si no tiene recaudaciones, puede eliminarse con confirmacion y auditoria.
- La fila se quita de `machines`, pero toda su cadena de historial permanece
  asociada al tombstone `QUITADA`.

## Reset de contadores

- Solo desde administrador.
- No puede hacerse si hay caja abierta para el local.
- Pone IN y OUT en 0.
- Queda en auditoria e historial de maquina.

## Backend remoto preparatorio

- Las siete operaciones maestras de Locales y Maquinas tienen RPC atomicas,
  idempotentes y exclusivas de Administrador.
- El cierre logico de local devuelve maquinas al Taller y desactiva sus cuentas
  sin borrar historial.
- Reset, traslado, asignacion y baja validan caja abierta antes de mutar.
- La baja de maquina conserva un tombstone `QUITADA`; una maquina con
  recaudaciones no se elimina.
- El modo remoto continua desactivado.
