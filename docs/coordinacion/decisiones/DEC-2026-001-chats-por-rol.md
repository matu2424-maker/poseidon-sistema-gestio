# DEC-2026-001 - Coordinacion mediante Central y chats por rol

- Estado: `APPROVED`
- Fecha: 2026-07-16
- Alcance: coordinacion, propiedad de rutas e integracion Git

## Contexto

Poseidon necesita conservar contexto funcional por rol sin permitir ediciones concurrentes sobre contratos compartidos ni asumir memoria comun entre chats.

## Decision

- Poseidon Central es el unico integrador en `main`.
- Cajero, Encargado y Administrador son chats permanentes con rama y worktree aislados.
- Cada chat es propietario de su experiencia, no de todos los dominios que consume.
- Los contratos compartidos reciben un propietario temporal unico asignado por Central.
- Las entregas se sincronizan mediante orden, commit exacto, pruebas y entrega estructurada.

## Consecuencias

- No se trabaja en paralelo sobre el mismo checkout o archivo.
- Los chats de rol no hacen push, publicacion ni despliegue.
- `docs/coordinacion/WORKSTREAMS.json` es la fuente verificable de propiedad.

## Evidencia

- `docs/coordinacion/README.md`
- `docs/coordinacion/WORKSTREAMS.json`
- `pnpm run check:workstreams`
