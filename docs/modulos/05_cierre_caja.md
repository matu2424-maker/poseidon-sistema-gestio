# Modulo 05 - Cierre de caja

Interfaz: `src/features/cashier/CloseCash.tsx`.

Comando atomico: `src/application/cash/closeCash.ts`.

## Objetivo

Cerrar una recaudacion, transferir fondos a Principal cuando corresponda, comparar el remanente esperado con lo declarado y conservar una foto auditada.

## Balance de control

Muestra:

- efectivo y banco inicial;
- resultado de maquinas;
- gastos, salarios y regalos de Caja;
- transferencias de Caja;
- traspasos Principal -> Caja;
- traspasos Caja -> Principal;
- resultado economico;
- salida total operativa;
- efectivo esperado;
- banco esperado;
- efectivo y banco declarados.

Formula economica:

```text
resultado economico = resultado maquinas - gastos - salarios - regalos
```

```text
salida total = gastos + salarios + regalos
```

Los traspasos internos no integran esas formulas.

## Declaracion final

- Traspaso a `Principal / Efectivo`.
- Traspaso a `Principal / Banco`.
- Efectivo declarado final que permanece en Caja.
- Banco declarado final que permanece en Caja.
- Observacion obligatoria si existe diferencia.

No se selecciona Mathias ni Ricardo. El cierre mueve fondos entre cuentas de la empresa; no crea un retiro de socio.

## Calculo

```text
efectivo esperado final = efectivo esperado antes del cierre - traspaso a Principal/Efectivo
banco esperado final = Caja/Banco antes del cierre - traspaso a Principal/Banco
diferencia efectivo = efectivo declarado - efectivo esperado final
diferencia banco = banco declarado - banco esperado final
```

- El remanente declarado queda en Caja y abre la proxima recaudacion.
- El importe transferido queda en Principal.
- Una diferencia crea movimientos de control sobre Caja para reflejar lo declarado.
- La diferencia no cambia el resultado economico.

## Bloqueos

- Funcion distinta de Cajero.
- Funcion Cajero incompatible con el rol real o usuario inactivo.
- Caja inexistente o ya cerrada.
- Usuario/local no autorizado.
- Maquinas pendientes sin observacion.
- Importe no finito o negativo.
- Traspaso mayor al saldo disponible.
- Efectivo esperado negativo.
- Desacople entre calculo de caja y `Caja / Efectivo`.
- Diferencia sin observacion.

El efectivo esperado negativo se resuelve con fondos reales en Principal y un traspaso Principal -> Caja. Un desacople tecnico requiere reconciliacion auditada; un traspaso comun no lo corrige.

Todo rechazo ocurre antes de cierre, diferencia, asientos o auditoria.

## Movimientos administrativos

- Los gastos o salarios pagados desde Principal no forman parte de la recaudacion ni del efectivo esperado.
- Los traspasos Caja/Principal del mismo `balanceId` si aparecen en el balance de control.
- `ManagerCashActivity` conserva la lectura de intervenciones historicas asociadas por `balanceId`; los movimientos nuevos de Principal no se presentan como movimientos de Caja.

## Resultado

- Balance pasa a `CERRADO`.
- Se guardan usuario y funcion de cierre.
- Se crean traspasos `CIERRE` inmutables si los montos son mayores a cero.
- Se actualizan maquinas e historial de contadores.
- Se crean diferencias y sus movimientos cuando corresponda.
- Se navega a `/recaudaciones`.

## Pruebas clave

- Cierre sin diferencia.
- Cierre con traspasos en ambos medios.
- Reapertura hereda solo el remanente de Caja.
- Traspaso excesivo se rechaza atomicamente.
- Efectivo negativo y desacople tecnico se rechazan con errores distintos.
- Principal y resultado economico permanecen coherentes.

## Backend remoto preparatorio

`poseidon_close_cash` bloquea pendientes, desacoples y efectivo esperado
negativo antes de mutar. En una unica transaccion guarda la foto, traspasos,
diferencias, contadores, historial, libro, auditoria e idempotencia; ninguna
diferencia modifica el resultado economico. El modo remoto continua desactivado.
