# Poseidon - Contexto rapido para Codex

Ultima actualizacion: 2026-07-18

Usar `docs/INDICE_DOCUMENTACION.md` para elegir la fuente canonica de una tarea. No releer todo el repositorio por defecto.

## Estado tecnico

- React 19, React Router 8, Vite 6 y TypeScript.
- Persistencia local mediante `AppDataRepository` y `localStorage`.
- Clave compatible: `poseidon-sistema-gestion-v2`.
- Snapshot actual: esquema `5`.
- Login local por seleccion de usuario; sesion de pestaña en `sessionStorage`.
- Local operativo actual: Poseidon. Multi-local completo queda postergado.
- Sin Auth, base remota, storage real ni despliegue.
- Adjuntos: solo metadatos.
- `src/App.tsx` orquesta; `src/navigation/screens.ts` define rutas, titulos, roles y requisito de caja.
- Normalizacion en `src/data/normalizeData.ts`; migraciones en `src/data/migrateData.ts`.
- Validacion vigente: 183 pruebas unitarias/de integracion en 35 archivos, mas E2E.
- Gobierno SOPM-Lite: estado, decisiones, migraciones y capacidades en `docs/coordinacion/`, validados sin dependencias externas.
- Workstreams permanentes: Central, Cajero, Encargado, Administrador y Calidad/Pruebas; este ultimo valida y asesora, pero no decide ni integra.

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

## Comandos

```text
pnpm run check
pnpm run check:governance
pnpm run build
pnpm run check:commit
iniciar-poseidon.bat
pnpm run smoke:localhost
pnpm run test:e2e
```

Para liberar el puerto: `detener-poseidon.bat`. No usar servidores alternativos.

## Prioridades pendientes

1. Completar validacion runtime profunda del snapshot al final de la etapa local.
2. Extraer mutaciones sensibles restantes de handlers React.
3. Ampliar E2E de tesoreria, reportes periodicos y formularios administrativos.
4. Mantener el foco operativo en Poseidon; no iniciar multi-local ni migracion online sin autorizacion.
