# Reportes y cierres periodicos - contexto local

Antes de tocar esta carpeta, leer:

- `docs/CONTEXTO_RAPIDO_CODEX.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/05_cierre_caja.md`
- `docs/modulos/06_diferencias_caja.md`
- `docs/modulos/07_panel_encargado.md`
- `docs/modulos/08_panel_administrador.md`
- `docs/modulos/12_auditoria.md`

Reglas locales:

- Reportes consolidan cajas, movimientos de Principal, traspasos Caja/Principal, socios, diferencias, salidas, maquinas y auditoria.
- No recalcular con formulas duplicadas si existe helper compartido en `src/lib`.
- Exportaciones deben coincidir con lo visible y auditado.
- Toda tabla operativa debe ordenar por cada columna visible de datos. Las columnas de acciones son la excepcion.
