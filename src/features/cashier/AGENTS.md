# Cajero - contexto local

Antes de tocar esta carpeta, leer:

- `docs/CONTEXTO_RAPIDO_CODEX.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/contextos/CODEX_CAJERO.md`
- `docs/contextos/CODEX_NUCLEO_CAJA.md`
- `docs/coordinacion/README.md`
- `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`
- `docs/contextos/CODEX_DIFERENCIAS.md`
- `docs/modulos/01_panel_cajero.md`
- `docs/modulos/02_caja_diaria.md`
- `docs/modulos/03_contadores.md`
- `docs/modulos/04_movimientos_operativos.md`
- `docs/modulos/05_cierre_caja.md`

Reglas locales:

- Caja abierta, contadores, movimientos, saldos, diferencias y resumen de caja estan fuertemente asociados.
- Resultado economico no se mezcla con diferencias de control salvo decision explicita documentada.
- Las diferencias de efectivo/banco quedan auditadas y gestionables por encargado/admin.
- Toda tabla operativa debe ordenar por cada columna visible de datos. Las columnas de acciones son la excepcion.
- Si se cambia cierre, apertura o movimientos, revisar `src/lib/cashTotals.ts`, `src/lib/accountMovements.ts` y docs contables.
