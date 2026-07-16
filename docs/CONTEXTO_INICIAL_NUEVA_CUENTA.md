# Poseidon - Contexto inicial para nueva cuenta de ChatGPT

Copia este documento como primer mensaje para el nuevo agente si se migra el proyecto a otra cuenta.

## Instruccion inicial para el nuevo agente

Estas trabajando en Poseidon Sistema de Gestion, una app React + Vite + TypeScript ubicada en:

```text
C:\Users\Mathias\OneDrive\Documentos\New project codex
```

Antes de modificar cualquier archivo, lee:

1. `AGENTS.md`
2. `docs/INDICE_DOCUMENTACION.md`
3. `docs/HANDOFF_TECNICO_POSEIDON.md`
4. `docs/CONTEXTO_RAPIDO_CODEX.md`
5. El `AGENTS.md`, contexto corto y modulo de la feature que corresponda.

No leas toda la documentacion por defecto. El indice indica cuando agregar reglas contables, visuales, mapa tecnico o documentos funcionales largos.

No publiques, no despliegues y no actives Supabase/Auth/Storage real sin autorizacion explicita.

Haz commits locales cuando un bloque quede estable y validado. No hagas push, publicacion ni despliegue sin confirmacion explicita.

## Reglas intocables

- Resultado economico = resultado maquinas - gastos - salarios - regalos.
- Transferencias, aportes, retiros, efectivo inicial y banco inicial no cambian resultado economico.
- Diferencias de efectivo/banco no cambian resultado economico, pero si mueven cuentas del local para que la siguiente caja abra con saldo real declarado.
- No borrar historial operativo: usar anulacion, papelera, estado o ajuste auditado.
- Toda tabla nueva o modificada debe ordenar por cada columna visible de datos, salvo columnas de accion.
- Cada cambio de codigo debe actualizar documentacion relacionada.
- Para delegar, seguir `docs/PROTOCOLO_AGENTES_CODEX.md`, registrar resultados y mantener integracion/Git en el agente principal.
- Validar con `pnpm run check`, `pnpm run build` y verificar `http://127.0.0.1:5173/`.

## Comandos

Levantar servidor:

```text
iniciar-poseidon.bat
```

Liberar puerto:

```text
detener-poseidon.bat
```

Build:

```bash
pnpm run check:agents
pnpm run check:workstreams
pnpm run check:skills
pnpm run check:design
pnpm run check
pnpm run build
pnpm run check:commit
```

## Estado resumido

- Persistencia actual: `localStorage`, clave `poseidon-sistema-gestion-v2`.
- Guardado local con deteccion de conflicto entre pestañas y respaldo del intento fallido.
- Login local sin contrasena.
- Usuarios demo: `cajero1`, `cajero2`, `encargado`, `admin`.
- Local principal: Poseidon.
- Multi-local operativo: postergado; el foco actual es solamente Poseidon.
- Supabase/Auth/Storage real: pendiente.
- Archivos subidos: se guardan como metadatos, no contenido completo.
- `src/App.tsx`: orquestador de estado y acciones.
- `src/data/appData.ts`: datos demo.
- `src/data/normalizeData.ts`: normalizacion y migracion.
- Pantallas principales viven en `src/features/`.
- Reglas compartidas viven en `src/lib/`.
- React Router conserva una URL por modulo; la sesion local de pestaña guarda solo usuario y funcion activa.
- Pruebas actuales: 146 casos en 28 archivos, mas 9 casos E2E en 5 archivos.
- Tres perfiles Codex read-only viven en `.codex/agents/`; `check:agents` valida su contrato.
- Los chats permanentes por rol y su propiedad viven en `docs/coordinacion/`; `check:workstreams` valida el contrato.
- Cuatro skills versionadas viven en `.agents/skills/`; `check:skills` valida sus contratos.

## Tarea recomendada al retomar

1. Ejecutar `git status --short`.
2. Revisar si hay cambios pendientes sin commit.
3. Ejecutar `pnpm run check` y `pnpm run build`.
4. Verificar localhost.
5. Continuar solo con el modulo que el usuario pida.
