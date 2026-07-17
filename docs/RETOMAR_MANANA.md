# Poseidon - Retomar trabajo

Ultima actualizacion: 2026-07-17

Este archivo registra continuidad inmediata. Las reglas permanentes viven en las fuentes canonicas indicadas por `docs/INDICE_DOCUMENTACION.md`.

## Estado

- Sistema local React/Vite/TypeScript con `localStorage`.
- Sin Supabase, Auth, Storage remoto ni despliegue activo.
- Login local por usuario de prueba.
- React Router mantiene una URL estable por modulo y `sessionStorage` conserva usuario/funcion durante la pestaña.
- Datos demo: Poseidon, tres maquinas y operaciones para probar roles.
- El servidor oficial se inicia con `iniciar-poseidon.bat`.
- El snapshot local usa esquema 4 y esta versionado; no se recorta historial para forzar guardados.
- La hidratacion separa normalizacion estructural de migraciones incrementales. Esquema 3 -> 4 reconstruye salidas historicas de transferencias y agrega un puente tecnico solo con causalidad exacta, auditoria e idempotencia.
- Datos locales permite exportar/importar respaldo y recuperar almacenamiento corrupto sin sobrescribirlo.
- El guardado compara la version leida por la pestaña; conflictos o fallos bloquean nuevas escrituras y conservan un respaldo pendiente.
- Libro contable local conserva asientos originales y usa contramovimientos para anulaciones.
- Una pestana pasiva adopta automaticamente el ultimo guardado; una pestana con mutacion propia pendiente conserva el conflicto.
- Papelera y locales bloquean eliminacion definitiva cuando existen referencias operativas.
- Apertura, contadores, cierre, diferencias, salarios, movimientos operativos y locales/maquinas usan comandos de aplicacion probados.
- Las nuevas salidas en efectivo validan el saldo activo `Local / Efectivo`; un saldo negativo por maquinas bloquea salidas y cierre hasta un aporte real.
- Una caja abierta exige `efectivo esperado === Local / Efectivo`; un delta tecnico bloquea operaciones y cierre y no se corrige con aporte ordinario.
- Encargado asignado puede registrar gastos y retiros/aportes sobre la misma caja abierta y cuentas del Cajero desde funcion `ENCARGADO`; el resto del flujo requiere Cajero.
- Codex cuenta con tres perfiles personalizados de solo lectura; `.codex/` no fija cantidad de hilos ni profundidad.
- `pnpm run check:agents` controla 28 invariantes; plantilla y registro de delegaciones estan versionados.
- `pnpm run check:workstreams` controla tres chats de rol, prompts, contextos, propiedad de archivos y contratos reservados.
- El perfil UI actua como custodio de diseno; tres pilotos, sistema visual, referencias y `check:design` quedan versionados.
- Cuatro skills reutilizables y `check:skills` quedan versionados; `check:commit` es el control unico previo al commit.
- El hook local usa `.githooks/pre-commit`; GitHub, Supabase y Vercel siguen sin conectarse.

## Ultimo bloque funcional completado

- Una sola caja abierta por local, independientemente de la fecha operativa.
- Con caja abierta se bloquean cierre del local, traslado/asignacion de maquinas y ajustes administrativos de contadores.
- Periodos salariales limitados a `AAAA-MM` con meses reales.
- Guardado local con comparacion optimista, respaldo del intento y recuperacion ante conflicto/fallo.
- Referencias de baja ampliadas para transferencias de clientes, historial salarial y operaciones del local.
- Auditoria sin logs sinteticos, con locales congelados y redaccion de credenciales/archivos inline.
- Modales con foco/Escape, avisos anunciables, filas por teclado y `aria-sort` en todas las grillas ordenables.
- Cierre salarial definitivo con foto por empleado, bloqueo mensual y revisiones correctivas R1/R2 enlazadas.
- Paneles iniciales separados en `CashierDashboard`, `ManagerDashboard` y `AdminDashboard`, con selector compatible en `RoleDashboard`.
- Poseidon Central, Cajero, Encargado y Administrador tienen prompts, workstreams, contratos y plantillas versionados.
- Movimientos operativos validan usuario activo, rol real, funcion y local asignado dentro del comando. La interfaz compartida muestra caja, efectivo, banco y funcion activa.
- 158 pruebas automatizadas en 29 archivos y 11 casos E2E en 6 archivos.

