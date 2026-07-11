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

## Ultimo bloque funcional completado

- Periodos mensuales centralizados en `src/lib/periods.ts`.
- Selector compartido en Cuentas corrientes, Diferencias y Salarios.
- Referencias de recaudacion por `balanceId` compartidas entre Cuentas y Salarios.
- Estados heredados de diferencias normalizados sin perder auditoria.
- `accountLedgerRows()` centraliza saldo corrido.
- 34 pruebas automatizadas en trece archivos.

## Bloque documental actual

- Indice unico de documentacion.
- Fuentes canonicas explicitadas.
- Documentos de arranque/tecnica reducidos para evitar repeticion.
- Arquitectura objetivo online documentada sin implementacion.
- Plan de migracion local a online documentado y sujeto a autorizacion futura.

## Proximas prioridades de codigo

1. Completado: libro contable persistido y proteccion de referencias historicas.
2. Completado: comandos de caja, contadores, diferencias y salarios con pruebas.
3. Completado: primera division mecanica de locales/maquinas, movimientos, salarios y normalizacion de datos.
4. Completado: navegacion, permisos, confirmaciones y avisos centralizados.
5. Completado: CSS global separado sin alterar la cascada.
6. Completado: ESLint, 51 pruebas, smoke HTTP y smoke manual por los tres roles.
7. Completado: E2E critico de cajero y carga diferida por pantalla; bundle inicial reducido a 283,65 kB.
8. Completado: comandos de movimientos operativos y locales/maquinas con pruebas de invariantes y auditoria.
9. Siguiente mejora incremental: integracion contable transversal y puerto de persistencia local/online.

No iniciar ninguna de estas tareas sin orden o objetivo activo del usuario.

## Riesgos vigentes

- `localStorage` no es persistencia multiusuario ni durable.
- La cuota de `localStorage` puede impedir nuevos guardados; el sistema conserva el snapshot anterior y pide exportar respaldo.
- Varias operaciones de negocio siguen dentro de componentes React.
- Los archivos mas grandes restantes son liquidacion salarial, seed demo, historiales y estilos administrativos ya separados.
- La cobertura automatizada incluye apertura-contadores-cierre, pero no todos los formularios UI ni todos los comandos pendientes.

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
