# Poseidon - Cola de integracion

Ultima actualizacion: 2026-07-18

Estados permitidos: `PROPUESTA`, `ASIGNADA`, `EN_CURSO`, `LISTA`, `INTEGRADA`, `BLOQUEADA`, `DESCARTADA`.

| ID | Chat propietario | Alcance | Rama/commit | Contratos compartidos | Estado | Validacion |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-16-CEN-01 | Poseidon Central | Contrato de disponibilidad de efectivo y cierre con esperado negativo | `main` / `2e4e835` | `cashAvailability`, movimientos, salarios y cierre | `INTEGRADA` | 146 pruebas centrales, check/build/smoke/check:commit |
| 2026-07-16-CAJ-01 | Poseidon Cajero | Aviso, bloqueo y recuperacion guiada del cierre con efectivo negativo | `codex/cajero` / `e665441` | Consume `totals.expectedCash` y `closeCashCommand` sin duplicar formulas | `INTEGRADA` | 146 pruebas, 9/9 E2E, build, smoke, check:commit y QA 1366x768/390x844 |
| 2026-07-18-ENC-01 | Poseidon Encargado | Priorizar Efectivo sobre Banco en el selector de Cuentas corrientes | `codex/encargado` / `2254295` | Solo presentacion y seleccion; sin cambios contables | `INTEGRADA` | 189 pruebas, build, smoke, navegador como Encargado y consola limpia |
| 2026-07-18-ADM-01 | Poseidon Administrador | Cargar un escenario integral de pruebas desde Datos locales con respaldo previo | `codex/administrador` / pendiente | Consume el comando central de carga demo; propiedad temporal de `LocalDataMaintenance.tsx` | `ASIGNADA` | Pendiente: check, build, check:commit y validacion visual del rol |

## Uso

- Una fila representa una unidad integrable, no una conversacion completa.
- Un bloque ejecutado directamente por Central en `main` no necesita una fila ficticia; se registra en `PROJECT_STATUS.json` y, si corresponde, en decisiones o migraciones.
- Central actualiza estado y orden de integracion.
- `LISTA` exige entrega estructurada y commit local.
- `INTEGRADA` exige revision del diff y validacion transversal.
- Los IDs usan `AAAA-MM-DD-ROL-NN`, por ejemplo `2026-07-16-CAJ-01`.
