# Poseidon - Coordinacion de chats de desarrollo

Ultima actualizacion: 2026-07-18

Fuente canonica para coordinar chats permanentes de Poseidon. No reemplaza `AGENTS.md`, las reglas funcionales ni el protocolo de subagentes.

## Gobierno operativo SOPM-Lite

Poseidon adopta solo las partes verificables y de bajo costo operativo del modelo SOPM. No usa prompts universales gigantes ni una estructura paralela. Git, los registros JSON y la documentacion existente siguen siendo las fuentes de verdad.

- `docs/coordinacion/PROJECT_STATUS.json`: estado, riesgos y proximas acciones.
- `docs/coordinacion/DECISIONS.json`: indice verificable de decisiones transversales.
- `docs/coordinacion/MIGRATIONS.json`: migraciones y reparaciones de datos aplicadas o pendientes.
- `docs/coordinacion/CAPABILITIES.json`: agentes, skills, validadores, herramientas y conexiones activas.

Los estados normales de una orden son `PROPUESTA`, `ASIGNADA`, `EN_CURSO`, `LISTA` e `INTEGRADA`. `BLOQUEADA` y `DESCARTADA` son auxiliares.

Una orden formal es obligatoria para trabajo delegado, paralelo, con propiedad temporal o perteneciente de forma no trivial a una experiencia permanente de rol. La autorizacion literal del usuario habilita el cambio de producto, pero no reasigna automaticamente su propiedad a Central.

## Topologia

- `Poseidon Central`: conserva decisiones, contratos compartidos, integracion, validacion y `main`.
- `Poseidon Cajero`: experiencia operativa del cajero.
- `Poseidon Encargado`: experiencia de supervision del local.
- `Poseidon Administrador`: experiencia de administracion y maestros.
- `Poseidon Calidad y Pruebas`: validacion independiente y sugerencias con evidencia; no es un rol funcional.
- Especialistas temporales: nucleo financiero, salarios/personal, locales/maquinas y revision visual.

Los chats de rol y el workstream de calidad son permanentes. Los especialistas se crean o delegan solo para una tarea acotada. No todos deben estar activos al mismo tiempo.

Calidad recibe un commit exacto y una matriz de aceptacion. Puede ejecutar pruebas y elevar `FALLO_CONFIRMADO`, `RIESGO`, `SUGERENCIA`, `DUDA_DE_PRODUCTO` o `SIN_HALLAZGOS`. Central debe reproducir o contrastar el resultado antes de consultarlo con el usuario. Ninguna sugerencia autoriza por si sola una implementacion.

## Delegacion obligatoria por experiencia

- Si el efecto principal modifica una pantalla, flujo, permiso, comportamiento, estilo propio, prueba o documento modular de Cajero, Encargado o Administrador, el chat permanente de ese rol es el propietario de ejecucion.
- Central recibe el pedido, conserva la autorizacion, define contratos y criterios, crea la orden y supervisa la entrega; no sustituye al chat propietario para acelerar el bloque.
- Central conserva contratos compartidos, integracion, gobierno, documentacion global y validacion transversal.
- Un alcance mixto se divide antes de editar: el rol implementa su experiencia y Central conserva o asigna temporalmente los contratos compartidos.
- Solo una correccion realmente trivial sin cambio de comportamiento, una resolucion de integracion o una recuperacion urgente puede ejecutarse directamente desde Central sobre una ruta de rol. La excepcion debe explicarse al cerrar el bloque.
- Un bloque ya integrado y validado no se rehace solo para reproducir el flujo; la correccion operativa se aplica desde la siguiente orden.

## Regla de sincronizacion

Los chats no deben asumir que comparten el historial de conversacion ni el estado mental. Las fuentes de verdad son:

1. codigo y documentacion versionados;
2. una orden de trabajo con alcance y propietario;
3. una rama y worktree aislados;
4. un commit local estable;
5. una entrega estructurada al chat central.

Un mensaje entre chats ayuda a coordinar, pero no reemplaza estos artefactos.

## Flujo

