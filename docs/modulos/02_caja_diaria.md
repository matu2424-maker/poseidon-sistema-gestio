# Modulo 02 - Caja diaria y apertura

La apertura atomica vive en `src/application/cash/openCash.ts` y coordina balance, aportes iniciales, lecturas, cuentas y auditoria.

## Objetivo

Abrir una caja diaria por local y fecha, con saldos iniciales correctos.

## Reglas de apertura

- No puede haber dos cajas abiertas para el mismo local, aunque tengan distinta fecha operativa.
- Los saldos iniciales deben ser importes finitos y no negativos.
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
- En el resumen de una caja cerrada, la tabla de maquinas permite ordenar por ID, maquina, IN, OUT, resultado y estado.
- Las mini-tablas `Salidas operativas` y `Movimientos financieros` son fichas resumen de orden semantico fijo; no son grillas operativas y no tienen ordenamiento interactivo.
- Despues de cerrar una caja, el sistema envia a Resumen de cajas.
