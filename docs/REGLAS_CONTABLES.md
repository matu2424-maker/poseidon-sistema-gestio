# Poseidon - Reglas contables

Ultima actualizacion: 2026-07-17

Esta es la fuente canonica de reglas economicas, financieras y de cuentas corrientes. Antes de modificar caja, cierre, diferencias, cuentas corrientes, salarios, gastos, transferencias, regalos, retiros o aportes, leer este archivo y el contexto del modulo afectado.

## Regla madre

```text
resultado economico = resultado maquinas - gastos - salarios - regalos
```

No forman parte del resultado economico:

- transferencias;
- aportes de capital;
- retiros;
- efectivo inicial;
- banco inicial;
- diferencias de efectivo;
- diferencias de banco.

## Matriz de impacto

| Evento | Resultado economico | Local / Efectivo | Local / Banco | Cuenta personal | Cuenta transferencias | Referencias |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Resultado maquinas positivo | Suma | Entrada | No | No | No | Caja, contadores, cuentas |
| Resultado maquinas negativo | Resta | Salida | No | No | No | Caja, contadores, cuentas |
| Gasto | Resta | Salida | No | No | No | Movimientos, cuentas, auditoria |
| Regalo | Resta | Salida | No | No | No | Movimientos, clientes, cuentas |
| Salario pagado desde caja | Resta | Salida | No | Salida | No | Caja, salarios, cuentas |
| Adelanto desde caja | No suma al total salarial | Salida | No | Salida | No | Caja, salarios, cuentas |
| Descuento salarial | No es salida de caja | No | No | Ajusta pendiente | No | Salarios |
| Transferencia registrada | No | Salida | Entrada | No | Entrada | Caja, transferencias, cuentas |
| Retiro efectivo | No | Salida | No | No | No | Capital, cuentas |
| Retiro banco | No | No | Salida | No | No | Capital, cuentas |
| Aporte efectivo | No | Entrada | No | No | No | Capital, cuentas |
| Aporte banco | No | No | Entrada | No | No | Capital, cuentas |
| Diferencia efectivo positiva | No | Entrada | No | No | No | Diferencias, cierre, cuentas |
| Diferencia efectivo negativa | No | Salida | No | No | No | Diferencias, cierre, cuentas |
| Diferencia banco positiva | No | No | Entrada | No | No | Diferencias, cierre, cuentas |
| Diferencia banco negativa | No | No | Salida | No | No | Diferencias, cierre, cuentas |
| Reconciliacion tecnica de migracion | No | Ajuste tecnico auditado | No | No | No | Migracion versionada, cuentas, auditoria |

## Caja diaria

- Solo puede existir una caja abierta por local, independientemente de la fecha operativa.
- La caja abierta es una instancia operativa y de auditoria sobre las cuentas corrientes del local; no es dinero separado ni propiedad exclusiva del cajero que la abrio.
- La caja abre con el saldo activo de `Local / Efectivo` y `Local / Banco`.
- Una transferencia mueve el importe de `Local / Efectivo` a `Local / Banco`; no cambia el resultado economico y tambien queda reflejada en la cuenta de transferencias.
- La primera caja de un local exige declarar aporte inicial efectivo y banco.
- El saldo final declarado por el cajero define el saldo real para la siguiente apertura.
- Mientras una caja esta abierta, su `efectivo esperado` y el saldo activo `Local / Efectivo` deben ser exactamente iguales. Son dos vistas del mismo efectivo y no pueden evolucionar por separado.
- Una caja posterior solo abre si los saldos iniciales recibidos coinciden exactamente con `Local / Efectivo` y `Local / Banco`; el comando deriva del historial si es realmente la primera apertura.
- El cierre registra usuario real y funcion usada.
- Mientras la caja permanece abierta no se mueve ni asigna una maquina del local, no se ajustan sus contadores administrativos y no se cierra el local.

## Disponibilidad de efectivo

