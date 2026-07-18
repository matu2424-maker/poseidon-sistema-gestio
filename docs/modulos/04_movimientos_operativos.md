# Modulo 04 - Movimientos operativos y tesoreria

## Propietarios tecnicos

- Caja: `src/application/movements/operatingMovementCommands.ts`.
- Traspasos y socios: `src/application/treasury/treasuryCommands.ts`.
- Gastos desde Principal: `src/application/expenses/principalExpenseCommands.ts`.
- Salarios: `src/application/salaries/salarySettlementCommands.ts`.

Los comandos validan actor, rol real, funcion, usuario, local, cuenta, fondos, asociaciones, auditoria y atomicidad. React solo presenta formularios y resultados.

## Disponibilidad de fondos

- Una salida igual al saldo disponible se acepta.
- Una salida que dejaria la cuenta negativa se rechaza antes de crear entidad, asiento o auditoria.
- Caja y Principal se validan por cuenta y medio.
- Una anulacion tambien valida la cuenta que debe devolver el dinero.
- Los contramovimientos preservan historial.
- No existe un estado automatico `PENDIENTE` por falta de fondos.

## Gastos del Cajero

- Requieren caja abierta y funcion Cajero.
- Salen de `Caja / Efectivo` y usan el `balanceId` activo.
- Obligatorios: categoria, subcategoria y monto.
- Opcionales: descripcion y comprobante.
- El comprobante guarda solamente nombre/tipo.
- Se pueden anular mientras la caja sigue abierta.
- La tabla ordena todas sus columnas de datos.

## Gastos de Encargado/Administrador

- Se cargan desde `/control/gastos`.
- Se pagan con `Principal / Efectivo` o `Principal / Banco`.
- No requieren caja abierta y no usan `balanceId`.
- No modifican el efectivo esperado de una recaudacion.
- Si existe una caja abierta, sigue siendo independiente salvo que el usuario haga un traspaso explicito Principal -> Caja.
- Conservan local contable, usuario, cuenta, comprobante, revision y auditoria.
- Se pueden revisar, observar o anular sin borrar el gasto original.

## Transferencias del Cajero

- Requieren caja abierta.
- Salen de `Caja / Efectivo`, entran en `Caja / Banco` y conservan la cuenta informativa de transferencias.
- No cambian el resultado economico.
- Pueden asociarse a cliente.
- Se anulan con contramovimientos y auditoria.

## Regalos

- En esta etapa siempre salen de `Caja / Efectivo`.
- Obligatorios: cliente, referencia y monto.
- Detalle opcional.
- El selector de clientes permite buscar y elegir varios.
- Integran el resultado economico como salida.

## Salarios

- Desde Cajero: `Caja / Efectivo`, caja abierta y `balanceId`.
- Desde Encargado/Administrador: `Principal / Efectivo` o `Principal / Banco`, sin `balanceId`.
- El pago se imputa al periodo trabajado, independientemente de la fecha o cuenta de pago.
- Conceptos de Cajero: Salario y Adelanto.
- Conceptos administrativos: Salario, Adelanto, Premio/Gratificacion, Horas extras, Aguinaldo, Salario vacacional y Descuento.
- Descuento no mueve dinero.
- Una correccion con salida valida solamente el incremento neto en la misma cuenta.
- El periodo cerrado solo se modifica mediante revision correctiva.

## Caja y Principal

- Ruta Cajero: `/caja/fondos`.
- Tesoreria administrativa: `/cuentas-corrientes`.
- `Caja a Principal` mueve fondos del mismo medio hacia Principal.
- `Principal a Caja` mueve fondos del mismo medio hacia Caja.
- No cambia resultado economico ni patrimonio.
- Si hay caja abierta, el traspaso debe asociarse a su `balanceId`.
- Cajero necesita una caja abierta.
- Los traspasos operativos pueden anularse solo mientras su caja asociada siga abierta y haya fondos para el reverso.
- Los traspasos automaticos de apertura/cierre son inmutables.

## Socios

- Solo Mathias y Ricardo.
- Aporte socio: socio -> Principal.
- Retiro socio: Principal -> socio.
- Puede ser Efectivo o Banco.
- No cambia resultado economico.
- No existe custodia ni receptor para un traspaso interno.
- Encargado/Administrador operan socios desde Cuentas corrientes.
- La cuenta patrimonial del socio puede mostrar posicion deudora/acreedora; Principal nunca puede quedar negativo por una salida nueva.

## Legacy

- El alta de `CapitalMovement` heredado esta deshabilitada.
- Los objetos anteriores siguen disponibles para lectura, migracion y anulacion compatible.
- Un `RETIRO` legacy se interpreta como Caja -> Principal, no como retiro patrimonial de socio.
