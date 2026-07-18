# Poseidon - Reglas contables

Ultima actualizacion: 2026-07-17

Fuente canonica de reglas economicas, financieras y de cuentas corrientes. Antes de modificar caja, cierre, diferencias, cuentas, salarios, gastos, transferencias, regalos, aportes o retiros, leer este archivo y el contexto del modulo afectado.

## Modelo monetario vigente

Poseidon opera por ahora solamente en pesos uruguayos (`UYU`) y distingue cuatro cuentas monetarias:

- `Caja / Efectivo`: efectivo asignado a la operacion diaria del local.
- `Caja / Banco`: dinero bancario asignado a la operacion diaria del local.
- `Principal / Efectivo`: efectivo central disponible para pagos administrativos y movimientos patrimoniales.
- `Principal / Banco`: dinero bancario central disponible para pagos administrativos y movimientos patrimoniales.

Ademas existen:

- `Socio / Mathias` y `Socio / Ricardo`: cuentas patrimoniales; no son dinero disponible.
- cuentas personales de empleados;
- cuenta informativa de transferencias.

No existe cuenta, rol ni concepto de custodia. Mathias y Ricardo se seleccionan solamente cuando hay un aporte o retiro real de socio.

## Regla madre

```text
resultado economico = resultado maquinas - gastos - salarios - regalos
```

No forman parte del resultado economico:

- transferencias entre efectivo y banco de Caja;
- traspasos entre Caja y Principal;
- aportes o retiros de socios;
- efectivo o banco inicial;
- diferencias de efectivo o banco;
- reconciliaciones tecnicas y reversos.

## Matriz de impacto

| Evento | Resultado | Caja | Principal | Socio / otra cuenta |
| --- | ---: | --- | --- | --- |
| Maquinas positivo | Suma | Entra efectivo | No cambia | No cambia |
| Maquinas negativo | Resta | Sale efectivo | No cambia | No cambia |
| Gasto de Cajero | Resta | Sale efectivo | No cambia | No cambia |
| Gasto de Encargado/Admin | Resta | No cambia | Sale de efectivo o banco elegido | No cambia |
| Regalo | Resta | Sale efectivo | No cambia | Cliente queda referenciado |
| Salario/adelanto de Cajero | Segun concepto | Sale efectivo | No cambia | Cuenta del empleado |
| Liquidacion de Encargado/Admin | Segun concepto | No cambia | Sale de efectivo o banco elegido | Cuenta del empleado |
| Descuento salarial | Ajusta salario | No cambia | No cambia | Reduce pendiente del empleado |
| Transferencia de recaudacion | No | Efectivo a banco | No cambia | Cuenta Transferencias |
| Caja a Principal | No | Sale del medio elegido | Entra al mismo medio | No cambia |
| Principal a Caja | No | Entra al medio elegido | Sale del mismo medio | No cambia |
| Aporte de socio | No | No cambia | Entra al medio elegido | Aumenta cuenta del socio |
| Retiro de socio | No | No cambia | Sale del medio elegido | Disminuye cuenta del socio |
| Diferencia positiva | No | Entra al medio declarado | No cambia | Queda auditada |
| Diferencia negativa | No | Sale del medio declarado | No cambia | Queda auditada |

## Disponibilidad y no negatividad

- Toda salida se valida contra la cuenta monetaria que realmente paga.
- Una salida igual al disponible se acepta.
- Una salida superior se rechaza antes de crear IDs, entidades, asientos o auditoria.
- `Caja / Efectivo`, `Caja / Banco`, `Principal / Efectivo` y `Principal / Banco` no pueden quedar por debajo de cero por una nueva salida.
- Un resultado de maquinas negativo puede dejar `Caja / Efectivo` negativo porque representa un hecho real. En ese caso se bloquean nuevas salidas y el cierre hasta registrar un aporte real de socio a Principal y un traspaso Principal a Caja.
- Las anulaciones y correcciones restitutivas se hacen con reversos append-only y no borran el movimiento ni la entidad original. Gastos, regalos y demas entidades anulables conservan estado `ANULADO` e historial consultable.

## Caja diaria

