# Contexto Codex - Cuentas corrientes

Ultima actualizacion: 2026-07-17

Leer junto con `docs/REGLAS_CONTABLES.md` y `docs/modulos/11_cuentas_corrientes.md`.

## Codigo

- Pantalla: `src/features/accounts/CurrentAccounts.tsx`.
- Comandos: `src/application/treasury/treasuryCommands.ts`.
- Cuentas y saldos: `src/lib/currentAccounts.ts`.
- Asientos, reversos y saldo corrido: `src/lib/accountMovements.ts`.
- Referencias de recaudacion: `src/lib/balanceReferences.ts`.
- Periodos: `src/lib/periods.ts` y `src/components/MonthlyPeriodSelector.tsx`.

## Grupos visibles

- Caja: Efectivo y Banco del local.
- Principal: Efectivo y Banco de la empresa.
- Socios: Mathias y Ricardo.
- Otras: Transferencias.
- Las cuentas personales no aparecen aqui; se consultan dentro de Liquidacion de salarios.

## Operaciones

- `Mover fondos`: Caja a Principal o Principal a Caja, mismo medio, sin resultado economico.
- `Movimiento de socio`: aporte o retiro real, con socio obligatorio.
- Si hay caja abierta, el traspaso se asocia automaticamente a esa recaudacion.
- Sin caja abierta, Encargado/Admin pueden mover Caja y Principal sin crear una caja ficticia.
- Un movimiento activo puede anularse con motivo y reversos si no pertenece a apertura, cierre o caja historica cerrada.

## Tabla y detalle

- Periodos: mes actual, mes anterior e historico por mes/ano.
- Columnas: fecha, tipo, detalle, usuario, debito, credito y saldo.
- Todas las columnas de datos son ordenables; Accion es la unica excepcion.
- El saldo es corrido e incluye el saldo anterior al rango.
- El detalle muestra cuenta, moneda, usuario, entidad origen y recaudacion cuando existe.
- Los movimientos nuevos guardan `localId`; los historicos se resuelven por caja u origen.

## Alcance

- Encargado ve solamente movimientos de sus locales.
- Administrador ve todas las cuentas disponibles.
- Hoy se opera solo Poseidon; `localId` preserva la frontera para la etapa multi-local futura.

## Validacion

1. Probar ambos sentidos y medios.
2. Probar disponible exacto y exceso sin mutacion.
3. Probar aporte/retiro de Mathias y Ricardo.
4. Anular un movimiento operativo y comprobar dos reversos.
5. Confirmar que apertura/cierre no se anulan.
6. Ordenar cada columna y abrir una recaudacion asociada.
