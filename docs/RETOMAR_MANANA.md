# Poseidon - Retomar trabajo

Ultima actualizacion: 2026-07-18

## Estado inmediato

- Proyecto local React/Vite/TypeScript con React Router.
- Snapshot local esquema `5` y clave `poseidon-sistema-gestion-v2`.
- Sin Supabase, Auth, Storage remoto ni despliegue.
- Local operativo: Poseidon.
- Servidor oficial: `iniciar-poseidon.bat`.
- Validacion vigente: 183 pruebas en 35 archivos y 12 casos E2E en 7 archivos.
- Estado operativo multiagente: `docs/coordinacion/PROJECT_STATUS.json`.

## Ultimo bloque tecnico

Se incorporaron dos herramientas controladas de la etapa local:

- `Sistema > Datos locales` crea una base operativa limpia solo para Administrador, descarga respaldo previo, conserva maestros y deja cuentas/contadores en cero con auditoria nueva.
- `Poseidon Calidad y Pruebas` es un workstream permanente de apoyo con contexto, plantilla, alcances y worktree aislado.
- Calidad prueba commits exactos y eleva fallos, riesgos o sugerencias; Central contrasta la evidencia y consulta al usuario antes de asignar cambios.
- No se creo un cuarto rol funcional ni un perfil generico de QA.
- El gobierno SOPM-Lite registra la decision `DEC-2026-004` y valida cuatro decisiones, dos migraciones y trece capacidades.

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
