# Poseidon - Retomar trabajo

Ultima actualizacion: 2026-07-10

Este archivo registra continuidad inmediata. Las reglas permanentes viven en las fuentes canonicas indicadas por `docs/INDICE_DOCUMENTACION.md`.

## Estado

- Sistema local React/Vite/TypeScript con `localStorage`.
- Sin Supabase, Auth, Storage remoto ni despliegue activo.
- Login local por usuario de prueba.
- Datos demo: Poseidon, tres maquinas y operaciones para probar roles.
- El servidor oficial se inicia con `iniciar-poseidon.bat`.
- El snapshot local esta versionado y validado; no se recorta historial para forzar guardados.
- Datos locales permite exportar/importar respaldo y recuperar almacenamiento corrupto sin sobrescribirlo.

## Ultimo bloque funcional completado

- Periodos mensuales centralizados en `src/lib/periods.ts`.
- Selector compartido en Cuentas corrientes, Diferencias y Salarios.
- Referencias de recaudacion por `balanceId` compartidas entre Cuentas y Salarios.
- Estados heredados de diferencias normalizados sin perder auditoria.
- `accountLedgerRows()` centraliza saldo corrido.
- 24 pruebas automatizadas en ocho archivos.

## Bloque documental actual

- Indice unico de documentacion.
- Fuentes canonicas explicitadas.
- Documentos de arranque/tecnica reducidos para evitar repeticion.
- Arquitectura objetivo online documentada sin implementacion.
- Plan de migracion local a online documentado y sujeto a autorizacion futura.

## Proximas prioridades de codigo

1. Definir libro contable persistido e inmutable y proteger referencias historicas.
2. Extraer comandos de dominio con pruebas, comenzando por caja y diferencias.
3. Dividir `src/features/admin/LocationsMachines.tsx` sin cambiar comportamiento.
4. Dividir movimientos de cajero, liquidacion salarial y datos demo/normalizacion.
5. Centralizar navegacion, permisos, confirmaciones y avisos; luego separar CSS.

No iniciar ninguna de estas tareas sin orden o objetivo activo del usuario.

## Riesgos vigentes

- `localStorage` no es persistencia multiusuario ni durable.
- La cuota de `localStorage` puede impedir nuevos guardados; el sistema conserva el snapshot anterior y pide exportar respaldo.
- Varias operaciones de negocio siguen dentro de componentes React.
- Los archivos mas grandes son Locales/Maquinas, datos demo/normalizacion, movimientos de cajero y salarios.
- La cobertura automatizada todavia no incluye ciclos completos de caja.

## Validacion esperada al cerrar un bloque

```text
pnpm test
pnpm run build
http://127.0.0.1:5173/ -> 200
git diff --check
git status --short
```

Para cambios documentales puros, validar ademas referencias internas y ausencia de contradicciones.

## Para continuar

1. Ejecutar `git status --short` y `git log -1 --oneline`.
2. Leer `docs/CONTEXTO_RAPIDO_CODEX.md`.
3. Abrir solo el contexto y modulo de la tarea.
4. Respetar el limite local: no publicar ni conectar servicios externos.
