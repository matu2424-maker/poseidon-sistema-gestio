# Poseidon - Retomar trabajo

Ultima actualizacion: 2026-07-18

## Estado inmediato

- Proyecto local React/Vite/TypeScript con React Router.
- Snapshot local esquema `5` y clave `poseidon-sistema-gestion-v2`.
- Sin Supabase, Auth, Storage remoto ni despliegue.
- Local operativo: Poseidon.
- Servidor oficial: `iniciar-poseidon.bat`.
- Validacion vigente: 180 pruebas en 34 archivos y 11 casos E2E en 6 archivos.
- Estado operativo multiagente: `docs/coordinacion/PROJECT_STATUS.json`.

## Ultimo bloque tecnico

Se adopto un gobierno operativo SOPM-Lite integrado con la coordinacion existente:

- Estado, riesgos y proximas acciones en `PROJECT_STATUS.json`.
- Decisiones transversales en `DECISIONS.json` y documentos individuales.
- Migraciones/reparaciones financieras en `MIGRATIONS.json`.
- Agentes, skills y validadores en `CAPABILITIES.json`.
- Ordenes y entregas ampliadas con prioridad, commit base, alcance, criterios, evidencia y estado Git.
- `pnpm run check:governance` valida registros, referencias, rutas, commits y scripts.
- `check:workstreams` incluye el gobierno; `check:commit` lo selecciona para cambios de coordinacion.

No se copiaron prompts universales, documentos Word ni carpetas vacias del kit SOPM. No se reemplazo `AGENTS.md` ni se creo una segunda estructura paralela.

## Ultimo bloque funcional

El modelo financiero vigente conserva:

- Caja/Efectivo y Caja/Banco.
- Principal/Efectivo y Principal/Banco.
- Cuentas patrimoniales de Mathias y Ricardo.
- Traspasos Caja <-> Principal sin resultado economico.
- Aportes/retiros reales de socios sin concepto de custodia.
- Primera apertura Socio -> Principal -> Caja.
- Cierre con transferencia Caja -> Principal y remanente declarado en Caja.
- Gastos y salarios administrativos desde Principal, sin `balanceId`.
- Migracion 4 -> 5 append-only y auditada.

## Reglas que no deben revertirse

- Resultado economico = maquinas - gastos - salarios - regalos.
- No existe custodia.
- Un traspaso interno no selecciona socio.
- Una salida nueva no deja Caja o Principal negativas.
- Diferencias no cambian resultado economico.
- Historial y asientos se preservan con contramovimientos.
- Encargado/Admin operan Principal; para Caja cambian a Cajero.
- Central es el unico integrador en `main`.
- Las ordenes formales se usan para trabajo delegado o paralelo, no como burocracia para cambios locales simples autorizados.

## Proximas prioridades

1. Completar validacion runtime profunda del snapshot.
2. Extraer mutaciones sensibles restantes de handlers React.
3. Ampliar E2E de tesoreria, cierre periodico y formularios administrativos.
4. Mantener multi-local completo y migracion online postergados hasta autorizacion.

## Ruta de inicio

1. Leer `AGENTS.md` y `docs/CONTEXTO_RAPIDO_CODEX.md`.
2. Consultar `docs/coordinacion/PROJECT_STATUS.json` si la tarea involucra varios chats, migraciones o capacidades.
3. Seguir `docs/INDICE_DOCUMENTACION.md` para cargar solo el modulo afectado.

## Comandos

```text
git status --short
git log -1 --oneline
pnpm run check:governance
pnpm run check
pnpm run build
iniciar-poseidon.bat
pnpm run smoke:localhost
pnpm run test:e2e
pnpm run check:commit
```

No publicar ni conectar servicios externos.
