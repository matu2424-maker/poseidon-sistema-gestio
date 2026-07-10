# Modulo 02 - Caja diaria y apertura

## Objetivo

Abrir una caja diaria por local y fecha, con saldos iniciales correctos.

## Reglas de apertura

- No puede haber dos cajas abiertas para el mismo local y fecha.
- Al abrir caja se toma una foto de maquinas activas del local.
- Cada caja tiene ID visible: primeras cuatro letras del local + correlativo. Ejemplo: `POSE-1`.
- Cada caja registra usuario real y funcion usada al abrir.

## Primera caja del local

El cajero debe declarar:

- aporte inicial en efectivo;
- aporte inicial en banco;
- responsable del aporte: RICARDO o MATHIAS.

Esos aportes crean movimientos de cuenta corriente del local.

## Cajas posteriores

- Efectivo inicial = saldo de cuenta Local / Efectivo.
- Banco inicial = saldo de cuenta Local / Banco.
- El cajero no carga esos saldos manualmente.

## Resumen de cajas

- Muestra ultimas 10 cajas cerradas.
- La tabla de ultimas cajas cerradas permite ordenar por ID, fecha, horario, resultado final, declarado, diferencia efectivo, diferencia banco, estado de diferencia y maquinas.
- Se ve una caja por vez.
- Permite ver resumen en pantalla, sin exportar desde esa vista.
- Despues de cerrar una caja, el sistema envia a Resumen de cajas.
