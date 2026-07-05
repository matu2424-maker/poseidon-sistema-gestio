# Modulo 09 - Locales, maquinas y taller

## Locales

- ID numerico corto.
- Estados: ACTIVO, INACTIVO, CERRADO.
- Tabla principal con buscador, ordenamiento y selector de columnas.
- Columnas fijas: ID, Local, Estado, Maquinas, Recaudaciones, Acciones.
- Clic en nombre abre historial.
- Clic en cantidad de maquinas abre ventana con maquinas asociadas.
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

## Taller

- Contiene maquinas disponibles.
- Contiene apartado de maquinas en desuso.
- Desde Taller se asignan maquinas a locales.

## Eliminacion de maquinas

- Primero debe estar en Taller.
- No puede eliminarse si tiene recaudaciones.
- Si no tiene recaudaciones, puede eliminarse con confirmacion y auditoria.

## Reset de contadores

- Solo desde administrador.
- No puede hacerse si hay caja abierta para el local.
- Pone IN y OUT en 0.
- Queda en auditoria e historial de maquina.