- Solo puede existir una caja abierta por local.
- La caja es una instancia operativa y de auditoria sobre `Caja / Efectivo` y `Caja / Banco`; no crea dinero separado.
- El Cajero opera contadores, gastos, transferencias, regalos, salarios y traspasos Caja/Principal desde una caja abierta.
- Encargado y Administrador no registran gastos o liquidaciones directamente sobre Caja desde su funcion administrativa. Para operar como Cajero deben cambiar expresamente a funcion `CAJERO`.
- Encargado y Administrador pueden mover Caja/Principal desde Cuentas corrientes. Si existe caja abierta, el traspaso debe asociarse obligatoriamente a ese `balanceId` para actualizar la misma recaudacion.
- Sin caja abierta, Encargado y Administrador pueden mover saldos entre Caja y Principal sin crear una recaudacion ficticia.
- Durante una caja abierta debe cumplirse `efectivo esperado === Caja / Efectivo`. Un delta es una inconsistencia tecnica, no una diferencia declarada.
- Si ambos valores no coinciden, se bloquean contadores, movimientos de Caja, salarios de Caja, traspasos asociados y cierre. Un traspaso comun no repara el delta.

## Primera apertura y aperturas siguientes

- La primera apertura exige un aporte real de Mathias o Ricardo por cada medio con importe mayor a cero.
- Internamente se registran dos pasos: `Socio -> Principal` y `Principal -> Caja`.
- La apertura no cambia resultado economico.
- Las aperturas siguientes usan exactamente los saldos vigentes de `Caja / Efectivo` y `Caja / Banco`.
- No se permite declarar un saldo inicial distinto al libro.
- Los traspasos de apertura son automaticos e inmutables.

## Gastos y salarios administrativos

- El Encargado y el Administrador pagan gastos desde `Principal / Efectivo` o `Principal / Banco`.
- Las liquidaciones administrativas se pagan desde una cuenta Principal y no llevan `balanceId` de caja.
- Estos movimientos pueden registrarse aunque no exista una caja abierta.
- Un gasto o salario pagado desde Principal modifica resultado economico, la cuenta Principal elegida y su cuenta auxiliar correspondiente, pero no modifica el efectivo esperado de la caja abierta.
- Los gastos se imputan al periodo por fecha real del movimiento.
- En un cierre mensual, los salarios administrativos se imputan por `period` trabajado. En cierres semanales, quincenales o personalizados se consideran por fecha real del movimiento para evitar duplicarlos entre cortes.

## Traspasos Caja / Principal

- `RETIRO_CAJA`: Caja a Principal, siempre en el mismo medio.
- `APORTE_CAJA`: Principal a Caja, siempre en el mismo medio.
- Son movimientos internos de dos piernas; la liquidez total no cambia.
- No se selecciona socio ni persona.
- Un traspaso operativo puede anularse mediante reversos si no pertenece a una caja cerrada.
- Los traspasos automaticos de apertura y cierre forman parte de la foto auditada y no se anulan.
- El alta legacy de `MovimientoCapital` esta deshabilitada. Los objetos antiguos se conservan solo para lectura, migracion y anulacion compatible.

## Socios

- Solo existen `MATHIAS` y `RICARDO`.
- `APORTE_SOCIO`: aumenta Principal y la cuenta patrimonial del socio.
- `RETIRO_SOCIO`: disminuye Principal y la cuenta patrimonial del socio.
- El retiro se limita por fondos disponibles en Principal; la cuenta patrimonial puede expresar saldo deudor o acreedor y no forma parte de la liquidez.
- Aportes y retiros patrimoniales no son ganancia ni perdida.
- No se usa el nombre del socio en traspasos internos Caja/Principal.

## Cierre de caja

