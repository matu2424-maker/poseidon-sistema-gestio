# Poseidon - Retomar trabajo

Ultima actualizacion: 2026-07-10

Este archivo registra continuidad inmediata. Las reglas permanentes viven en las fuentes canonicas indicadas por `docs/INDICE_DOCUMENTACION.md`.

## Estado

- Sistema local React/Vite/TypeScript con `localStorage`.
- Sin Supabase, Auth, Storage remoto ni despliegue activo.
- Login local por usuario de prueba.
- Datos demo: Poseidon, tres maquinas y operaciones para probar roles.
- El servidor oficial se inicia con `iniciar-poseidon.bat`.
- Repositorio estable previo al bloque documental: `85b30f2 centraliza periodos y agrega pruebas contables`.

## Ultimo bloque funcional completado

- Periodos mensuales centralizados en `src/lib/periods.ts`.
- Selector compartido en Cuentas corrientes, Diferencias y Salarios.
- Referencias de recaudacion por `balanceId` compartidas entre Cuentas y Salarios.
- Estados heredados de diferencias normalizados sin perder auditoria.
- `accountLedgerRows()` centraliza saldo corrido.
- 16 pruebas automatizadas en cinco archivos.

## Bloque documental actual

- Indice unico de documentacion.
- Fuentes canonicas explicitadas.
- Documentos de arranque/tecnica reducidos para evitar repeticion.
- Arquitectura objetivo online documentada sin implementacion.
- Plan de migracion local a online documentado y sujeto a autorizacion futura.

## Proximas prioridades de codigo

1. Limpieza tecnica pequeña: duplicaciones UI, fechas locales y comando `pnpm check`.
2. Dividir `src/features/admin/LocationsMachines.tsx` sin cambiar comportamiento.
3. Dividir movimientos de cajero y liquidacion salarial.
4. Extraer comandos de dominio con pruebas, comenzando por caja.
5. Versionar y validar la persistencia local antes de preparar adaptadores online.

No iniciar ninguna de estas tareas sin orden o objetivo activo del usuario.

## Riesgos vigentes

- `localStorage` no es persistencia multiusuario ni durable.
- El modo compacto puede recortar historial si se supera la cuota local.
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