## Bloque documental actual

- Indice unico de documentacion.
- Fuentes canonicas explicitadas.
- Documentos de arranque/tecnica reducidos para evitar repeticion.
- Metricas de validacion al 2026-07-17: 158 pruebas en 29 archivos y 11 casos E2E en 6 archivos.
- Referencias obsoletas a `WelcomeScreen.tsx` eliminadas y deuda tecnica sincronizada con el codigo actual.
- Arquitectura objetivo online documentada sin implementacion.
- Plan de migracion local a online documentado y sujeto a autorizacion futura.
- Protocolo de agentes y subagentes integrado con un piloto de solo lectura sobre Diferencias.
- Validacion automatica, medicion obligatoria, regla de tres usos y responsabilidad exclusiva del agente principal documentadas.
- Skills, validador, hook proporcional y validacion real documentados en `docs/SKILLS_POSEIDON.md` y `docs/VALIDACION_SKILLS_Y_PRECOMMIT.md`.
- Coordinacion de chats permanentes documentada en `docs/coordinacion/`, con validacion automatica y contratos de entrega.

## Proximas prioridades de codigo

1. Extender la politica de autorizacion por rol, funcion y local ya aplicada a movimientos hacia apertura, contadores, cierre y salarios.
2. Extraer cierres periodicos y control administrativo de gastos desde handlers React.
3. Agregar pruebas de permisos negativos y cierre periodico.
4. Al final, implementar validacion runtime profunda del snapshot.

El contexto operativo multi-local queda postergado por decision del usuario; el trabajo actual se enfoca solo en Poseidon.

No iniciar ninguna de estas tareas sin orden o objetivo activo del usuario.

## Riesgos vigentes

- `localStorage` no es persistencia multiusuario ni durable. La sincronizacion implementada cubre pestanas del mismo navegador, no equipos o navegadores distintos.
- La cuota de `localStorage` puede impedir nuevos guardados; el sistema bloquea la operacion y conserva el intento para descargar o reintentar.
- El local operativo sigue fijado a Poseidon/primer local aunque la estructura de datos sea multi-local.
- Parte de la autorizacion de apertura, contadores, cierre y salarios depende de navegacion/UI; movimientos operativos y cierres salariales ya validan dentro del comando.
- Varias operaciones sensibles siguen dentro de componentes React.
- Los archivos mas grandes restantes son liquidacion salarial, seed demo, historiales y estilos administrativos ya separados.
- La cobertura automatizada incluye apertura-contadores-cierre, diferencias, ciclo de maquinas, conflicto entre pestañas y cierre salarial correctivo, pero no todos los formularios UI ni cierres periodicos.
- La validacion inicial del snapshot comprueba colecciones principales; la migracion incremental ya esta separada, pero la validacion runtime profunda de campos y relaciones sigue reservada para el bloque final.
- Los perfiles personalizados se comprobaron por contrato nominal; la API disponible no permite demostrar seleccion interna nativa por `agent_type`.

## Validacion esperada al cerrar un bloque

```text
pnpm run check
pnpm run check:workstreams
pnpm run build
pnpm run smoke:localhost
pnpm run check:commit
git diff --check
git status --short
```

Para cambios documentales puros, validar ademas referencias internas y ausencia de contradicciones.

## Para continuar

1. Ejecutar `git status --short` y `git log -1 --oneline`.
2. Leer `docs/CONTEXTO_RAPIDO_CODEX.md`.
3. Abrir solo el contexto y modulo de la tarea.
4. Respetar el limite local: no publicar ni conectar servicios externos.