- El cierre se ejecuta solamente desde funcion `CAJERO` y registra usuario real, rol real, funcion, local y recaudacion.
- El cajero puede declarar un traspaso final de Caja a Principal en efectivo y/o banco.
- Primero se calcula el saldo esperado antes del traspaso; luego se resta el traspaso y se compara el remanente con lo declarado.
- `diferencia = declarado - esperado posterior al traspaso`.
- No se selecciona responsable para el traspaso final.
- El remanente declarado queda en Caja y sera la base de la apertura siguiente.
- Los importes deben ser finitos y no negativos.
- El traspaso final no puede superar el saldo disponible del medio.
- Si el efectivo esperado es negativo, se muestra un error especifico y no se crea cierre, diferencia, auditoria ni ajuste economico.
- Si `efectivo esperado !== Caja / Efectivo`, se devuelve primero el error tecnico de reconciliacion.
- Antes del balance de control se muestran los traspasos asociados que hizo el Encargado durante esa recaudacion; es informacion auditada y no genera asientos adicionales.

## Diferencias

- `PENDIENTE`: requiere gestion.
- `VERIFICADA`: confirma que la diferencia existe y mantiene sus asientos.
- `CORREGIDA`: actualiza lo declarado y agrega solamente el delta auditado necesario.
- `ANULADA`: agrega un contramovimiento que revierte el impacto vigente.
- Las diferencias mueven `Caja / Efectivo` o `Caja / Banco` para reflejar el saldo real, pero no cambian resultado economico.
- La gestion se bloquea si existe otra caja abierta del mismo local.
- No se reescriben cajas posteriores ni saldos iniciales historicos.

## Libro y auditoria

- El libro es append-only: no se borran asientos ya contabilizados.
- Una anulacion genera movimientos opuestos con `reversalOf`.
- Cada alta, correccion o anulacion guarda usuario, rol real, funcion, fecha/hora, local, entidad, cuenta y referencias disponibles.
- Los asientos nuevos guardan `localId`; los historicos lo reconstruyen por `balanceId` o entidad origen cuando es posible.
- Ninguna normalizacion de lectura inventa asientos financieros en un snapshot vigente.

## Migraciones financieras

- El esquema actual es `5`.
- Esquema 3 a 4: reconstruye la salida historica de efectivo de transferencias y agrega un puente tecnico solamente cuando la causalidad explica exactamente el delta.
- Esquema 4 a 5: agrega contrapartida en Principal para retiros legacy de Caja y registro patrimonial para aportes legacy.
- Un retiro legacy se interpreta como Caja a Principal; la persona historica se conserva como dato del objeto antiguo, no se transforma en retiro de socio.
- Las migraciones conservan Caja y resultado economico, son idempotentes, append-only y auditadas por Sistema.

## Salarios

- El salario base nace de Personal y su historial efectivo.
- Salario pagado no puede superar salario base.
- Salario pagado + adelantos no puede superar salario base.
- Salario pagado + adelantos + descuentos no puede superar salario base.
- `Pagado / Entregado` = salario + adelantos + premio/gratificacion + horas extras + bonos.
- `Cubierto base` = salario + adelantos + descuentos.
- `Pendiente` = salario base - cubierto base.
- Una correccion sobre la misma cuenta valida solo el incremento neto; un cambio de cuenta valida el importe completo en la cuenta nueva.
- El cierre salarial mensual es una foto inmutable. Las modificaciones posteriores requieren una revision correctiva enlazada y auditada.
- No se cierra un periodo salarial si contiene un pago de Caja vinculado a una caja todavia abierta.

## Cierre periodico

- Consolida resultado de maquinas, gastos, salarios y regalos sin sumar traspasos internos ni movimientos de socios al resultado.
- Incluye gastos y liquidaciones de Principal aunque no tengan `balanceId`.
- Guarda IDs de cajas, gastos Principal, salarios Principal, traspasos y movimientos de socios incluidos.
- La foto guardada no se recalcula retroactivamente; una anulacion del cierre conserva historial.

## Referencias por modulo

- Caja: `docs/contextos/CODEX_NUCLEO_CAJA.md`, `docs/modulos/02_caja_diaria.md`, `docs/modulos/05_cierre_caja.md`.
- Movimientos: `docs/modulos/04_movimientos_operativos.md`.
- Diferencias: `docs/contextos/CODEX_DIFERENCIAS.md`, `docs/modulos/06_diferencias_caja.md`.
- Cuentas: `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`, `docs/modulos/11_cuentas_corrientes.md`.
- Salarios: `docs/contextos/CODEX_SALARIOS.md`, `docs/modulos/10_clientes_personal_sueldos.md`.
