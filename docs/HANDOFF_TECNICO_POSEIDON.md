# Poseidon - Handoff tecnico

Ultima actualizacion: 2026-07-18

Documento para continuar desde otra cuenta o agente sin leer el chat. Las fuentes canonicas tienen prioridad sobre este resumen.

## Inicio obligatorio

1. Leer `AGENTS.md`.
2. Leer `docs/CONTEXTO_RAPIDO_CODEX.md`.
3. Leer `docs/INDICE_DOCUMENTACION.md`.
4. Abrir solo el contexto y modulo de la tarea.
5. Para contabilidad, leer `docs/REGLAS_CONTABLES.md`.
6. Para coordinacion multiagente, leer `docs/coordinacion/PROJECT_STATUS.json` y `docs/coordinacion/README.md`.

No modificar archivos sin orden literal u objetivo activo. No publicar, hacer push ni conectar servicios externos sin autorizacion.

## Proyecto

- React 19, React Router 8, Vite 6 y TypeScript.
- Persistencia local mediante `AppDataRepository` y `localStorage`.
- Snapshot esquema `5`, clave `poseidon-sistema-gestion-v2`.
- Login de prueba por usuario, sin contraseña.
- Local operativo actual: Poseidon.
- 180 pruebas unitarias/de integracion en 34 archivos, mas E2E.
- Servidor oficial: `iniciar-poseidon.bat`, URL `http://127.0.0.1:5173/`.

## Gobierno operativo

- Central integra `main`; chats de rol trabajan en worktrees aislados.
- `PROJECT_STATUS.json` resume fase, riesgos y proximas acciones.
- `DECISIONS.json`, `MIGRATIONS.json` y `CAPABILITIES.json` son registros verificables.
- Trabajo delegado o paralelo usa orden y entrega; un cambio local simple autorizado a Central no requiere una orden adicional.
- `pnpm run check:governance` valida registros y referencias sin depender de prompts gigantes.

## Modelo financiero innegociable

Solo UYU:

- Caja/Efectivo.
- Caja/Banco.
- Principal/Efectivo.
- Principal/Banco.
- Socio Mathias.
- Socio Ricardo.

- Caja <-> Principal es traspaso interno, mismo medio, sin resultado economico.
- Aporte/retiro de socio es patrimonial, entre Principal y socio.
- No existe custodia ni selector de persona para un traspaso interno.
- Resultado economico = maquinas - gastos - salarios - regalos.
- Diferencias, traspasos y socios no alteran resultado economico.
- No borrar asientos; anular con contramovimiento.
- Una salida nueva no puede dejar Caja o Principal negativas.

## Roles

- Cajero opera Caja y requiere `balanceId` activo.
- Encargado/Administrador operan Principal desde su funcion administrativa.
- Para operar una recaudacion cambian expresamente a funcion Cajero.
- Auditoria conserva usuario real, rol real y funcion usada.

## Apertura y cierre

- Primera caja: socio -> Principal -> Caja.
- Siguientes cajas: heredan saldos de Caja.
- Solo una caja abierta por local.
- Cierre: Caja -> Principal opcional, remanente declarado queda en Caja.
- El cierre no selecciona socio.
- Efectivo esperado negativo requiere fondos reales en Principal y traspaso a Caja.
- Desacople caja/libro requiere reconciliacion tecnica auditada, no un traspaso comun.

## Gastos y salarios

- Cajero: Caja/Efectivo y `balanceId`.
- Encargado/Admin: Principal/Efectivo o Principal/Banco, sin `balanceId`.
- Ambos integran resultado economico y reportes del local/periodo.
- Salarios se imputan al periodo trabajado.
- Cierre salarial mensual es inmutable; correcciones crean R1/R2.

## Archivos clave

```text
src/App.tsx
src/types.ts
src/navigation/screens.ts
src/application/cash/openCash.ts
src/application/cash/closeCash.ts
src/application/treasury/treasuryCommands.ts
src/application/expenses/principalExpenseCommands.ts
src/application/movements/operatingMovementCommands.ts
src/application/salaries/salarySettlementCommands.ts
src/lib/currentAccounts.ts
src/lib/accountMovements.ts
src/lib/cashTotals.ts
src/lib/periodicTotals.ts
src/data/normalizeData.ts
src/data/migrateData.ts
src/features/accounts/CurrentAccounts.tsx
src/features/manager/Expenses.tsx
src/features/cashier/CloseCash.tsx
src/features/reports/Periodic.tsx
```

## Validacion

```text
pnpm run check
pnpm run check:governance
pnpm run build
iniciar-poseidon.bat
pnpm run smoke:localhost
pnpm run test:e2e
pnpm run check:commit
git diff --check
```

Validar roles Cajero, Encargado y Administrador; escritorio y movil para cambios visuales.

## Pendientes

- Validacion runtime profunda del snapshot.
- E2E adicional de tesoreria y cierre periodico.
- Extraer handlers React sensibles restantes.
- Auth/base/storage real y multi-local completo en etapa futura autorizada.
