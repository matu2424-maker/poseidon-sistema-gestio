# Cuentas corrientes - contexto local

Antes de tocar esta carpeta, leer:

- `docs/CONTEXTO_RAPIDO_CODEX.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/modulos/05_cierre_caja.md`
- `docs/modulos/06_diferencias_caja.md`

Reglas locales:

- Las cuentas corrientes leen movimientos de caja, diferencias, transferencias, salarios, retiros/aportes y saldos por cuenta.
- No modificar formulas de saldo, debito/credito o impacto contable sin revisar `src/lib/accountMovements.ts`.
- Toda tabla operativa debe ordenar por cada columna visible de datos. Las columnas de acciones son la excepcion.
- Si se cambia un flujo o calculo, actualizar el modulo 11 y las reglas contables si corresponde.
