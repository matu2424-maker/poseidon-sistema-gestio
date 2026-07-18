# DEC-2026-005 - Chrome como fuente canonica de datos durante la etapa local

- Estado: `APPROVED`
- Fecha: 2026-07-18
- Alcance: validacion manual, persistencia local y separacion de datos automatizados

## Contexto

Poseidon persiste el snapshot operativo en `localStorage`. Chrome, el navegador integrado, perfiles privados y distintos origenes conservan almacenamientos independientes, aunque consuman el mismo servidor. Esta separacion produjo resultados distintos entre la validacion de Codex y la vista del usuario.

El proyecto preve migrar directamente a una base central antes de publicar. Agregar un backend local transitorio fue descartado para evitar complejidad y una segunda migracion.

## Decision

- El perfil habitual de Chrome del usuario en `http://127.0.0.1:5173/` es la unica fuente operativa de datos durante la etapa local.
- Central, chats de rol y validaciones manuales usan el control de Chrome cuando la evidencia depende de datos persistidos.
- No se usa el navegador integrado para crear, editar, importar o validar datos operativos.
- Si Chrome no esta disponible, se informa la limitacion y no se cambia silenciosamente de navegador.
- Playwright y otros controles automatizados mantienen perfiles aislados con datasets descartables. Validan comportamiento, no el estado operativo de Chrome.

## Consecuencias

- `localhost:5173`, incognito, otro perfil u otro navegador no se consideran equivalentes al origen canonico.
- El smoke HTTP puede demostrar disponibilidad, pero no sustituye una validacion manual dependiente de datos.
- Antes de importar, reiniciar o reemplazar datos de Chrome se exige respaldo y confirmacion.
- Esta decision es temporal: queda reemplazada cuando Poseidon use una base central compartida.

## Evidencia

- `AGENTS.md`
- `docs/REGLAS_GENERALES.md`
- `docs/VALIDACION_LOCAL.md`
- `.agents/skills/poseidon-localhost-diagnostics/SKILL.md`
- `pnpm run check:governance`
- `pnpm run check:skills`
