# DEC-2026-004 - Workstream permanente de Calidad y Pruebas

- Estado: `APPROVED`
- Fecha: 2026-07-18
- Alcance: validacion independiente, sugerencias, propiedad de pruebas e integracion

## Contexto

Poseidon necesita una revision continua que conozca el funcionamiento completo, pruebe commits exactos y encuentre riesgos o mejoras sin mezclar esa tarea con la implementacion ni permitir que un agente cambie el producto por iniciativa propia.

## Decision

- Se crea `Poseidon Calidad y Pruebas` como workstream permanente de apoyo con rama y worktree aislados.
- No es un cuarto rol de la aplicacion, un perfil TOML ni un sustituto de Poseidon Central.
- Su modo normal es de validacion y lectura; solo escribe pruebas o informes dentro de los alcances asignados por una orden.
- Clasifica resultados como fallo confirmado, riesgo, sugerencia, duda de producto o sin hallazgos.
- Central reproduce o contrasta cada recomendacion, revisa asociaciones y presenta al usuario las opciones antes de asignar una implementacion.
- Una sugerencia no modifica por si sola codigo, reglas, prioridades ni alcance.

## Consecuencias

- Calidad puede agregar E2E en `e2e/quality/` y reportes en `docs/calidad/` cuando exista autorizacion.
- Los tests unitarios junto al dominio siguen perteneciendo al propietario del contrato, salvo asignacion temporal de Central.
- Calidad no integra `main`, no hace push, no publica y no edita contratos compartidos.
- No se crea por ahora un agente permanente generico de QA; el workstream usa perfiles y skills existentes.

## Evidencia

- `docs/coordinacion/WORKSTREAMS.json`
- `docs/prompts/CHAT_CALIDAD_POSEIDON.md`
- `docs/contextos/CODEX_CALIDAD_PRUEBAS.md`
- `docs/plantillas/REPORTE_CALIDAD.md`
- `pnpm run check:workstreams`
