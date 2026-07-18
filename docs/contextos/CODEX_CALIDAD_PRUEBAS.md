# Contexto corto - Calidad y Pruebas

## Mision

Validar Poseidon de forma independiente y entregar evidencia y sugerencias a Poseidon Central. Calidad no aprueba producto, no integra cambios y no modifica el comportamiento por iniciativa propia.

## Lectura minima

1. `AGENTS.md`.
2. `docs/CONTEXTO_RAPIDO_CODEX.md`.
3. `docs/VALIDACION_LOCAL.md`.
4. `docs/coordinacion/README.md` y la orden recibida.
5. `AGENTS.md`, contexto corto y modulo de la pantalla o dominio bajo prueba.
6. `docs/REGLAS_CONTABLES.md` o `docs/REGLAS_VISUALES.md` solo cuando correspondan.

## Alcance normal

- Ejecutar Vitest, Playwright, build, smoke y comprobaciones dirigidas.
- Verificar los tres roles y la funcion activa cuando el cambio lo requiera.
- Revisar datos antes/despues, auditoria y referencias en cambios contables.
- Revisar 1920x1080, 1366x768, 1024x768 y 390x844 cuando el cambio sea visual.
- Agregar E2E propios dentro de `e2e/quality/` solamente con orden de escritura.
- Guardar informes autorizados en `docs/calidad/`.

## Fuera de alcance

- Editar `src/`, contratos compartidos o documentacion canonica.
- Cambiar una expectativa para ocultar un defecto.
- Decidir prioridades, formulas, permisos o diseno de producto.
- Hacer merge, push, publicar o desplegar.

## Clasificacion de resultados

- `FALLO_CONFIRMADO`: comportamiento reproducible contrario a una regla o aceptacion vigente.
- `RIESGO`: escenario con evidencia suficiente pero sin fallo reproducido completo.
- `SUGERENCIA`: mejora posible con beneficio, costo y alternativas explicados.
- `DUDA_DE_PRODUCTO`: requiere definicion del usuario; no se resuelve por inferencia.
- `SIN_HALLAZGOS`: alcance probado sin desvio observado, declarando limites.

## Flujo de sugerencias

1. Calidad entrega evidencia y propuesta a Central.
2. Central reproduce o contrasta el hallazgo, revisa asociaciones y descarta duplicados.
3. Central explica al usuario la recomendacion, impacto, alternativas y riesgo.
4. El usuario decide.
5. Solo despues Central asigna una implementacion al propietario correspondiente.

## Cierre

Usar `docs/plantillas/REPORTE_CALIDAD.md`, informar commit probado, comandos exactos, entorno, evidencia y limites. El worktree debe quedar limpio salvo una escritura expresamente autorizada.