- La unica fuente para autorizar una nueva salida en efectivo es el saldo activo de la cuenta `Local / Efectivo` del local correspondiente.
- Antes de crear IDs, entidades, movimientos o auditoria, el comando calcula si la salida dejaria ese saldo por debajo de cero.
- Una salida igual al disponible se acepta. Una salida superior se rechaza sin mutar el snapshot.
- Esta regla se aplica a gastos, transferencias desde efectivo, regalos en efectivo, retiros operativos en efectivo y pagos salariales.
- Un aporte real en efectivo aumenta la disponibilidad. El usuario tambien puede elegir otro medio cuando la operacion lo permita o cancelar la operacion; no existe un nuevo estado `PENDIENTE` para forzarla.
- En una correccion salarial del mismo local se valida solo el incremento neto de efectivo respecto del pago reemplazado. Una reduccion o anulacion sigue permitida.
- Las anulaciones y reversos no se bloquean porque restituyen o corrigen saldo y conservan el historial append-only.
- Un resultado de maquinas negativo se registra normalmente. Si deja `Local / Efectivo` negativo, bloquea nuevas salidas y el cierre hasta que un aporte real cubra el faltante.
- Si `efectivo esperado` y `Local / Efectivo` ya estan desconciliados, se bloquean contadores, movimientos, salarios y cierre antes de mutar. Un aporte ordinario tambien se bloquea porque moveria ambos saldos por igual y no corregiria el delta tecnico.
- Una anulacion o correccion historica con impacto en efectivo no se ejecuta mientras haya otra caja abierta del mismo local. Los reversos de la caja abierta siguen permitidos.
- El saldo banco es independiente y queda fuera de esta validacion de efectivo.

## Actores sobre una caja abierta

- Cajero y Encargado autorizado operan sobre el mismo `balanceId`, `Local / Efectivo` y `Local / Banco`; no se crea una segunda caja ni un saldo paralelo por usuario.
- El Encargado, manteniendo funcion `ENCARGADO`, puede registrar gastos y retiros/aportes solo en una caja `EN_PROCESO` de un local incluido en sus `localIds`.
- El Encargado no recibe por esta excepcion permiso para apertura, contadores, transferencias, regalos, pagos salariales ni cierre. Esas operaciones conservan funcion `CAJERO`.
- Un gasto del Encargado resta resultado economico y `Local / Efectivo` igual que un gasto del Cajero. Un aporte o retiro conserva su naturaleza financiera y no modifica resultado economico.
- Cada alta o anulacion guarda el usuario real, rol real, funcion activa, fecha/hora, `balanceId`, `localId`, cuenta y auditoria correspondientes.
- Si el efectivo no alcanza, el comando rechaza la operacion completa. No crea cuotas, deudas, pagos parciales ni movimientos pendientes; se requiere un aporte real previo, otro medio permitido o cancelar.
- En almacenamiento local, una pestana pasiva y sin mutaciones propias adopta los cambios persistidos por otra pestana. Una pestana con cambios pendientes conserva el control optimista y no puede sobrescribir el snapshot vigente.
- Esta sincronizacion local cubre pestanas del mismo navegador. Operacion simultanea entre equipos o navegadores requiere el backend transaccional pendiente y no se considera resuelta por `localStorage`.

## Libro de movimientos

- Los movimientos contables persistidos no se reescriben durante la normalizacion.
- Una anulacion posterior genera un contramovimiento activo de direccion opuesta; no borra ni modifica el movimiento original.
- Una correccion de diferencia agrega solo el delta necesario para alcanzar el nuevo saldo auditado.
- Los ajustes de una misma diferencia/medio son append-only: cada delta tiene ID propio y enlaza el ajuste anterior mediante `previousAdjustmentId`.
- Operaciones aun no cerradas pueden quitarse antes de contabilizarse definitivamente cuando la regla funcional lo permite.

## Migraciones financieras

- El esquema actual del snapshot es `4`. `src/data/migrateData.ts` aplica migraciones incrementales antes de entregar los datos al runtime; `src/data/normalizeData.ts` completa forma y compatibilidad estructural.
- Un snapshot que ya esta en la version actual no reconstruye silenciosamente asientos financieros faltantes durante una normalizacion ordinaria.
- La migracion de esquema 3 a 4 reconstruye la salida de efectivo historica de transferencias que antes solo impactaban banco y cuenta Transferencias.
- Si esa reconstruccion explica exactamente el desacople con la ultima frontera operativa, se agrega un unico movimiento `MIGRACION / RECONCILIACION_MIGRACION`, determinista, append-only y auditado por `Sistema`.
- El puente tecnico conserva el saldo ya aceptado por la caja. No representa aporte, retiro, diferencia de caja, ingreso, gasto ni resultado economico, y no modifica banco.
- La reparacion automatica exige causalidad exacta: el delta debe ser finito, positivo y coincidir con la suma de las transferencias historicas reconstruidas. Si no puede demostrarse, no se inventa un ajuste; el sistema conserva los datos, muestra la desconciliacion y bloquea la operativa hasta una correccion tecnica auditada.
- La migracion es idempotente: repetir la hidratacion no duplica ni el movimiento ni la auditoria.

## Cierre de caja

