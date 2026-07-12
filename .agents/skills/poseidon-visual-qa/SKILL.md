---
name: poseidon-visual-qa
description: Verifica cambios visuales, responsive, navegacion, formularios, modales, paneles y tablas de Poseidon. Usar despues de modificar una interfaz o antes de cerrar una propuesta visual que deba cumplir el sistema de diseno, los roles, los estados y los viewports aprobados.
---

# Poseidon Visual QA

Comprobar la interfaz implementada con evidencia automatizada y visual, sin redefinir reglas funcionales.

## Preparacion

1. Leer `AGENTS.md`, `docs/CONTEXTO_RAPIDO_CODEX.md`, `docs/REGLAS_VISUALES.md` y `docs/SISTEMA_VISUAL_POSEIDON.md`.
2. Leer el `AGENTS.md`, contexto corto y documento funcional de la feature afectada.
3. Consultar `docs/referencias-visuales/README.md` y una referencia aprobada solo cuando exista una comparacion concreta.
4. Identificar roles, estados, datos de prueba y rutas necesarias.

## Verificacion

1. Ejecutar `pnpm run check:design`.
2. Levantar y comprobar localhost con `$poseidon-localhost-diagnostics` si no esta disponible.
3. Revisar la pantalla en la matriz de viewports definida por `docs/REGLAS_VISUALES.md` cuando el alcance lo justifique.
4. Comprobar consola, desbordamiento horizontal, solapamientos, foco, estados vacios, validaciones y confirmaciones.
5. Verificar titulos no repetidos, densidad profesional, controles alineados y acciones con tamano consistente.
6. Verificar el contrato de ordenamiento de tablas definido por la fuente canonica visual.
7. Validar rol, funcion activa, local y requisito de caja abierta cuando apliquen.
8. Usar `pnpm run capture:visual` solo si la pantalla pertenece al conjunto de referencias mantenidas.

## Resultado

Separar hallazgos bloqueantes de mejoras opcionales. Referenciar pantalla, estado, viewport y evidencia. No aprobar una interfaz solo porque compila ni cambiar formulas o permisos durante una revision visual.
