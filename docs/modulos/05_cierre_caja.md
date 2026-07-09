# Modulo 05 - Cierre de caja

Codigo actual: `src/features/cashier/CloseCash.tsx`.

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
- Los errores aparecen en la misma pantalla.
- Al cerrar caja, va a Resumen de cajas.
