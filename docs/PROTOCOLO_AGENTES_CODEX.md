# Poseidon - Protocolo de agentes y subagentes Codex

Ultima actualizacion: 2026-07-11

Fuente canonica para decidir cuando delegar trabajo de desarrollo de Poseidon, que perfil usar y como integrar sus resultados. Estos agentes son infraestructura de Codex versionada con el proyecto; no forman parte de la aplicacion ni son visibles para sus usuarios.

## Conceptos

- Agente principal: conserva requisitos, decisiones, autorizacion del usuario, integracion, validacion y cierre del trabajo.
- Subagente: hilo temporal creado para una tarea acotada y cerrado cuando devuelve su resultado.
- Perfil personalizado: configuracion reutilizable en `.codex/agents/` que define instrucciones y permisos de un tipo de subagente.
- `AGENTS.md`: reglas de trabajo y mapas de lectura aplicables por carpeta; no reemplaza un perfil personalizado.

La carpeta correcta para perfiles del proyecto es `.codex/agents/`. La carpeta `.agents/` existente esta vacia y no se usa para esta infraestructura.

## Configuracion de control

`.codex/config.toml` establece:

- `max_threads = 3`: limite tecnico conservador de hilos abiertos;
- maximo operativo de dos subagentes trabajando en paralelo;
- `max_depth = 1`: solo el agente principal puede delegar; un subagente no crea descendientes;
- `interrupt_message = true`: una interrupcion queda visible para el agente principal.

Los perfiles no fijan modelo inicialmente. Heredan el modelo de la tarea para evitar incompatibilidades y permitir medir calidad y consumo antes de optimizar ese punto.

## Perfiles iniciales

| Perfil | Uso | Permiso |
| --- | --- | --- |
| `poseidon_scope_mapper` | Delimitar archivos, dependencias, reglas, pruebas y documentos | Solo lectura |
| `poseidon_accounting_reviewer` | Revisar impactos economicos, financieros, cuentas y auditoria | Solo lectura |
| `poseidon_ui_reviewer` | Custodiar el sistema visual y revisar propuestas o implementaciones de interfaz | Solo lectura |
| `worker` integrado de Codex | Implementar un alcance ya aprobado | Escritura controlada por tarea |

No crear un perfil por modulo. Los contextos y `AGENTS.md` de cada feature ya aportan especializacion sin duplicar instrucciones.

## Matriz de uso

Usar `poseidon_scope_mapper` cuando:

- una tarea afecta mas de una feature;
- no esta claro quien es propietario del comportamiento;
- existen asociaciones por `balanceId`, `localId`, `staffId`, `clientId` o `machineId`;
- una refactorizacion puede mover contratos o referencias.

Usar `poseidon_accounting_reviewer` cuando cambien:

- caja, contadores o cierres;
- diferencias de efectivo o banco;
- cuentas corrientes y movimientos;
- salarios, adelantos, descuentos o cierres salariales;
- gastos, regalos, transferencias, aportes o retiros;
- formulas o reglas de auditoria contable.

Usar `poseidon_ui_reviewer` cuando cambien:

- una pantalla, modal, panel o formulario complejo;
- tablas, columnas, ordenamiento o filtros;
- navegacion, permisos visibles o cambio de funcion;
- layout responsive o composicion para 1080p.

El custodio de diseno trabaja en dos modos:

- `PROPUESTA`: antes de editar, recomienda patron, jerarquia, estados, archivos y validacion;
- `VERIFICACION`: despues de editar, compara implementacion, reglas, referencias aprobadas y viewports.

Su conocimiento estable vive en `docs/REGLAS_VISUALES.md` y `docs/SISTEMA_VISUAL_POSEIDON.md`, no duplicado dentro del TOML. Las tres revisiones funcionales que justifican este alcance estan consolidadas en `docs/PILOTOS_DISENO_POSEIDON.md`.

No delegar para:

- levantar o detener localhost;
- ejecutar un comando simple;
- corregir un texto aislado;
- un cambio evidente y local de bajo riesgo;
- tareas donde el siguiente paso del agente principal depende inmediatamente del resultado;
- volver a revisar trabajo que otro subagente ya cubrio de forma suficiente.

## Flujo obligatorio

1. El agente principal interpreta el pedido y lee el contexto minimo.
2. Decide si la delegacion aporta una perspectiva independiente real.
3. Define una tarea acotada, archivos o dominio, permiso y formato de salida.
4. Crea como maximo dos subagentes paralelos con responsabilidades diferentes.
5. Continua trabajo local no superpuesto mientras los subagentes avanzan.
6. Espera resultados solo cuando sean necesarios para continuar.
7. Cierra los hilos terminados cuando ya no se necesiten.
8. Registra cada delegacion con la plantilla canonica, incluso si falla o no se adopta.
9. Integra los resultados y elimina duplicaciones o contradicciones.
10. Presenta al usuario una unica propuesta antes de modificar, salvo objetivo activo ya autorizado.
11. Si hay escritura autorizada, asigna un unico `worker` o varios con archivos totalmente disjuntos.
12. El agente principal revisa cada diff, ejecuta validaciones, actualiza documentacion y decide si el bloque esta estable para commit.

## Reglas de escritura

