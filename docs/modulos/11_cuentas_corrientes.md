# Modulo 11 - Cuentas corrientes y tesoreria

Pantalla: `src/features/accounts/CurrentAccounts.tsx`.

Reglas: `src/lib/currentAccounts.ts`, `src/lib/accountMovements.ts` y `src/application/treasury/treasuryCommands.ts`.

## Objetivo

Mostrar saldos derivados de asientos y ofrecer un unico lugar administrativo para mover fondos entre Caja, Principal y socios.

## Cuentas visibles

### Caja

- `Caja / Efectivo` por local.
- `Caja / Banco` por local.

### Principal

- `Principal / Efectivo`.
- `Principal / Banco`.

### Socios

- Mathias / UYU.
- Ricardo / UYU.

### Otras

- Transferencias.

Las cuentas de Personal se consultan dentro de Liquidacion de salarios.

El selector conserva los grupos Caja, Principal, Socios y Otras. Dentro de Caja y Principal muestra Efectivo antes que Banco mediante una prioridad explicita, independiente de las etiquetas; la busqueda mantiene ese orden relativo y la primera cuenta visible determina la seleccion inicial.

## Periodos

- Abre en mes corriente.
- Permite mes anterior, mes actual y consulta por mes/año.
- Saldos, entradas, salidas y movimientos respetan el periodo.
- El saldo corrido parte del saldo anterior al rango y acumula los movimientos visibles.

## Tabla

Muestra:

- fecha;
- tipo/concepto;
- detalle;
- usuario;
- debito;
- credito;
- saldo.

Debito es salida y Credito es entrada. Todas las columnas visibles ordenan. Al seleccionar una fila se abre el detalle completo y, si existe, la recaudacion asociada.

## Traspasos Caja/Principal

- `Caja a Principal`: sale de Caja y entra en Principal.
- `Principal a Caja`: sale de Principal y entra en Caja.
- El medio se conserva.
- No cambia el resultado economico.
- Si existe caja abierta, el traspaso debe asociarse a ella.
- Los traspasos de apertura y cierre no se anulan.
- Los operativos pueden anularse con motivo si la caja asociada sigue abierta y el reverso tiene fondos.

## Socios

- Aporte: cuenta del socio -> Principal.
- Retiro: Principal -> cuenta del socio.
- Solo Mathias y Ricardo.
- No existe custodia.
- No cambia resultado economico.
- Cada alta o anulacion genera asientos dobles y auditoria.

## Impactos principales

| Operacion | Cuenta financiera | Resultado economico |
| --- | --- | --- |
| Resultado de maquinas | Caja/Efectivo | Si |
| Gasto del Cajero | Caja/Efectivo | Si |
| Regalo | Caja/Efectivo | Si |
| Salario del Cajero | Caja/Efectivo | Si |
| Transferencia del Cajero | Caja/Efectivo -> Caja/Banco | No |
| Gasto administrativo | Principal/Efectivo o Banco | Si |
| Salario administrativo | Principal/Efectivo o Banco | Si |
| Caja <-> Principal | Ambas cuentas, mismo medio | No |
| Aporte/retiro socio | Principal <-> Socio | No |
| Diferencia | Caja/Efectivo o Banco | No |

## Historial

- Los asientos no se reescriben.
- Una anulacion agrega contramovimientos.
- Cada asiento conserva origen, usuario, fecha, cuenta, local, `balanceId` cuando aplica, monto, direccion y estado.
- Los movimientos legacy siguen siendo consultables.