1. Central recibe o consolida el pedido.
2. Clasifica rol propietario y dependencias de dominio.
3. Registra una orden usando `docs/plantillas/ORDEN_TRABAJO_CHAT.md`.
4. Asigna archivos de escritura exclusivos y referencias de solo lectura.
5. El chat de rol trabaja en su worktree y no amplia alcance por inferencia.
6. Si necesita un contrato compartido, se detiene en ese punto y solicita al chat central una dependencia concreta.
7. El chat propietario valida y entrega con `docs/plantillas/ENTREGA_CHAT_MODULO.md`.
8. Central revisa el diff, integra un commit por vez, resuelve contradicciones y ejecuta la validacion transversal.
9. Central actualiza la cola y `PROJECT_STATUS.json` cuando cambia una orden, riesgo o integracion material.
10. Una decision transversal, migracion o capacidad nueva se registra antes de cerrar el punto de control.

Cuando interviene Calidad, su revision ocurre sobre el commit estable entregado por el propietario y antes de la integracion final cuando el riesgo lo justifica. Si encuentra una mejora no incluida, la registra como sugerencia separada sin ampliar el alcance del bloque probado.

## Git y worktrees

- `main` solo se integra desde el chat central.
- Cada chat de rol usa un worktree y una rama propios.
- Calidad usa su propio worktree y rama; no comparte checkout con Central ni con los roles.
- Un chat de rol puede crear commits locales en su rama despues de `pnpm run check:commit`.
- No puede hacer merge a `main`, push, publicacion ni despliegue.
- No se usan dos chats de escritura sobre el mismo archivo o contrato al mismo tiempo.
- El chat central puede revocar o reasignar propiedad antes de una nueva orden de trabajo.

## Contratos compartidos

Consultar `docs/coordinacion/CONTRATOS_COMPARTIDOS.md`. La configuracion verificable de propietarios vive en `docs/coordinacion/WORKSTREAMS.json`. `pnpm run check:workstreams` valida propietarios y todo el gobierno SOPM-Lite; `pnpm run check:governance` permite revisar solo los registros.

## Actualizacion de registros

- `PROJECT_STATUS.json`: al asignar/integrar trabajo o cambiar fase, riesgo o siguiente accion material.
- `DECISIONS.json`: solo para decisiones transversales; cada entrada referencia un documento individual.
- `MIGRATIONS.json`: antes de integrar una migracion o reparacion de datos; el commit completo es obligatorio salvo registro historico marcado.
- `CAPABILITIES.json`: al crear, activar, suspender o retirar un agente, skill, validador, herramienta o conexion.
- El commit que contiene el registro identifica el snapshot exacto; no se guarda un HEAD autorreferencial dentro del archivo.

## Chats y subagentes

- Chat de rol: mantiene contexto funcional durante varias sesiones y trabaja en una rama aislada.
- Chat de calidad: mantiene contexto de validacion, trabaja aislado y asesora a Central sin decidir producto.
- Subagente: tarea temporal y acotada regida por `docs/PROTOCOLO_AGENTES_CODEX.md`.
- Perfil personalizado: especialidad reutilizable de solo lectura en `.codex/agents/`.
- Skill: procedimiento repetible en `.agents/skills/`.

Un chat de rol puede usar subagentes si el protocolo lo justifica. El chat central sigue siendo el unico que integra en `main`.

## Fuentes relacionadas

- `docs/coordinacion/WORKSTREAMS.json`
- `docs/coordinacion/PROJECT_STATUS.json`
- `docs/coordinacion/CONTRATOS_COMPARTIDOS.md`
- `docs/coordinacion/COLA_INTEGRACION.md`
- `docs/coordinacion/DECISIONS.json`
- `docs/coordinacion/DECISIONES.md`
- `docs/coordinacion/MIGRATIONS.json`
- `docs/coordinacion/CAPABILITIES.json`
- `docs/plantillas/ORDEN_TRABAJO_CHAT.md`
- `docs/plantillas/ENTREGA_CHAT_MODULO.md`
- `docs/plantillas/DECISION_TRANSVERSAL.md`
- `docs/plantillas/MIGRACION_REPARACION.md`
- `docs/prompts/CHAT_CENTRAL_POSEIDON.md`
- `docs/prompts/CHAT_CAJERO_POSEIDON.md`
- `docs/prompts/CHAT_ENCARGADO_POSEIDON.md`
- `docs/prompts/CHAT_ADMINISTRADOR_POSEIDON.md`
