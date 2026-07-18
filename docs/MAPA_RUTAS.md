# Poseidon - Mapa de rutas

Ultima actualizacion: 2026-07-17

`src/navigation/screens.ts` es la implementacion tipada de este contrato.

## Reglas

- Cada pantalla tiene una URL unica.
- Una ruta no autorizada vuelve al panel con aviso.
- Una ruta de Caja sin recaudacion abierta vuelve al panel con aviso.
- Una URL directa se conserva durante la identificacion del usuario cuando el rol tiene permiso.
- Cerrar sesion vuelve a `/ingresar`.
- Rol real y funcion activa son distintos.
- Encargado y Administrador operan Caja solo al cambiar expresamente a funcion Cajero.

## Publicas

| Pantalla | URL |
| --- | --- |
| Inicio | `/` |
| Ingreso local | `/ingresar` |

## Comun

| Pantalla | URL | Roles |
| --- | --- | --- |
| Panel por funcion | `/panel` | Cajero, Encargado, Administrador |
| Resumen de recaudaciones | `/recaudaciones` | Cajero, Encargado, Administrador |

## Caja diaria

| Pantalla | URL | Caja abierta |
| --- | --- | --- |
| Caja diaria / apertura | `/caja/abrir` | No |
| Contadores | `/caja/contadores` | Si |
| Gastos de Caja | `/caja/gastos` | Si |
| Transferencias | `/caja/transferencias` | Si |
| Regalos | `/caja/regalos` | Si |
| Salarios desde Caja | `/caja/salarios` | Si |
| Caja y Principal | `/caja/fondos` | Si |
| Clientes | `/caja/clientes` | No |
| Cierre | `/caja/cerrar` | Si |

Estas rutas operativas exigen funcion `CAJERO`.

## Control y tesoreria

| Pantalla | URL | Roles |
| --- | --- | --- |
| Diferencias | `/diferencias` | Encargado, Administrador |
| Control de gastos desde Principal | `/control/gastos` | Encargado, Administrador |
| Auditoria | `/auditoria` | Encargado, Administrador |
| Cuentas corrientes y tesoreria | `/cuentas-corrientes` | Encargado, Administrador |
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

## Validacion

- Unicidad y conversion `Screen` <-> URL.
- Ruta directa y recarga por rol.
- Rechazo por rol.
- Rechazo de ruta operativa sin caja.
- Navegacion Atras/Adelante.
- Cierre navega a `/recaudaciones` y conserva el aviso.
- Encargado no entra a `/caja/gastos` o `/caja/fondos` sin cambiar a Cajero.
