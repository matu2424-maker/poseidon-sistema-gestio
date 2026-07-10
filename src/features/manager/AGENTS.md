# Encargado - contexto local

Antes de tocar esta carpeta, leer:

- `docs/CONTEXTO_RAPIDO_CODEX.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/contextos/CODEX_ENCARGADO.md`
- `docs/contextos/CODEX_DIFERENCIAS.md`
- `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`
- `docs/modulos/06_diferencias_caja.md`
- `docs/modulos/07_panel_encargado.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/modulos/12_auditoria.md`

Reglas locales:

- Encargado supervisa el local asignado y puede trabajar como Cajero solo desde el cambio de funcion.
- Diferencias deben mostrar historial completo y permitir gestionar, corregir, anular o confirmar con auditoria.
- Gestionar diferencias puede impactar cuentas; revisar `src/lib/differences.ts` y `src/lib/accountMovements.ts`.
- Toda tabla operativa debe ordenar por cada columna visible de datos. Las columnas de acciones son la excepcion.
