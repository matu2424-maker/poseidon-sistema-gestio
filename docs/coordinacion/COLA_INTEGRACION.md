# Poseidon - Cola de integracion

Ultima actualizacion: 2026-07-16

Estados permitidos: `PROPUESTA`, `ASIGNADA`, `EN_CURSO`, `LISTA`, `INTEGRADA`, `BLOQUEADA`, `DESCARTADA`.

| ID | Chat propietario | Alcance | Rama/commit | Contratos compartidos | Estado | Validacion |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-16-CEN-01 | Poseidon Central | Contrato de disponibilidad de efectivo y cierre con esperado negativo | `main` / commit de esta integracion | `cashAvailability`, movimientos, salarios y cierre | `INTEGRADA` | 146 pruebas centrales, check/build/smoke/check:commit |

## Uso

- Una fila representa una unidad integrable, no una conversacion completa.
- Central actualiza estado y orden de integracion.
- `LISTA` exige entrega estructurada y commit local.
- `INTEGRADA` exige revision del diff y validacion transversal.
- Los IDs usan `AAAA-MM-DD-ROL-NN`, por ejemplo `2026-07-16-CAJ-01`.
