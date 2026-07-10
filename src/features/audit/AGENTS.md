# Auditoria - contexto local

Antes de tocar esta carpeta, leer:

- `docs/CONTEXTO_RAPIDO_CODEX.md`
- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/contextos/CODEX_AUDITORIA.md`
- `docs/modulos/12_auditoria.md`

Reglas locales:

- Auditoria es lectura transversal: depende de que cada modulo registre usuario real, rol real y funcion usada.
- No ocultar ni borrar historial operativo. Anular, resolver o ajustar siempre debe dejar trazabilidad.
- Toda tabla operativa debe ordenar por cada columna visible de datos. Las columnas de acciones son la excepcion.
- Si se agrega una accion auditable en otro modulo, revisar que aca quede visible y filtrable.
