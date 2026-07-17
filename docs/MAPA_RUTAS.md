# Poseidon - Mapa de rutas

Ultima actualizacion: 2026-07-17

Fuente canonica de URLs de la aplicacion. `src/navigation/screens.ts` conserva la implementacion tipada de ruta, titulo, roles permitidos y requisito de caja abierta de cada pantalla.

## Reglas

- Cada `Screen` tiene una ruta unica y estable.
- Las rutas usan minusculas, palabras en espanol sin tildes y guiones cuando son necesarios.
- `screenDefinitions` sigue siendo la matriz central de navegacion y permisos.
- Una URL no autorizada redirige al panel y muestra un aviso.
- Una URL operativa sin caja abierta redirige al panel y muestra el aviso de apertura requerida.
- Actualizar o abrir una URL directa conserva el modulo solicitado despues de seleccionar un usuario autorizado.
- Cerrar sesion vuelve a `/ingresar`.
- Una ruta desconocida vuelve a `/`.
- El rol real y la funcion activa siguen siendo distintos. Encargado puede entrar como `ENCARGADO` solo a gastos y retiros/aportes de una caja abierta asignada; el resto de rutas operativas exige funcion Cajero.

## Rutas publicas

| Pantalla | URL |
| --- | --- |
| Inicio | `/` |
| Ingreso local | `/ingresar` |

## Ruta comun por rol

| Pantalla | URL | Roles |
| --- | --- | --- |
| Panel | `/panel` | Cajero, Encargado, Administrador |

El contenido de `/panel` depende de la funcion activa.

## Caja diaria

| Pantalla | URL | Requiere caja abierta |
| --- | --- | --- |
| Abrir caja / caja diaria | `/caja/abrir` | No |
| Contadores | `/caja/contadores` | Si |
| Gastos | `/caja/gastos` | Si |
| Transferencias | `/caja/transferencias` | Si |
| Regalos | `/caja/regalos` | Si |
| Salarios | `/caja/salarios` | Si |
| Retiros y aportes | `/caja/capital` | Si |
| Clientes desde caja | `/caja/clientes` | No |
| Cerrar caja | `/caja/cerrar` | Si |
| Resumen de recaudaciones | `/recaudaciones` | No |

`/caja/gastos` y `/caja/capital` admiten Cajero o Encargado y exigen caja abierta. Las demas rutas operativas admiten solo funcion `CAJERO`. `/recaudaciones` tambien admite Encargado y Administrador como consulta.

## Control, cierres y reportes

| Pantalla | URL | Roles |
| --- | --- | --- |
| Diferencias de caja | `/diferencias` | Encargado, Administrador |
| Control de gastos | `/control/gastos` | Encargado, Administrador |
| Auditoria | `/auditoria` | Encargado, Administrador |
| Cuentas corrientes | `/cuentas-corrientes` | Encargado, Administrador |
| Reportes | `/reportes` | Encargado, Administrador |
| Cierres periodicos | `/cierres-periodicos` | Encargado, Administrador |

## Personas

| Pantalla | URL | Roles |
| --- | --- | --- |
| Personal | `/personal` | Encargado, Administrador |
| Liquidacion de salarios | `/liquidacion-salarios` | Encargado, Administrador |
| Clientes | `/clientes` | Encargado, Administrador |
| Usuarios | `/administracion/usuarios` | Administrador |

## Gestion y sistema

| Pantalla | URL | Roles |
| --- | --- | --- |
| Locales | `/locales` | Administrador |
| Maquinas | `/maquinas` | Administrador |
| Taller | `/taller` | Administrador |
| Categorias de gastos | `/administracion/categorias-gastos` | Administrador |
| Datos locales | `/administracion/datos-locales` | Administrador |
| Papelera | `/administracion/papelera` | Administrador |

## Validacion obligatoria

- Prueba unitaria de unicidad y conversion `Screen` <-> URL.
- URL directa y recarga en una pantalla autorizada por rol.
- URL rechazada por rol.
- URL de caja rechazada sin caja abierta.
- Navegacion Atrás/Adelante entre panel y modulo.
- Cierre de caja navega a `/recaudaciones` y conserva el aviso.

## Evidencia vigente

- Conversión `Screen` <-> URL y unicidad cubiertas por Vitest.
- Ruta directa antes del login retoma el modulo autorizado.
- Cajero bloqueado al abrir contadores sin caja.
- Encargado validado con recarga, Atrás/Adelante y rechazo de Locales.
- Administrador validado en Locales con recarga y cambio persistente a funcion Cajero.
- Cierre completo de caja validado con destino `/recaudaciones` y aviso preservado.
