# Poseidon - Reglas contables

Ultima actualizacion: 2026-07-08

Este documento concentra las reglas economicas, financieras y de cuentas corrientes. Antes de modificar caja, cierre, diferencias, cuentas corrientes, salarios, gastos, transferencias, regalos, retiros o aportes, leer este archivo y el contexto del modulo afectado.

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
| Transferencia recibida | No | No | Entrada | No | Entrada | Caja, transferencias, cuentas |
| Retiro efectivo | No | Salida | No | No | No | Capital, cuentas |
| Retiro banco | No | No | Salida | No | No | Capital, cuentas |
| Aporte efectivo | No | Entrada | No | No | No | Capital, cuentas |
| Aporte banco | No | No | Entrada | No | No | Capital, cuentas |
| Diferencia efectivo positiva | No | Entrada | No | No | No | Diferencias, cierre, cuentas |
| Diferencia efectivo negativa | No | Salida | No | No | No | Diferencias, cierre, cuentas |
| Diferencia banco positiva | No | No | Entrada | No | No | Diferencias, cierre, cuentas |
| Diferencia banco negativa | No | No | Salida | No | No | Diferencias, cierre, cuentas |

## Caja diaria

- La caja abre con el saldo activo de `Local / Efectivo` y `Local / Banco`.
- La primera caja de un local exige declarar aporte inicial efectivo y banco.
- El saldo final declarado por el cajero define el saldo real para la siguiente apertura.
- El cierre registra usuario real y funcion usada.

## Cierre de caja

- Efectivo esperado se calcula desde el flujo de caja del balance.
- Banco esperado se calcula desde la cuenta banco del local y retiros finales de banco.
- Si hay diferencia, la observacion del cajero es obligatoria.
- Al cerrar, las diferencias crean movimientos `DIFERENCIA_CAJA` para que las cuentas del local reflejen el saldo declarado.
- Esos movimientos no cambian resultado economico.

## Diferencias

- `PENDIENTE`: requiere gestion.
- `VERIFICADA`: confirma que la diferencia existe y mantiene movimientos activos.
- `CORREGIDA`: permite editar efectivo/banco declarado, recalcula diferencias, actualiza saldo proximo y resincroniza movimientos.
- `ANULADA`: anula los movimientos de diferencia, revierte su impacto en cuentas, deja la diferencia efectiva en cero y ajusta los saldos proximos al valor esperado de la recaudacion.
- Estos cuatro son los unicos estados vigentes. `REVISADA`, `RESUELTA` y `AJUSTADA` son valores heredados y se normalizan al leer datos antiguos, conservando auditoria.
- Las diferencias deben conservar observacion original del cajero e historial auditado de gestion.

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

## Referencias obligatorias por modulo

- Caja/cierre: `docs/contextos/CODEX_CAJA.md`, `docs/modulos/02_caja_diaria.md`, `docs/modulos/05_cierre_caja.md`.
- Diferencias: `docs/contextos/CODEX_DIFERENCIAS.md`, `docs/modulos/06_diferencias_caja.md`.
- Cuentas corrientes: `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`, `docs/modulos/11_cuentas_corrientes.md`.
- Salarios: `docs/contextos/CODEX_SALARIOS.md`, `docs/modulos/10_clientes_personal_sueldos.md`.
- Auditoria: `docs/modulos/12_auditoria.md`.