- Efectivo esperado se calcula desde el flujo de caja del balance.
- Banco esperado se calcula desde la cuenta banco del local y retiros finales de banco.
- Si hay diferencia, la observacion del cajero es obligatoria.
- Al cerrar, las diferencias crean movimientos `DIFERENCIA_CAJA` para que las cuentas del local reflejen el saldo declarado.
- Esos movimientos no cambian resultado economico.
- Los importes directos y derivados del cierre deben ser numeros finitos; `NaN` e infinitos se rechazan antes de persistir.
- Antes de evaluar faltantes, retiros o diferencias, el cierre exige que `efectivo esperado` coincida con `Local / Efectivo`. Si no coincide, devuelve un error de reconciliacion tecnica y no crea diferencia, cierre, auditoria ni movimiento.
- Si el efectivo esperado es negativo, el cierre devuelve primero un error especifico que exige cubrir el faltante con un aporte real. No crea diferencia, cierre, auditoria ni ajuste economico.

## Diferencias

- `PENDIENTE`: requiere gestion.
- `VERIFICADA`: confirma que la diferencia existe y mantiene movimientos activos.
- `CORREGIDA`: permite editar efectivo/banco declarado, recalcula diferencias, actualiza los campos de base de la recaudacion objetivo y agrega el ajuste contable necesario sin borrar el movimiento anterior.
- `ANULADA`: conserva el asiento original y agrega un contramovimiento activo por el delta que revierte su impacto; deja la diferencia efectiva en cero y ajusta los campos de base de la recaudacion objetivo al valor esperado.
- Matriz obligatoria: `PENDIENTE -> VERIFICADA/CORREGIDA/ANULADA`; `VERIFICADA -> CORREGIDA/ANULADA`; `CORREGIDA -> CORREGIDA/ANULADA`; `ANULADA` no admite nuevas acciones.
- Estos cuatro son los unicos estados vigentes. `REVISADA`, `RESUELTA` y `AJUSTADA` son valores heredados y se normalizan al leer datos antiguos, conservando auditoria.
- Las diferencias deben conservar observacion original del cajero e historial auditado de gestion.
- La gestion se bloquea si hay una caja abierta del mismo local. Una caja abierta de otro local no bloquea.
- Una correccion o anulacion historica no modifica cajas posteriores ni `initialFund`/`initialBankFund`; el delta entra al libro con fecha de gestion.
- Todo importe de cierre o correccion debe ser finito. Ausencia, `NaN` e infinitos son errores y no equivalen a cero.

## Salarios

- El salario base nace de Personal y su historial salarial.
- El pago de salario desde cajero sale de caja por `balanceId`.
- La liquidacion/cuenta personal se imputa por `period` trabajado.
- Salario pagado no puede superar salario base.
- Salario pagado + adelantos no puede superar salario base.
- Salario pagado + adelantos + descuentos no puede superar salario base.
- Descuento reduce pendiente/base cubierta, pero no es dinero entregado ni salida de caja.
- `Pagado / Entregado` = salario pagado + adelantos + premio/gratificacion + horas extras + bonos.
- `Cubierto base` = salario pagado + adelantos + descuentos.
- `Pendiente` = salario base - cubierto base.
- El periodo trabajado usa formato `AAAA-MM` y solo admite meses reales de `01` a `12`.
- El cierre salarial mensual es definitivo: congela por empleado salario base, conceptos, total, cubierto, pagado, pendiente y el detalle de liquidaciones activas.
- Un periodo con cierre `CERRADO` no admite altas, ediciones ni anulaciones ordinarias desde caja o liquidacion administrativa.
- No se cierra un periodo si contiene un pago salarial asociado a una caja todavia abierta.
- Una correccion posterior exige una revision `CORRECTIVO` abierta por encargado o administrador, con motivo obligatorio y enlazada al ultimo cierre vigente.
- Solo puede existir una correccion abierta por periodo. Toda alta, reemplazo o anulacion realizada durante ella guarda su `correctionClosureId`.
- Al cerrar la correccion se genera una nueva revision inmutable; el cierre anterior y su foto no se modifican.
- Una correccion sin movimientos puede cancelarse con auditoria. Si ya tiene movimientos, debe completarse y cerrarse.
- La base historica considera fecha de ingreso y baja: una persona actualmente inactiva conserva su salario en los periodos que efectivamente trabajo.

## Referencias obligatorias por modulo

- Caja/cierre: `docs/contextos/CODEX_NUCLEO_CAJA.md`, `docs/modulos/02_caja_diaria.md`, `docs/modulos/05_cierre_caja.md`.
- Diferencias: `docs/contextos/CODEX_DIFERENCIAS.md`, `docs/modulos/06_diferencias_caja.md`.
- Cuentas corrientes: `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`, `docs/modulos/11_cuentas_corrientes.md`.
- Salarios: `docs/contextos/CODEX_SALARIOS.md`, `docs/modulos/10_clientes_personal_sueldos.md`.
- Auditoria: `docs/modulos/12_auditoria.md`.
