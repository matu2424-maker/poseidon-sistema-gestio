# Poseidon - Retomar trabajo

Ultima actualizacion: 2026-07-11

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
- Codex cuenta con tres perfiles personalizados de solo lectura y limites conservadores de concurrencia/profundidad en `.codex/`.

## Ultimo bloque funcional completado

- Diferencias reconfirma toda gestion sensible y limpia errores al cerrar o cambiar de recaudacion.
- Encargado solo puede gestionar diferencias de sus locales asignados, validado tambien por el comando.
- Correcciones exigen importes validos de efectivo y banco.
- Anular una diferencia conserva el asiento original y agrega contramovimientos activos, dejando impacto neto cero.
- 58 pruebas automatizadas en 18 archivos.

## Bloque documental actual

- Indice unico de documentacion.
- Fuentes canonicas explicitadas.
- Documentos de arranque/tecnica reducidos para evitar repeticion.
- Arquitectura objetivo online documentada sin implementacion.
- Plan de migracion local a online documentado y sujeto a autorizacion futura.
- Protocolo de agentes y subagentes integrado con un piloto de solo lectura sobre Diferencias.

## Proximas prioridades de codigo

1. Completado: libro contable persistido y proteccion de referencias historicas.
2. Completado: comandos de caja, contadores, diferencias y salarios con pruebas.
3. Completado: primera division mecanica de locales/maquinas, movimientos, salarios y normalizacion de datos.
4. Completado: navegacion, permisos, confirmaciones y avisos centralizados.
5. Completado: CSS global separado sin alterar la cascada.
6. Completado: ESLint, 58 pruebas, smoke HTTP y smoke manual por los tres roles.
7. Completado: E2E critico de cajero y carga diferida por pantalla; bundle inicial reducido a 283,65 kB.
8. Completado: comandos de movimientos operativos y locales/maquinas con pruebas de invariantes y auditoria.
9. Completado: integracion contable transversal y puerto asincrono con adaptador `localStorage`.
10. Completado: primer regreso funcional en Diferencias, con permisos por local, validaciones y anulacion contable corregida.
11. Siguiente paso: continuar con un modulo funcional elegido por el usuario, sin otra refactorizacion amplia.
12. Antes del proximo uso de subagentes: comprobar en una tarea nueva que Codex carga los tres perfiles personalizados.

No iniciar ninguna de estas tareas sin orden o objetivo activo del usuario.

## Riesgos vigentes

- `localStorage` no es persistencia multiusuario ni durable.
- La cuota de `localStorage` puede impedir nuevos guardados; el sistema conserva el snapshot anterior y pide exportar respaldo.
- Varias operaciones de negocio siguen dentro de componentes React.
- Los archivos mas grandes restantes son liquidacion salarial, seed demo, historiales y estilos administrativos ya separados.
- La cobertura automatizada incluye apertura-contadores-cierre, pero no todos los formularios UI ni todos los comandos pendientes.
- El piloto de subagentes detecto riesgos no corregidos en Diferencias; consultar `docs/PILOTO_SUBAGENTES_DIFERENCIAS.md` y elegir uno por objetivo.

## Validacion esperada al cerrar un bloque

```text
pnpm run check
pnpm run build
pnpm run smoke:localhost
git diff --check
git status --short
```

Para cambios documentales puros, validar ademas referencias internas y ausencia de contradicciones.

## Para continuar

1. Ejecutar `git status --short` y `git log -1 --oneline`.
2. Leer `docs/CONTEXTO_RAPIDO_CODEX.md`.
3. Abrir solo el contexto y modulo de la tarea.
4. Respetar el limite local: no publicar ni conectar servicios externos.
