# Modulo 02 - Caja diaria y apertura

Comando propietario: `src/application/cash/openCash.ts`.

## Objetivo

Crear una recaudacion para el local con saldos de Caja trazables y una foto de las maquinas que deben recaudarse.

## Reglas generales

- Solo puede existir una caja abierta por local.
- Solo la funcion `CAJERO` puede abrirla.
- El usuario debe estar activo y autorizado para el local.
- Cada caja tiene ID visible: cuatro letras del local y correlativo, por ejemplo `POSE-1`.
- Registra fecha operativa, hora, usuario real, rol real y funcion usada.
- La apertura toma una foto de maquinas activas/no desuso y crea sus lecturas iniciales.
- Los importes deben ser finitos y no negativos.

## Primera caja del local

El Cajero declara:

- efectivo inicial;
- banco inicial;
- socio que realiza el aporte real: Mathias o Ricardo;
- nota inicial opcional.

Por cada medio con monto mayor a cero el comando crea dos operaciones enlazadas:

1. aporte patrimonial del socio a Principal;
2. traspaso automatico de Principal a Caja.

El socio se selecciona porque existe un aporte patrimonial real. No representa custodia.

## Cajas posteriores

- Efectivo inicial = saldo vigente de `Caja / Efectivo`.
- Banco inicial = saldo vigente de `Caja / Banco`.
- No se cargan manualmente.
- Si la interfaz envia otro monto, la apertura se rechaza atomicamente.
- El comando determina si es primera apertura desde el historial; no confia solo en una bandera de UI.

## Resumen de recaudaciones

- Muestra las ultimas 10 cajas cerradas.
- Se selecciona una caja por vez.
- El resumen es de consulta y no exporta desde esa vista.
- Las tablas permiten ordenar todas las columnas visibles de datos; Acciones queda exceptuada.
- Tras cerrar, el sistema navega a `/recaudaciones` y conserva el aviso de exito.

## Pruebas clave

- Primera apertura crea aporte de socio, traspaso y saldos correctos.
- Apertura posterior hereda Caja sin crear otro aporte de socio.
- Segunda caja abierta se rechaza sin mutar datos.
- Saldo heredado incorrecto se rechaza sin balance, lecturas ni auditoria.
