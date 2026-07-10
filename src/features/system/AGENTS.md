# Sistema local - contexto local

Antes de tocar esta carpeta, leer:

- `docs/CONTEXTO_RAPIDO_CODEX.md`
- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/MAPA_TECNICO.md`
- `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`

Reglas locales:

- La persistencia sigue siendo local hasta autorizacion expresa para conectar servicios.
- Nunca reemplazar silenciosamente un snapshot corrupto ni recortar auditoria para forzar un guardado.
- Exportar e importar debe validar version y estructura antes de reemplazar datos.
- Las acciones destructivas requieren reconfirmacion y deben dejar trazabilidad cuando exista una sesion activa.
