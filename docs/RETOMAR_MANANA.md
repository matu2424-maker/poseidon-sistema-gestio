# Poseidon - Retomar trabajo

Ultima actualizacion: 2026-07-24

## Estado inmediato

- Proyecto local React/Vite/TypeScript con React Router.
- Snapshot local esquema `5` y clave `poseidon-sistema-gestion-v2`.
- Sin Supabase, Auth, Storage remoto ni despliegue.
- Local operativo: Poseidon.
- Servidor oficial: `iniciar-poseidon.bat`.
- Evidencia y conteos vigentes: `docs/VALIDACION_LOCAL.md`.
- Estado operativo multiagente: `docs/coordinacion/PROJECT_STATUS.json`.
- Los cambios no triviales de una experiencia de rol se delegan al chat permanente propietario; Central coordina, integra y valida.
- Beta `0.1.0-beta.1` sincronizada con GitHub: `main`, `release/test` y la etiqueta apuntan al commit `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`; no hay despliegue.
- GitHub Actions `#3` aprobo `Check and build` y `Release E2E` sobre `release/test`; `main` tiene localmente la actualizacion de cuatro Actions compatibles con Node 24, aun sin push.

## Ultimo bloque tecnico

- Cierre periodico y control administrativo de gastos ya delegan generacion, revision y anulacion a comandos atomicos sobre el snapshot vigente.
- React recibe la funcion activa y no construye auditorias, fechas, IDs ni reversos de esos flujos.
- Playwright usa helpers y fixtures compartidos y cubre tesoreria, cierre periodico, formularios administrativos y recuperacion/importacion.
- La validacion profunda tiene un benchmark reproducible documentado en `docs/VALIDACION_LOCAL.md`.
- Chrome volvio a quedar controlable y Poseidon fue comprobado en el origen canonico.
- `AppData` se valida con esquemas Zod Mini estrictos y reglas cruzadas para las 22 colecciones.
- Carga, importacion, migracion y guardado rechazan IDs duplicados, referencias huerfanas, asociaciones local/recaudacion incoherentes y estructuras incompletas.
- El almacenamiento valido no se sobrescribe ante error; el JSON original o el intento fallido queda disponible para recuperacion con rutas concretas del problema.
- El Panel del Cajero real vive en `src/features/cashier/CashierWorkspace.tsx`; no existe una variante legacy paralela.
- Gastos y regalos se anulan mediante contramovimientos append-only con auditoria; no se borran registros operativos.
- La grilla de contadores valida todas las filas y persiste en una sola transaccion mediante `saveReadingsCommand`.
- Los componentes Cajero aplican datos puros dentro de los updaters; mensajes, resets y navegacion se ejecutan fuera.
- Los formularios rechazados preservan lo ingresado y muestran disponibilidad/contexto para corregir la causa.
- El resumen de cajas contiene su tabla internamente en movil y no genera overflow horizontal global.

## Ultimo bloque funcional

La experiencia del Cajero vigente conserva:

- Panel unico sin menu lateral, con accesos operativos condicionados por la caja abierta.
- Saldos de Caja/Efectivo y Caja/Banco visibles donde una operacion puede ser rechazada por fondos.
- Cierre bloqueado cuando hay contadores pendientes, efectivo esperado negativo o desalineacion contable.
- Operaciones del Encargado sobre la caja activa visibles en el control de cierre.
- Anulaciones visibles con estado propio y ordenamiento por las columnas de datos.

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

1. Sincronizar la actualizacion local de Actions cuando el usuario autorice el siguiente push y verificar que no queden advertencias de Node 20.
2. Solicitar autorizacion separada antes de vincular o desplegar Vercel de prueba protegido.
3. Mantener el backend Supabase, multi-local completo y datos reales fuera de esta primera beta frontend.

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
pnpm run release:check
iniciar-poseidon.bat
pnpm run smoke:localhost
pnpm run test:e2e
pnpm run check:commit
```

No hacer nuevos push, publicar ni conectar servicios externos sin autorizacion explicita.
