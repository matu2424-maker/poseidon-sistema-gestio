# Poseidon - Cola de integracion

Ultima actualizacion: 2026-07-16

Estados permitidos: `PROPUESTA`, `ASIGNADA`, `EN_CURSO`, `LISTA`, `INTEGRADA`, `BLOQUEADA`, `DESCARTADA`.

| ID | Chat propietario | Alcance | Rama/commit | Contratos compartidos | Estado | Validacion |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-16-CEN-01 | Poseidon Central | Contrato de disponibilidad de efectivo y cierre con esperado negativo | `main` / `2e4e835` | `cashAvailability`, movimientos, salarios y cierre | `INTEGRADA` | 146 pruebas centrales, check/build/smoke/check:commit |
| 2026-07-16-CAJ-01 | Poseidon Cajero | Aviso, bloqueo y recuperacion guiada del cierre con efectivo negativo | `codex/cajero` / `e665441` | Consume `totals.expectedCash` y `closeCashCommand` sin duplicar formulas | `INTEGRADA` | 146 pruebas, 9/9 E2E, build, smoke, check:commit y QA 1366x768/390x844 |

## Uso

- Una fila representa una unidad integrable, no una conversacion completa.
- Central actualiza estado y orden de integracion.
- `LISTA` exige entrega estructurada y commit local.
- `INTEGRADA` exige revision del diff y validacion transversal.
- Los IDs usan `AAAA-MM-DD-ROL-NN`, por ejemplo `2026-07-16-CAJ-01`.
