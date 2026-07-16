# Poseidon - Coordinacion de chats de desarrollo

Ultima actualizacion: 2026-07-16

Fuente canonica para coordinar chats permanentes de Poseidon. No reemplaza `AGENTS.md`, las reglas funcionales ni el protocolo de subagentes.

## Topologia

- `Poseidon Central`: conserva decisiones, contratos compartidos, integracion, validacion y `main`.
- `Poseidon Cajero`: experiencia operativa del cajero.
- `Poseidon Encargado`: experiencia de supervision del local.
- `Poseidon Administrador`: experiencia de administracion y maestros.
- Especialistas temporales: nucleo financiero, salarios/personal, locales/maquinas y revision visual.

Los chats de rol son permanentes. Los especialistas se crean o delegan solo para una tarea acotada. No todos deben estar activos al mismo tiempo.

## Regla de sincronizacion

Los chats no deben asumir que comparten el historial de conversacion ni el estado mental. Las fuentes de verdad son:

1. codigo y documentacion versionados;
2. una orden de trabajo con alcance y propietario;
3. una rama y worktree aislados;
4. un commit local estable;
5. una entrega estructurada al chat central.

Un mensaje entre chats ayuda a coordinar, pero no reemplaza estos artefactos.

## Flujo

1. Central recibe o consolida el pedido.
2. Clasifica rol propietario y dependencias de dominio.
3. Registra una orden usando `docs/plantillas/ORDEN_TRABAJO_CHAT.md`.
4. Asigna archivos de escritura exclusivos y referencias de solo lectura.
5. El chat de rol trabaja en su worktree y no amplía alcance por inferencia.
6. Si necesita un contrato compartido, se detiene en ese punto y solicita al chat central una dependencia concreta.
7. El chat propietario valida y entrega con `docs/plantillas/ENTREGA_CHAT_MODULO.md`.
8. Central revisa el diff, integra un commit por vez, resuelve contradicciones y ejecuta la validacion transversal.
9. Central actualiza `docs/coordinacion/COLA_INTEGRACION.md` y cierra el punto de control local.

## Git y worktrees

- `main` solo se integra desde el chat central.
- Cada chat de rol usa un worktree y una rama propios.
- Un chat de rol puede crear commits locales en su rama despues de `pnpm run check:commit`.
- No puede hacer merge a `main`, push, publicacion ni despliegue.
- No se usan dos chats de escritura sobre el mismo archivo o contrato al mismo tiempo.
- El chat central puede revocar o reasignar propiedad antes de una nueva orden de trabajo.

## Contratos compartidos

Consultar `docs/coordinacion/CONTRATOS_COMPARTIDOS.md`. La configuracion verificable de propietarios vive en `docs/coordinacion/WORKSTREAMS.json` y se valida con `pnpm run check:workstreams`.

## Chats y subagentes

- Chat de rol: mantiene contexto funcional durante varias sesiones y trabaja en una rama aislada.
- Subagente: tarea temporal y acotada regida por `docs/PROTOCOLO_AGENTES_CODEX.md`.
- Perfil personalizado: especialidad reutilizable de solo lectura en `.codex/agents/`.
- Skill: procedimiento repetible en `.agents/skills/`.

Un chat de rol puede usar subagentes si el protocolo lo justifica. El chat central sigue siendo el unico que integra en `main`.

## Fuentes relacionadas

- `docs/coordinacion/WORKSTREAMS.json`
- `docs/coordinacion/CONTRATOS_COMPARTIDOS.md`
- `docs/coordinacion/COLA_INTEGRACION.md`
- `docs/coordinacion/DECISIONES.md`
- `docs/plantillas/ORDEN_TRABAJO_CHAT.md`
- `docs/plantillas/ENTREGA_CHAT_MODULO.md`
- `docs/prompts/CHAT_CENTRAL_POSEIDON.md`
- `docs/prompts/CHAT_CAJERO_POSEIDON.md`
- `docs/prompts/CHAT_ENCARGADO_POSEIDON.md`
- `docs/prompts/CHAT_ADMINISTRADOR_POSEIDON.md`
