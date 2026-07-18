# DEC-2026-003 - Adopcion de gobierno operativo SOPM-Lite

- Estado: `APPROVED`
- Fecha: 2026-07-18
- Alcance: coordinacion, evidencia, migraciones y capacidades

## Contexto

El kit SOPM 2026 aporta buenas reglas para trabajo multiagente, pero copiar sus prompts extensos y su estructura completa duplicaria la infraestructura que Poseidon ya valida.

## Decision

- Se adopta una variante SOPM-Lite dentro de `docs/coordinacion/`.
- No se reemplaza `AGENTS.md`, no se cargan prompts universales y no se crea una segunda carpeta de gobernanza.
- Estado, decisiones, migraciones y capacidades usan JSON para validacion nativa sin dependencias nuevas.
- Las ordenes delegadas registran prioridad, base, alcance, dependencias, aceptacion y condiciones de detencion.
- El flujo normal conserva `PROPUESTA`, `ASIGNADA`, `EN_CURSO`, `LISTA` e `INTEGRADA`; `BLOQUEADA` y `DESCARTADA` son auxiliares.
- Solo las decisiones transversales materiales requieren documento individual.
- Una orden literal del usuario a Central sigue autorizando el trabajo segun `AGENTS.md`; no se exige una orden formal para cada cambio local simple.

## Consecuencias

- `check:workstreams` y `check:commit` deben validar los registros.
- Los archivos de estado se actualizan al asignar, integrar o cambiar un riesgo material.
- Git sigue siendo la evidencia del commit exacto que contiene cada snapshot.

## Evidencia

- `docs/coordinacion/PROJECT_STATUS.json`
- `docs/coordinacion/DECISIONS.json`
- `docs/coordinacion/MIGRATIONS.json`
- `docs/coordinacion/CAPABILITIES.json`
- `scripts/validate-governance.mjs`
