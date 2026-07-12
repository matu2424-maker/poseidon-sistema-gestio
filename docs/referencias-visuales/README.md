# Referencias visuales aprobadas

Ultima actualizacion: 2026-07-11

Estas capturas son evidencia de patrones aprobados de Poseidon. No son especificaciones pixel-perfect y no autorizan copiar una pantalla completa en otro modulo.

## Diferencias de caja

- `diferencias-desktop-1920x1080.png`: escritorio con resumen compacto, filtros, tabla y jerarquia de acciones.
- `diferencias-mobile-390x844.png`: adaptacion movil con superficies en una columna y overflow contenido en la tabla.

Aspectos aprobados:

- identidad azul de Poseidon con superficies neutras;
- selector mensual compacto;
- resumen del periodo dentro de una sola superficie;
- metricas `4 -> 2 -> 1` segun ancho;
- tabla principal con encabezado claro;
- `Gestionar` primario y `Ver detalle` secundario;
- modal con secciones planas.

## Uso por el custodio

- Consultar una captura solo si la tarea comparte el mismo tipo de patron.
- Comparar jerarquia, densidad, alineacion y responsive; no copiar datos ni textos.
- Si codigo y captura divergen, prevalecen `docs/REGLAS_VISUALES.md` y `docs/SISTEMA_VISUAL_POSEIDON.md`.
- Salarios y Panel del encargado no tienen capturas aprobadas porque sus pilotos fueron diagnosticos, no redisenos implementados.

## Actualizacion

Con Poseidon activo en `http://127.0.0.1:5173/`:

```text
pnpm run capture:visual
```

El comando usa un contexto aislado, datos demo y el usuario Encargado. Antes de aceptar nuevas capturas, ejecutar `pnpm run check`, revisar ambas imagenes y confirmar que la pantalla sigue siendo el patron aprobado.
