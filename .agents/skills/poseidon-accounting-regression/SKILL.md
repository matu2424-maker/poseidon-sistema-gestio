---
name: poseidon-accounting-regression
description: Analiza y valida cambios de caja, contadores, cierres, diferencias, cuentas corrientes, movimientos, salarios, aportes, retiros, gastos, regalos y transferencias en Poseidon. Usar antes y despues de modificar formulas, saldos, estados, anulaciones, auditoria o asociaciones contables.
---

# Poseidon Accounting Regression

Proteger las invariantes economicas, financieras y de auditoria con casos antes y despues del cambio.

## Preparacion

1. Leer `AGENTS.md`, `docs/CONTEXTO_RAPIDO_CODEX.md` y `docs/REGLAS_CONTABLES.md`.
2. Leer el contexto y documento funcional del modulo afectado.
3. Localizar el comando de dominio, helpers de totales, tipos, persistencia y pruebas por simbolo.
4. Identificar actor, rol, funcion, local, recaudacion y entidades asociadas.

## Matriz de impacto

Para cada operacion registrar:

- saldo de efectivo y banco antes y despues;
- resultado economico antes y despues;
- asiento o movimiento creado, corregido, anulado o compensado;
- estado e historial preservado;
- actor, fecha, motivo y auditoria;
- asociaciones `balanceId`, `localId`, `staffId`, `machineId` u otras aplicables.

## Invariantes

Convertir las reglas aplicables de `docs/REGLAS_CONTABLES.md` en afirmaciones de prueba. No copiar formulas ni estados a esta skill: si la fuente canonica cambia, la matriz debe construirse con su version vigente.

Comprobar como minimo las categorias documentadas que correspondan al cambio: resultado economico, efectivo, banco, diferencias, contramovimientos, contadores, salarios, asociaciones e historial.

## Pruebas

1. Caracterizar el caso actual antes de modificar.
2. Probar caso valido, validacion rechazada, correccion, anulacion y reconstruccion/persistencia cuando apliquen.
3. Afirmar saldos y auditoria completos, no solo el valor visible en pantalla.
4. Ejecutar pruebas dirigidas durante el desarrollo y `pnpm run check` al cerrar.
5. Documentar cualquier decision contable pendiente; no inventar una regla para hacer pasar una prueba.

## Resultado

Informar formula esperada, evidencia, casos ejecutados y riesgo residual. Si la regla de producto es ambigua, detener la implementacion contable y pedir definicion.
