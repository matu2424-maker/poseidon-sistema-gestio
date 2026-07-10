# Acceso y roles - contexto local

Antes de tocar esta carpeta, leer:

- `docs/CONTEXTO_RAPIDO_CODEX.md`
- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/contextos/CODEX_LAYOUT_BASE.md`
- `docs/modulos/00_base_sistema.md`
- `docs/modulos/01_panel_cajero.md`

Reglas locales:

- El sistema esta en modo prueba local: login rapido por seleccion de usuario, sin Supabase/Auth real.
- No reactivar autenticacion externa ni guardar secretos sin pedido explicito.
- El rol efectivo puede cambiar a funcion Cajero para operar caja, pero auditoria debe conservar quien lo hizo.
- Cualquier cambio de acceso debe actualizar docs funcionales y auditoria si impacta usuario/rol/funcion.
