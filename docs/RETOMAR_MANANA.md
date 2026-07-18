# Poseidon - Retomar trabajo

Ultima actualizacion: 2026-07-17

## Estado inmediato

- Proyecto local React/Vite/TypeScript con React Router.
- Snapshot local esquema `5` y clave `poseidon-sistema-gestion-v2`.
- Sin Supabase, Auth, Storage remoto ni despliegue.
- Local operativo: Poseidon.
- Servidor oficial: `iniciar-poseidon.bat`.
- Validacion vigente antes del cierre actual: 175 pruebas en 33 archivos; E2E debe revalidarse al cerrar el bloque.

## Ultimo bloque funcional

Se implemento el modelo de tesoreria separado:

- Caja/Efectivo y Caja/Banco.
- Principal/Efectivo y Principal/Banco.
- Cuentas patrimoniales de Mathias y Ricardo.
- Traspasos Caja <-> Principal sin resultado economico.
- Aportes/retiros reales de socios sin concepto de custodia.
- Primera apertura socio -> Principal -> Caja.
- Cierres con traspaso Caja -> Principal y remanente declarado en Caja.
- Gastos y salarios administrativos desde Principal, sin `balanceId`.
- Gastos y salarios de Cajero desde Caja/Efectivo, con `balanceId`.
- Cierres periodicos consolidan cajas y movimientos administrativos de Principal.
- Alta legacy de capital deshabilitada; historial conservado.
- Migracion 4 -> 5 preserva Caja y resultado economico.

## Reglas que no deben revertirse

- Resultado economico = maquinas - gastos - salarios - regalos.
- No existe custodia.
- Un traspaso interno no selecciona socio.
- Una salida nueva no deja Caja o Principal negativas.
- Los traspasos automaticos de apertura/cierre son inmutables.
- Diferencias no cambian resultado economico.
- Historial y asientos se preservan con contramovimientos.
- Encargado/Admin operan Principal; para Caja cambian a Cajero.

## Fuentes actualizadas

- `README.md`.
- `docs/REGLAS_CONTABLES.md`.
- `docs/REGLAS_GENERALES.md`.
- `docs/POSEIDON_FUNCIONAMIENTO.md`.
- `docs/MAPA_TECNICO.md`.
- `docs/MAPA_RUTAS.md`.
- contextos de Caja, Cajero, Encargado, Cuentas y Salarios.
- modulos 00, 02, 04, 05, 07, 10 y 11.

## Pendiente para cerrar el bloque

1. Ejecutar E2E actualizado.
2. Corregir cualquier selector o flujo visual regresado.
3. Verificar roles y viewports.
4. Ejecutar `check`, `build`, `smoke`, `check:commit` y `git diff --check`.
5. Crear commit local estable, sin push.

## Deuda posterior

- Validacion runtime profunda del snapshot.
- Extraer mutaciones sensibles restantes de handlers React.
- Ampliar E2E de tesoreria, cierre periodico y formularios administrativos.
- Multi-local completo y migracion online quedan postergados.

## Comandos

```text
git status --short
git log -1 --oneline
pnpm run check
pnpm run build
iniciar-poseidon.bat
pnpm run smoke:localhost
pnpm run test:e2e
pnpm run check:commit
```

No publicar ni conectar servicios externos.
