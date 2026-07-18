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
- La autorizacion literal del usuario habilita el cambio, pero no transfiere automaticamente a Central la propiedad de una experiencia de rol.
- Todo cambio no trivial de una experiencia permanente se ejecuta en el chat propietario; Central coordina, conserva contratos compartidos, integra y valida.
- Un alcance mixto se divide antes de editar. Central solo usa ejecucion directa sobre rutas de rol para correcciones triviales sin cambio de comportamiento, integracion o recuperacion urgente.

## Consecuencias

- No se trabaja en paralelo sobre el mismo checkout o archivo.
- Los chats de rol no hacen push, publicacion ni despliegue.
- `docs/coordinacion/WORKSTREAMS.json` es la fuente verificable de propiedad.
- Una implementacion estable ya integrada no se duplica para reconstruir retrospectivamente el flujo; la regla corregida rige desde la siguiente orden.

## Evidencia

- `docs/coordinacion/README.md`
- `docs/coordinacion/WORKSTREAMS.json`
- `pnpm run check:workstreams`
