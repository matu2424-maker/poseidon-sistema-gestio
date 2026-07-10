# Administracion - contexto local

Antes de tocar esta carpeta, leer:

- `docs/CONTEXTO_RAPIDO_CODEX.md`
- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/contextos/CODEX_ADMINISTRACION.md`
- `docs/contextos/CODEX_LOCALES_MAQUINAS.md`
- `docs/contextos/CODEX_CLIENTES_PERSONAL.md`
- `docs/contextos/CODEX_SALARIOS.md`
- `docs/modulos/08_panel_administrador.md`
- `docs/modulos/09_locales_maquinas_taller.md`
- `docs/modulos/10_clientes_personal_sueldos.md`
- `docs/modulos/12_auditoria.md`

Reglas locales:

- Locales, maquinas, personal, clientes y configuracion cruzan caja, salarios, auditoria, cuentas y reportes.
- Las maquinas eliminables primero deben pasar por taller; maquinas con recaudaciones no se eliminan definitivamente.
- Los cambios sensibles deben quedar auditados con fecha/hora, usuario, accion y entidad.
- Toda tabla operativa debe ordenar por cada columna visible de datos. Las columnas de acciones son la excepcion.