- Los tres perfiles personalizados iniciales nunca editan archivos.
- Un subagente no hace commits, push, publicacion, despliegue ni conexiones externas.
- El `worker` recibe propiedad explicita de archivos y un alcance funcional aprobado.
- Dos agentes no editan el mismo archivo ni reglas estrechamente asociadas en paralelo.
- Los subagentes no revierten cambios ajenos y deben asumir que no trabajan solos.
- El agente principal conserva la integracion y es el unico responsable de cerrar el punto de control Git.
- El agente principal es el unico responsable de integrar resultados, resolver contradicciones, validar el sistema, actualizar documentacion y ejecutar stage/commit.
- Un objetivo activo autoriza autonomia solo dentro de su alcance y no elimina las restricciones de `AGENTS.md`.

## Contrato de prompts

Toda delegacion debe indicar:

- objetivo concreto;
- si es lectura o escritura;
- archivos, feature o dominio permitido;
- fuentes documentales minimas;
- preguntas distintas que debe responder;
- formato esperado de salida;
- si el agente principal debe esperar todos los resultados;
- prohibicion de ampliar el alcance.

Evitar copiar el historial completo del chat. Dar al subagente referencias concretas a `AGENTS.md`, contexto corto, modulo, simbolos y pruebas.

## Control de consumo

- Maximo habitual: dos subagentes por tarea.
- Profundidad fija: uno.
- Priorizar exploracion, revision, pruebas y resumen; evitar escritura paralela amplia.
- No usar subagentes por costumbre ni para confirmar una conclusion obvia.
- Leer simbolos y rangos dirigidos; no releer documentos completos sin necesidad.
- Pedir resultados estructurados y breves, sin logs extensos.
- Cerrar agentes terminados para no ocupar capacidad.
- Comparar utilidad, duplicacion, tiempo y consumo despues de cada piloto relevante.

## Medicion obligatoria

- Plantilla: `docs/plantillas/REPORTE_DELEGACION_AGENTES.md`.
- Registro acumulado: `docs/REGISTRO_DELEGACIONES_AGENTES.md`.
- Cada subagente genera una entrada, tambien cuando termina con error, se interrumpe o no aporta valor.
- Registrar duracion y tokens solo cuando exista una medicion real. Usar `No disponible` cuando la API no los exponga.
- Clasificar resultado como `UTIL`, `PARCIAL` o `NO_UTIL` usando el criterio de la plantilla.
- Registrar hallazgos adoptados, duplicacion, respeto del alcance, cierre del agente y estado Git para perfiles de solo lectura.

## Regla para perfiles nuevos

- No crear un perfil permanente por una necesidad aislada.
- Antes de considerar un perfil nuevo deben existir tres delegaciones utiles documentadas que evidencien la misma especialidad faltante.
- Las tres delegaciones deben figurar como `UTIL`, respetar alcance y tener al menos un hallazgo adoptado.
- Si un perfil existente, un contexto corto o instrucciones puntuales cubren la necesidad, no se crea otro perfil.
- La decision final pertenece al agente principal y requiere autorizacion explicita del usuario porque modifica infraestructura versionada.

## Validacion de infraestructura

Para cambios de configuracion o perfiles:

```text
pnpm run check:agents
pnpm run check:design
verificar carga de los perfiles en una nueva tarea Codex
ejecutar un piloto de solo lectura
comprobar que el piloto no modifica el worktree
git diff --check
revisar referencias documentales
```

Una tarea Codex ya iniciada puede no recargar perfiles agregados durante esa misma ejecucion. La carga nominal de perfiles nuevos debe comprobarse desde una tarea nueva; el piloto inicial puede aplicar sus contratos con agentes integrados de solo lectura.

Validacion 2026-07-11: una tarea nueva encontro los tres perfiles y ejecuto `poseidon_scope_mapper` y `poseidon_accounting_reviewer` sin modificar Git. La API disponible no expone selector nativo `agent_type`; la evidencia confirma presencia, lectura y obediencia del TOML nominal, no seleccion interna por tipo.

Para cambios funcionales posteriores se mantiene la validacion normal:

```text
pnpm run check
pnpm run build
pnpm run smoke:localhost
prueba manual del rol afectado
git diff --check
```

## Piloto inicial

Modulo: Diferencias de caja.

Participantes:

- `poseidon_scope_mapper`: mapa de archivos, asociaciones, pruebas y documentos;
- `poseidon_accounting_reviewer`: estados, formulas, movimientos de cuenta y auditoria;
- agente principal: consolidacion y evaluacion sin modificar funcionalidad.

El resultado del piloto debe registrar:

- hallazgos utiles y evidencia;
- duplicaciones o contradicciones;
- alcance de lectura realizado;
- pruebas sugeridas;
- utilidad frente al consumo y al tiempo;
- ajustes necesarios en los perfiles.

Resultado documentado: `docs/PILOTO_SUBAGENTES_DIFERENCIAS.md`.
Delegaciones registradas: `docs/REGISTRO_DELEGACIONES_AGENTES.md`.

## Pilotos de diseno

Los pilotos de Diferencias, Liquidacion de salarios y Panel del encargado produjeron tres delegaciones `UTIL` de la misma especialidad. La decision fue fortalecer `poseidon_ui_reviewer`, no crear otro perfil superpuesto. Diferencias es el patron implementado; Salarios y Encargado conservan hallazgos pendientes de futuros bloques autorizados.

Resultado consolidado: `docs/PILOTOS_DISENO_POSEIDON.md`.

## Criterio de exito

La infraestructura se considera util cuando los subagentes encuentran riesgos o dependencias diferentes, entregan resultados breves y no obligan al agente principal a repetir toda la investigacion. Si duplican trabajo, amplian el alcance o elevan demasiado el consumo, se reduce la delegacion antes de agregar nuevos perfiles.
