# Poseidon - Retomar trabajo

Ultima actualizacion: 2026-07-12

Este archivo registra continuidad inmediata. Las reglas permanentes viven en las fuentes canonicas indicadas por `docs/INDICE_DOCUMENTACION.md`.

## Estado

- Sistema local React/Vite/TypeScript con `localStorage`.
- Sin Supabase, Auth, Storage remoto ni despliegue activo.
- Login local por usuario de prueba.
- Datos demo: Poseidon, tres maquinas y operaciones para probar roles.
- El servidor oficial se inicia con `iniciar-poseidon.bat`.
- El snapshot local esta versionado y validado; no se recorta historial para forzar guardados.
- Datos locales permite exportar/importar respaldo y recuperar almacenamiento corrupto sin sobrescribirlo.
- Libro contable local conserva asientos originales y usa contramovimientos para anulaciones.
- Papelera y locales bloquean eliminacion definitiva cuando existen referencias operativas.
- Apertura, contadores, cierre, diferencias, salarios, movimientos operativos y locales/maquinas usan comandos de aplicacion probados.
- Codex cuenta con tres perfiles personalizados de solo lectura; `.codex/` no fija cantidad de hilos ni profundidad.
- `pnpm run check:agents` controla 28 invariantes; plantilla y registro de delegaciones estan versionados.
- El perfil UI actua como custodio de diseno; tres pilotos, sistema visual, referencias y `check:design` quedan versionados.
- Cuatro skills reutilizables y `check:skills` quedan versionados; `check:commit` es el control unico previo al commit.
- El hook local usa `.githooks/pre-commit`; GitHub, Supabase y Vercel siguen sin conectarse.

## Ultimo bloque funcional completado

- Infraestructura visual completada sin cambiar pantallas adicionales: custodio en modos propuesta/verificacion, tres pilotos y referencias reproducibles.
- `Diferencias` adopto el primer piloto visual renovado: resumen compacto, filtros rotulados, tabla clara, acciones jerarquizadas y modal plano, sin cambios contables.
- Sus estilos quedaron bajo `features/admin.css` y la pantalla reutiliza el `Modal` compartido.
- Diferencias reconfirma toda gestion sensible y limpia errores al cerrar o cambiar de recaudacion.
- Encargado solo puede gestionar diferencias de sus locales asignados, validado tambien por el comando.
- Correcciones exigen importes validos de efectivo y banco.
- Anular una diferencia conserva el asiento original y agrega contramovimientos activos, dejando impacto neto cero.
- Matriz de transiciones, bloqueo por caja abierta, historico inmutable, IDs/cadena append-only, finitud, periodo operativo y auditoria local quedaron implementados.
- Auditoria muestra detalle de saldos/movimientos y limita al encargado a sus locales.
- 102 pruebas automatizadas en 24 archivos.

## Bloque documental actual

- Indice unico de documentacion.
- Fuentes canonicas explicitadas.
- Documentos de arranque/tecnica reducidos para evitar repeticion.
- Metricas reconciliadas al 2026-07-12: aproximadamente 17.900 lineas fisicas TypeScript/React, 3.700 lineas fisicas CSS, 102 pruebas en 24 archivos y dos E2E.
- Referencias obsoletas a `WelcomeScreen.tsx` eliminadas y deuda tecnica sincronizada con el codigo actual.
- Arquitectura objetivo online documentada sin implementacion.
- Plan de migracion local a online documentado y sujeto a autorizacion futura.
- Protocolo de agentes y subagentes integrado con un piloto de solo lectura sobre Diferencias.
- Validacion automatica, medicion obligatoria, regla de tres usos y responsabilidad exclusiva del agente principal documentadas.
- Skills, validador, hook proporcional y validacion real documentados en `docs/SKILLS_POSEIDON.md` y `docs/VALIDACION_SKILLS_Y_PRECOMMIT.md`.

## Proximas prioridades de codigo

1. Reforzar autorizacion de rol, funcion activa y local asignado dentro de los comandos existentes.
2. Crear un contexto real de local activo y blindar una sola caja abierta por local.
3. Extraer cierres salariales, cierres periodicos y control administrativo de gastos desde handlers React.
4. Agregar pruebas de permisos negativos, cierre salarial, cierre periodico y ciclo completo de maquinas.
5. Profundizar la validacion runtime del snapshot antes de trabajar en un adaptador online.

No iniciar ninguna de estas tareas sin orden o objetivo activo del usuario.

## Riesgos vigentes

- `localStorage` no es persistencia multiusuario ni durable.
- La cuota de `localStorage` puede impedir nuevos guardados; el sistema conserva el snapshot anterior y pide exportar respaldo.
- El local operativo sigue fijado a Poseidon/primer local aunque la estructura de datos sea multi-local.
- Parte de la autorizacion de caja y salarios depende de navegacion/UI en vez de quedar blindada dentro del comando.
- Varias operaciones sensibles siguen dentro de componentes React.
- Los archivos mas grandes restantes son liquidacion salarial, seed demo, historiales y estilos administrativos ya separados.
- La cobertura automatizada incluye apertura-contadores-cierre, pero no todos los formularios UI, cierres salariales/periodicos ni el ciclo completo de maquinas.
- La validacion inicial del snapshot comprueba colecciones principales y depende de la normalizacion posterior para completar compatibilidad.
- Los perfiles personalizados se comprobaron por contrato nominal; la API disponible no permite demostrar seleccion interna nativa por `agent_type`.

## Validacion esperada al cerrar un bloque

```text
pnpm run check
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
