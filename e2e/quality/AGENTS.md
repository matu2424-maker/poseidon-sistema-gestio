# Calidad E2E - contexto local

Antes de tocar esta carpeta, leer:

- `AGENTS.md`
- `docs/contextos/CODEX_CALIDAD_PRUEBAS.md`
- `docs/VALIDACION_LOCAL.md`
- la orden de trabajo vigente
- el contexto y modulo de la funcion bajo prueba

Reglas locales:

- Solo agregar o modificar pruebas con alcance de escritura expresamente asignado.
- Probar contratos publicos y comportamiento visible; no duplicar formulas internas en la prueba.
- Usar datos y perfiles aislados. No depender del `localStorage` personal del usuario.
- No modificar codigo de aplicacion ni reglas canonicas para hacer pasar una prueba.
- Conservar trazas y capturas solo ante fallos, salvo evidencia visual solicitada.
