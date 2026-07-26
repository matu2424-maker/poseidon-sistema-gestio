# Poseidon - Matriz AppData a PostgreSQL

Ultima actualizacion: 2026-07-26

Estado: contrato preparatorio validable. No ejecuta una importacion remota ni
autoriza activar Supabase.

## Principio

El snapshot local no se guarda como una fila remota. Cada coleccion se
descompone en tablas relacionales y conserva su ID local en `legacy_id`.
PostgreSQL usa UUID internos y mantiene por separado los IDs visibles.

La implementacion ejecutable de las transformaciones no triviales vive en
`src/infrastructure/remote/appDataMigrationMapping.ts`.

## Colecciones

| Coleccion AppData | Tablas destino | Regla principal |
| --- | --- | --- |
| `users` | `profiles`, `user_locals` | `id` pasa a `legacy_id`; Auth crea el UUID. `password` local nunca se importa. |
| `staff` | `staff`, `staff_schedules` | Datos personales en `staff`; horario se separa por dia. Cargo usa mapeo cerrado y rechaza valores desconocidos. |
| `salarySettlements` | `salary_settlements` | Periodo pasa al primer dia del mes; la cuenta pagadora se toma del campo o de un asiento monetario univoco. |
| `salaryHistories` | `salary_history` | Conserva empleado, importes, fecha, motivo, ID y nombre historico del actor. |
| `salaryClosures` | `salary_closures`, `salary_closure_locals`, `salary_closure_employee_snapshots`, `salary_closure_settlement_snapshots` | La foto mensual se normaliza sin recalcularla; cada local del empleado debe integrar el cierre. |
| `clients` | `clients`, `attachments` | Foto y documento pasan a metadata/Storage privado; no se guarda un `dataUrl` operativo. |
| `periodicClosures` | `periodic_closures` y tablas `periodic_closure_*` | Totales permanecen en la foto; listas de IDs se convierten en relaciones. |
| `currentAccounts` | `current_accounts` | `entityId` se interpreta segun `kind`: local, empleado, socio o singleton. |
| `accountMovements` | `account_movements` | Asientos append-only; conserva origen, direccion, cuenta, local, caja, estado, actor y reversos. |
| `capitalMovements` | `capital_movements` | Compatibilidad legacy de lectura; no crea el modelo patrimonial nuevo. |
| `treasuryTransfers` | `treasury_transfers` | Traspaso Caja/Principal por el mismo medio y con `balanceId` opcional. |
| `partnerMovements` | `partner_movements` | Aporte/retiro patrimonial real con socio y medio explicitos. |
| `locals` | `locals`, `attachments` | El ID corto local se conserva como `legacy_id` y `visible_id`; imagenes pasan a Storage privado. |
| `machines` | `machines` | `localId=taller` se representa con `current_location_kind=TALLER` y local nulo. |
| `balances` | `cash_balances` | Conserva recaudacion, apertura, cierre, declarados y diferencias; aliases historicos de retiro se consolidan con control de conflicto. |
| `readings` | `machine_readings` | Mantiene contador anterior/actual, resultado, estado, actor y caja/local asociados. |
| `expenseCategories` | `expense_categories`, `expense_subcategories` | Cada subcategoria se convierte en fila vinculada a su categoria. |
| `expenses` | `expenses`, `attachments` | Cuenta pagadora obligatoria para operacion nueva; comprobante binario va a Storage privado. |
| `transfers` | `transfers` | Conserva caja, cliente opcional, comprobante, beneficiario, importe, cuenta, estado y actor. |
| `gifts` | `gifts`, `gift_clients` | Los clientes multiples se separan; los importes de efectivo y credito permanecen independientes. |
| `audit` | `audit_events`, `audit_event_locals` | Actor real, rol, funcion, entidad, valores, motivo y alcance por local son append-only. |
| `machineLocalHistory` | `machine_history` | Conserva snapshots visibles y eventos aunque la maquina ya no este vigente. |

## Transformaciones cerradas

### Locales

`Local.id` es actualmente el ID corto visible. Durante la importacion:

```text
legacy_id = Local.id
visible_id = Local.id
id = UUID nuevo
```

Un ID que no sea numerico de 1 a 9 digitos bloquea la importacion.

### Cargos

| Valor local aceptado | Enum remoto |
| --- | --- |
| `Cajero`, `Cajera`, `Cajera/o`, `Cajero/a` | `CAJERO_A` |
| `Encargado`, `Encargada`, `Encargado/a`, `Encargada/o` | `ENCARGADO_A` |
| `Mantenimiento` | `MANTENIMIENTO` |
| `Limpieza` | `LIMPIEZA` |

No existe valor por defecto silencioso.

### Cuenta pagadora salarial

1. Usar `paymentAccountId` cuando referencia una cuenta monetaria vigente.
2. Si falta, buscar un unico asiento `SUELDO`, `SALIDA`, `ACTIVO` del mismo
   `sourceId` sobre Caja o Principal.
3. Si no existe exactamente una cuenta monetaria candidata, registrar el
   problema y detener el corte. No inferir efectivo o banco.

La columna remota admite nulo solamente para preservar un historico sin
resolver durante la preparacion. Las RPC nuevas deben exigir cuenta pagadora.

### Retiros historicos de caja

Efectivo usa esta prioridad compatible:

```text
finalTransferToPrincipalCash
  -> finalWithdrawalCash
  -> withdrawal
  -> 0
```

Banco usa:

```text
finalTransferToPrincipalBank
  -> finalWithdrawalBank
  -> 0
```

Si dos aliases definidos tienen importes distintos, la migracion se bloquea y
reporta todos los campos. No se elige uno silenciosamente.

### Usuarios

El campo local `password` no se migra, no se registra en staging y no se usa
para crear credenciales. Cada usuario remoto debe vincularse a Supabase Auth
mediante alta/invitacion y recuperacion de acceso.

## Conciliacion obligatoria

Antes del corte se debe demostrar, por local y por cuenta:

- misma cantidad de entidades e historiales, salvo exclusiones documentadas;
- todos los `legacy_id` unicos y trazables al origen;
- mismo saldo por cuenta y moneda;
- mismo resultado economico por caja y periodo;
- mismas asociaciones de local, caja, empleado, cliente y maquina;
- mismo estado vigente y mismos reversos;
- cero aliases contradictorios;
- cero cuentas pagadoras salariales sin resolver;
- cero referencias huerfanas;
- auditoria con actor, rol real, funcion y alcance.

La importacion no esta aprobada mientras esta conciliacion no pueda ejecutarse
contra una base PostgreSQL vacia y repetirse de forma determinista.

## Evidencia local

- El manifiesto TypeScript cubre las 22 claves de `AppData` mediante
  `satisfies Record<keyof AppData, ...>`.
- Las pruebas caracterizan IDs locales, cargos, actor salarial, cuenta pagadora
  y aliases de retiro.
- El seed demo vigente no presenta incompatibilidades detectadas por el
  inspector.

Esto prueba el contrato local de transformacion. No reemplaza las pruebas SQL,
la importacion real ni la conciliacion remota.
