# Poseidon - Contexto rapido para Codex

Ultima actualizacion: 2026-07-24

Usar `docs/INDICE_DOCUMENTACION.md` para elegir la fuente canonica de una tarea. No releer todo el repositorio por defecto.

## Estado tecnico

- React 19, React Router 8, Vite 6 y TypeScript.
- Persistencia local mediante `AppDataRepository` y `localStorage`.
- Clave compatible: `poseidon-sistema-gestion-v2`.
- Chrome, en el perfil habitual del usuario y `http://127.0.0.1:5173/`, es la unica fuente canonica de datos para validaciones manuales; no sustituirlo silenciosamente por el navegador integrado.
- Playwright conserva datos aislados y descartables; valida comportamiento, no el estado operativo de Chrome.
- Snapshot actual: esquema `5`.
- Los snapshots de esquema actual se validan de forma estricta antes de cargar, importar o guardar; los heredados migran primero y luego deben cumplir las mismas relaciones.
- Login local por seleccion de usuario; sesion de pestana en `sessionStorage`.
- Local operativo actual: Poseidon. Multi-local completo queda postergado.
- Sin Auth, base remota, storage real ni despliegue.
- Preparacion local de entrega: candidato `0.1.0-beta.1`, runtime fijado, preflight de release, CI versionado y rama `release/test` prevista. Nada fue enviado ni desplegado.
- Adjuntos: solo metadatos.
- `src/App.tsx` orquesta; `src/navigation/screens.ts` define rutas, titulos, roles y requisito de caja.
- Normalizacion en `src/data/normalizeData.ts`; migraciones en `src/data/migrateData.ts`.
- Evidencia y conteos vigentes: `docs/VALIDACION_LOCAL.md`; no duplicarlos en contextos cortos.
- Panel del Encargado: resumen puro, control financiero compacto, resultado mensual, recaudacion activa, accesos unicos y actividad reciente ordenable.
- Cierre periodico y revision/anulacion de gastos del Encargado consumen comandos atomicos; React no construye sus auditorias ni reversos.
- Gobierno SOPM-Lite: estado, decisiones, migraciones y capacidades en `docs/coordinacion/`, validados sin dependencias externas.
- Workstreams permanentes: Central, Cajero, Encargado, Administrador y Calidad/Pruebas; este ultimo valida y asesora, pero no decide ni integra.
- Regla de propiedad: todo cambio no trivial de una experiencia de rol se ejecuta en su chat permanente; la autorizacion del usuario no reasigna esa propiedad a Central.

## Modelo financiero

Solo UYU:

- `Caja / Efectivo`.
- `Caja / Banco`.
- `Principal / Efectivo`.
- `Principal / Banco`.
- Cuenta patrimonial de Mathias.
- Cuenta patrimonial de Ricardo.

Reglas clave:

- Resultado economico = maquinas - gastos - salarios - regalos.
- Caja <-> Principal es un traspaso interno, mismo medio, sin resultado economico.
- Aporte/retiro de socio es una operacion patrimonial real entre Principal y el socio.
- No existe custodia ni selector de persona para traspasos internos.
- Cajero opera Caja; Encargado/Administrador operan Principal desde su funcion administrativa.
- Para operar una recaudacion, Encargado/Administrador cambian expresamente a Cajero.
- Gastos y salarios administrativos usan Principal y no tienen `balanceId`.
- Movimientos de Caja durante una recaudacion usan el `balanceId` activo.
- Ninguna salida nueva puede dejar una cuenta de dinero negativa.
- La primera caja crea aporte socio -> Principal y traspaso Principal -> Caja.
- Las cajas siguientes heredan los saldos de Caja.
- El cierre puede traspasar Caja -> Principal; el remanente declarado queda en Caja.
- Diferencias no cambian el resultado economico; quedan auditadas y ajustan Caja al declarado.
- Un desacople entre calculo de caja y libro bloquea operaciones y cierre hasta reconciliacion tecnica auditada.
- No borrar historial: anular, compensar, desactivar o enviar a papelera.

Fuente: `docs/REGLAS_CONTABLES.md`.

## Roles

- Cajero: caja, contadores, movimientos, clientes y cierre.
- Encargado: diferencias, Principal, gastos, salarios, cuentas, cierres periodicos, reportes y auditoria del local asignado.
- Administrador: control global, maestros y las mismas funciones financieras de Principal.
- Auditoria conserva usuario real, rol real y funcion utilizada.

## Ruta de lectura

1. `AGENTS.md`.
2. `AGENTS.md` de la feature, si existe.
3. Contexto de `docs/contextos/`.
4. Documento correspondiente en `docs/modulos/`.
5. Agregar reglas contables, visuales o mapa tecnico solo si el cambio las afecta.

No usar una skill como permiso de escritura. La orden literal del usuario o un objetivo activo siguen siendo obligatorios.

## Documentacion al cambiar

- Regla global: `docs/REGLAS_GENERALES.md`.
- Calculo/impacto: `docs/REGLAS_CONTABLES.md`.
- Flujo: `docs/POSEIDON_FUNCIONAMIENTO.md` y modulo afectado.
- Propiedad tecnica: `docs/MAPA_TECNICO.md`.
- Ruta: `docs/MAPA_RUTAS.md`.
- Continuidad: `docs/RETOMAR_MANANA.md`.
- Ejecucion: `README.md` y `docs/VALIDACION_LOCAL.md`.
- Version o despliegue: `docs/RELEASES_Y_DESPLIEGUES.md` y `CHANGELOG.md`.

## Comandos

```text
pnpm run check
pnpm run check:governance
pnpm run build
pnpm run release:check
pnpm run check:commit
iniciar-poseidon.bat
pnpm run smoke:localhost
pnpm run test:e2e
```

Para liberar el puerto: `detener-poseidon.bat`. No usar servidores alternativos.

## Prioridades pendientes

1. Solicitar autorizacion separada para sincronizar GitHub y despues desplegar la prueba protegida.
2. Uniformar usuario real, funcion activa y local dentro de apertura, contadores, cierre y salarios.
3. Completar E2E de Locales, Maquinas, Personal, Clientes y Papelera antes de una beta operativa amplia.
4. No iniciar multi-local ni backend Supabase sin una etapa y autorizacion propias.
