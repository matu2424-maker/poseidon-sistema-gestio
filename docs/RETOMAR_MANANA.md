# Poseidon - Retomar trabajo

Ultima actualizacion: 2026-07-26

## Estado inmediato

- Proyecto local React/Vite/TypeScript con React Router.
- Snapshot local esquema `5` y clave `poseidon-sistema-gestion-v2`.
- Sin Supabase conectado, Auth ni Storage remoto.
- Backend preparatorio: seis migraciones `READY`, 37 tablas, RLS, pgTAP,
  gateway RPC y matriz AppData/PostgreSQL; la capacidad sigue `VALIDATING` y
  no esta activa en React.
- Local operativo: Poseidon.
- Servidor oficial: `iniciar-poseidon.bat`.
- Evidencia y conteos vigentes: `docs/VALIDACION_LOCAL.md`.
- Estado operativo multiagente: `docs/coordinacion/PROJECT_STATUS.json`.
- Los cambios no triviales de una experiencia de rol se delegan al chat permanente propietario; Central coordina, integra y valida.
- Beta demo `0.1.0-beta.1` activa en `https://poseidon-sistema-gestio.vercel.app`; `release/test` y la etiqueta permanecen en `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`.
- Candidato `0.1.0-beta.2` validado y etiquetado solo en local; no fue enviado
  a GitHub ni Vercel.
- Vercel usa `release/test` como rama de produccion y `vercel.json` bloquea despliegues automaticos de `main`.
- GitHub Actions `#3` aprobo el candidato sobre `release/test`; Poseidon Quality `#6` aprobo los controles posteriores de `main` en `b4ff2944db74de2dedcf7fb245ebbbe18db0cc85`.
- CAL-01 esta integrada: Locales, Maquinas, Personal, Clientes y Papelera pasan
  `10/10` recorridos dirigidos.
- La validacion completa del candidato local pasa `240/240` pruebas y `30/30`
  recorridos E2E.

## Ultimo bloque tecnico

- Las 16 variables historicas de PostgreSQL/Supabase fueron eliminadas del proyecto Vercel; el inventario de variables del proyecto quedo vacio.
- La beta se reconstruyo sin cache desde el mismo commit congelado. El despliegue vigente es `PHp675DwSQ6Sy3VrC7p6SoBgkSsE`, estado `Ready` en 30 segundos.
- El dominio principal quedo asociado al commit beta `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`; las rutas directas y los tres roles fueron comprobados.
- Los despliegues anteriores permanecen como evidencia historica, pero no deben promoverse: fueron construidos antes de retirar las variables.
- El rollback seguro consiste en redesplegar una etiqueta o commit conocido con la configuracion vigente y repetir el smoke de rutas y roles.
- La beta online es publica y usa datos aislados por navegador; Chrome local sigue siendo la fuente canonica operativa.
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

1. Mantener `0.1.0-beta.2` solamente en local hasta autorizar por separado push,
   actualizacion de `release/test` y despliegue.
2. Rotar o revocar las credenciales historicas en sus proveedores cuando vuelva
   a estar disponible un acceso externo controlable; eliminarlas de Vercel y
   del equipo no las invalida en origen.
3. Mantener el modo Supabase desactivado hasta ejecutar pgTAP, Auth, RPC,
   concurrencia, importacion, conciliacion y rollback en un ambiente autorizado.
4. Implementar RPC transaccionales por caso de uso y probar importacion
   conciliada contra una base PostgreSQL descartable antes de activar el modo
   remoto.

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
