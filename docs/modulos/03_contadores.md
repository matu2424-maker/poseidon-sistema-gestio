# Modulo 03 - Contadores de maquinas

Codigo actual: `src/features/cashier/Counters.tsx`.

## Objetivo

Cargar IN/OUT de maquinas para calcular resultado de recaudacion.

## Reglas

- No hay guardado automatico.
- El usuario edita y luego presiona Guardar.
- IN actual debe ser igual o mayor al IN anterior.
- OUT actual debe ser igual o mayor al OUT anterior.
- Si hay error, fila y campos quedan marcados en rojo.
- Los contadores se actualizan definitivamente al cerrar caja.

## Calculo

```text
entrada = IN actual - IN anterior
salida = OUT actual - OUT anterior
resultado = entrada - salida
```

## Visual

- Mostrar cantidad de maquinas a recaudar.
- Mostrar pendientes.
- Entrada total en azul.
- Salida total en rojo.
- Resultado en verde si positivo y rojo si negativo.
