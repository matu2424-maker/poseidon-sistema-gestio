# Poseidon - Piloto de skills Codex

Ultima actualizacion: 2026-07-12

## Objetivo

Comprobar que una skill del repositorio puede guiar un bloque real, cargar contexto dirigido, activar validaciones proporcionales y reducir decisiones repetidas sin modificar el funcionamiento de la aplicacion.

## Escenario

- Skill aplicada: `poseidon-module-change`.
- Tarea: crear la infraestructura inicial de cuatro skills, integrarla con fuentes canonicas y agregar un control previo al commit.
- Autorizacion: objetivo activo y literal del usuario para ejecutar los puntos 1 a 7 del plan.
- Alcance funcional de Poseidon: ninguno; no se modificaron pantallas, datos ni reglas de negocio.
- Servicios externos: ninguno conectado.

## Procedimiento observado

1. Se leyeron reglas generales, indice, contexto rapido, mapa tecnico, protocolo de agentes y guia de Skill Creator.
2. Las skills se inicializaron con Skill Creator y se mantuvieron debajo de 500 lineas.
3. Una primera revision detecto reglas duplicadas dentro de las skills; se sustituyeron por referencias canonicas.
4. `check:skills` detecto dos defectos iniciales: una referencia ausente y un falso positivo de `TODO`; ambos se corrigieron.
5. `check:commit` inspecciono el worktree y selecciono automaticamente la validacion completa por existir cambios en `scripts/`.
6. El primer piloto completo revelo una advertencia de Node por `shell: true`; se corrigio sin cambiar la seleccion de controles.
7. La prueba real de localhost detecto que el argumento correcto es `--check`, no `status`; la skill se corrigio contra el script existente.
8. El primer commit fue bloqueado porque el hook encontraba `pnpm` pero no `node`; se agrego el runtime bundled al `PATH` del hook y se repitio la validacion.

## Medicion real del primer pase completo

| Medida | Resultado |
| --- | --- |
| Rutas detectadas | 17 |
| Controles seleccionados | `pnpm run check` y `pnpm run build` |
| Duracion total observada | 20.935 ms |
| Perfiles validados | 3 perfiles, 28 controles |
| Skills validadas | 4 skills, 5 controles de integracion |
| Sistema visual | 33 controles |
| Suite automatizada | 102 pruebas en 24 archivos |
| Build | 1.654 modulos transformados, exitoso |
| Cambios funcionales | Ninguno |
| Tokens atribuibles a la skill | No disponible en la API de esta tarea |

La duracion es evidencia de este equipo y este worktree, no un limite ni una garantia para ejecuciones futuras.

El pase final, despues de corregir la advertencia, detecto 22 rutas y completo el mismo plan en 20.299 ms sin `DEP0190`. La validacion local agrego `iniciar-poseidon.bat --check`, smoke HTTP 200 y comprobacion en navegador de titulo, `#root`, contenido principal, ausencia de overflow horizontal y cero errores de consola.

## Evaluacion

- Resultado: `UTIL`.
- Hallazgo adoptado: eliminar reglas duplicadas de las skills y usar referencias.
- Hallazgo adoptado: corregir la invocacion de procesos para evitar la advertencia `DEP0190`.
- Hallazgo adoptado: verificar comandos contra los scripts reales antes de fijarlos en una skill.
- Hallazgo adoptado: el hook debe preparar tanto Node como pnpm, sin depender del `PATH` de la terminal que invoca Git.
- Duplicacion residual: la primera creacion exigio leer documentacion amplia porque se estaba definiendo la infraestructura; los usos futuros deben seguir la ruta corta de cada skill.
- Ahorro de tokens: no cuantificable todavia. La mejora comprobable es la reduccion de decisiones manuales y la seleccion automatica de validaciones.
- Riesgo residual: una tarea Codex ya abierta puede no descubrir implicitamente skills nuevas; debe comprobarse la invocacion nominal en una tarea posterior.

## Proximos pilotos

1. Usar `poseidon-visual-qa` en el siguiente cambio de interfaz autorizado.
2. Usar `poseidon-accounting-regression` en el siguiente cambio contable autorizado.
3. Usar `poseidon-localhost-diagnostics` en el proximo pedido real de arranque o error de localhost.
4. Registrar resultados reales; no crear nuevas skills o perfiles hasta observar una necesidad repetida.
