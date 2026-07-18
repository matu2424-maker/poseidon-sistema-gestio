# DEC-2026-002 - Separacion entre Caja, Principal y Socios

- Estado: `APPROVED`
- Fecha: 2026-07-17
- Alcance: tesoreria, caja, cuentas corrientes y resultado economico

## Contexto

Los fondos operativos del Cajero, los fondos administrados por Encargado o Administrador y los movimientos patrimoniales de socios no pueden compartir una unica cuenta ni confundirse con ingresos o gastos.

## Decision

- Existen Caja/Efectivo, Caja/Banco, Principal/Efectivo y Principal/Banco, solo en UYU.
- Mathias y Ricardo tienen cuentas patrimoniales independientes.
- Caja y Principal se comunican mediante traspasos internos del mismo medio.
- Aportes y retiros de socios son movimientos patrimoniales reales entre Socio y Principal.
- No existe concepto de custodia ni selector de persona en un traspaso interno.
- Estos movimientos no alteran el resultado economico.

## Consecuencias

- Cajero opera Caja; Encargado y Administrador operan Principal desde su funcion administrativa.
- Una salida no puede dejar la cuenta pagadora negativa.
- La primera apertura sigue el flujo Socio -> Principal -> Caja.
- El cierre puede transferir Caja -> Principal y deja el remanente declarado en Caja.

## Evidencia

- `docs/REGLAS_CONTABLES.md`
- `src/application/treasury/treasuryCommands.ts`
- `src/application/cash/openCash.ts`
- `src/application/cash/closeCash.ts`
- Commit `89e4eb7a19d35cdd70ac18ecada7e61aa6898cd0`
