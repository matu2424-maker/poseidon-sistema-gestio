# Modulo 05 - Cierre de caja

Codigo actual: `src/features/cashier/CloseCash.tsx`.

El cierre atomico vive en `src/application/cash/closeCash.ts` y coordina retiros, balance, maquinas, historial, cuentas, diferencias y auditoria.

## Objetivo

Cerrar una caja diaria con control de efectivo, banco, maquinas y movimientos.

## Balance de control

Debe mostrar:

- efectivo inicial;
- banco inicial;
- resultado maquinas;
- gastos;
- salarios;
- regalos;
- transferencias;
- aportes efectivo;
- retiros efectivo;
- retiros transferencia;
- resultado final economico;
- salida total;
- efectivo esperado;
- dinero en banco esperado;
- efectivo declarado;
- dinero banco declarado.

## Resultado final

Resultado economico, no financiero:

```text
resultado final = resultado maquinas - gastos - salarios - regalos
```

## Salida total

```text
salida total = gastos + salarios + regalos
```

## Declaracion final

- Retiro final efectivo.
- Retiro final banco.
- Quien retira efectivo.
- Quien retira banco.
- Efectivo declarado final.
- Banco declarado final.
- Observacion por diferencia.

## Reglas

- Si retiro final efectivo es 0, selector queda deshabilitado y dice Sin retiros finales.
- Si retiro final banco es 0, selector queda deshabilitado y dice Sin retiros finales.
- Si hay diferencia efectivo o banco, observacion es obligatoria.
- Al cerrar, las diferencias crean movimientos en `Local / Efectivo` y/o `Local / Banco` para que la siguiente caja abra con el saldo real declarado.
- Las diferencias no cambian el resultado economico.
- Si hay maquinas pendientes sin observacion, no se puede cerrar.
- Antes de evaluar faltantes, retiros o diferencias, `efectivo esperado` debe coincidir exactamente con `Local / Efectivo`.
- Si ambos saldos no coinciden, la pantalla muestra un aviso de reconciliacion con caja, libro y delta; deshabilita `Cerrar caja` y no ofrece registrar un aporte ordinario.
- Una desconciliacion no crea diferencia, cierre, auditoria ni movimiento. Se corrige mediante migracion o ajuste tecnico auditado que explique la causa.
- Si el efectivo esperado es negativo, el cierre queda bloqueado antes de crear diferencias, auditoria o movimientos de cierre.
- Cuando el efectivo esperado negativo esta conciliado con el libro, la pantalla muestra el faltante, deshabilita `Cerrar caja` y ofrece ir a `Registrar aporte`.
- El aporte debe representar dinero real y cubrir el faltante; no se crea automaticamente ni modifica el resultado economico.
- Los errores aparecen en la misma pantalla.
- Al cerrar caja, va a Resumen de cajas.

## Presentacion

- Indicadores, desglose y declaracion final usan tipografia liviana; importes destacados usan `--font-data` con peso maximo `600`.
- Las tarjetas de control son compactas y no escalan la tipografia segun el ancho del viewport.
