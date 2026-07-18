# Modulo 03 - Contadores de maquinas

Codigo actual: `src/features/cashier/Counters.tsx`.

El guardado validado vive en `src/application/cash/saveReading.ts`; React captura/visualiza datos y presenta el resultado del comando.
La grilla completa se guarda mediante `saveReadingsCommand`: primero valida todas las lecturas y luego aplica contadores, resultado de maquinas y auditoria en una unica transaccion de estado. Un error en cualquier fila rechaza el lote completo.

## Objetivo

Cargar IN/OUT de maquinas para calcular resultado de recaudacion.

## Reglas

- No hay guardado automatico.
- El usuario edita y luego presiona Guardar.
- El mensaje de exito solo aparece si el lote completo fue aceptado.
- IN actual debe ser igual o mayor al IN anterior.
- OUT actual debe ser igual o mayor al OUT anterior.
- Si hay error, fila y campos quedan marcados en rojo.
- Los contadores se actualizan definitivamente al cerrar caja.
- La tabla permite ordenar por ID, maquina, estado, IN/OUT anterior, IN/OUT actual, resultado y observacion.
- No hay columna de accion en esta tabla; el guardado sigue siendo por boton general.

## Calculo

```text
entrada = IN actual - IN anterior
salida = OUT actual - OUT anterior
resultado = entrada - salida
```

## Visual

- La tabla, los totales y el boton general respetan la escala tipografica global `400/500/600`.
- Mostrar cantidad de maquinas a recaudar.
- Mostrar pendientes.
- Entrada total en azul.
- Salida total en rojo.
- Resultado en verde si positivo y rojo si negativo.
