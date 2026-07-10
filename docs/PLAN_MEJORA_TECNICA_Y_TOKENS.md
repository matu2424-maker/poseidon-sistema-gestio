# Poseidon - Plan tecnico y ahorro de contexto

Ultima actualizacion: 2026-07-10

Este documento contiene prioridades vigentes. Los bloques terminados viven en Git y no se enumeran uno por uno aqui.

## Objetivos

- Reducir riesgo al modificar reglas contables y flujos operativos.
- Leer menos codigo y documentacion por tarea.
- Mantener referencias entre modulos asociados.
- Preparar el codigo para persistencia futura sin abandonar `localStorage` ahora.
- Cerrar cambios pequeños, probados, documentados y commiteados localmente.

## Linea base

- Aproximadamente 13.800 lineas TypeScript/React.
- `global.css`: aproximadamente 3.232 lineas.
- Documentacion anterior al bloque de optimizacion: aproximadamente 4.000 lineas.
- Ocho archivos de pruebas, 24 casos.
- Archivos de mayor concentracion: Locales/Maquinas, datos/normalizacion, Movimientos y Salarios.
- `App.tsx` ya funciona principalmente como orquestador y no es el primer objetivo por tamaño.

## Lectura eficiente

Para una tarea normal leer:

1. `AGENTS.md`.
2. `docs/CONTEXTO_RAPIDO_CODEX.md`.
3. `AGENTS.md` de la feature.
4. Contexto corto del modulo.
5. Documento funcional del modulo.

Agregar reglas contables, visuales o mapa tecnico solo si aplican. El enrutador completo esta en `docs/INDICE_DOCUMENTACION.md`.

## Prioridad 1 - Seguridad del desarrollo local

- Completado: fecha operativa local y timestamps historicos deterministas.
- Completado: validacion runtime y `schemaVersion` del snapshot.
- Completado: recuperacion de snapshot corrupto y exportacion/importacion administrativa.
- Completado: se elimino el recorte silencioso de auditoria e historiales.
- `pnpm check` ejecuta typecheck y pruebas; falta incorporar lint.
- Ampliar fixtures de prueba sin depender de `AppData` completo.

Resultado: datos locales mas previsibles y fallos detectados antes.

## Prioridad 2 - Reducir archivos grandes

Orden:

1. `LocationsMachines.tsx`.
2. `Movements.tsx`.
3. `SalarySettlements.tsx`.
4. `appData.ts`.

Primero mover codigo sin comportamiento; despues extraer reglas. Seguir `docs/MODULARIZACION_REFERENCIAS.md`.

## Prioridad 3 - Comandos de dominio

- Sacar operaciones multi-entidad de componentes React.
- Recibir actor, reloj e IDs explicitamente.
- Devolver `Result` con error tipado.
- Mantener entidad, cuenta y auditoria en una operacion coherente.
- Empezar por apertura/cierre de caja y diferencias.

No agregar Redux o un store complejo antes de definir comandos.

## Prioridad 4 - Cobertura automatizada

Agregar en este orden:

- apertura -> contadores -> movimientos -> cierre;
- correccion/anulacion de diferencias y saldos;
- pagos/adelantos/descuentos y cierre salarial;
- traslado, reset y eliminacion de maquinas;
- migracion de snapshots antiguos;
- permisos por rol/local;
- pruebas UI de formularios criticos;
- tres smoke tests por rol en navegador.

## Prioridad 5 - Navegacion y UI compartida

- Registro unico de pantalla, titulo, menu y roles.
- Dialogo de confirmacion compartido.
- Mensajes con ciclo de vida claro para evitar avisos obsoletos.
- Mover componentes transversales fuera de features propietarias.
- Dividir CSS por base, layout, componentes y feature despues de dividir TSX.

## Preparacion online sin implementacion

- Arquitectura objetivo: `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`.
- Plan reversible: `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`.
- Mientras no se autorice: mantener adaptador local y no crear conexiones/credenciales.

## Reglas para ahorrar tokens

- Buscar simbolos/rangos, no leer archivos grandes completos.
- Un objetivo por modulo o corte transversal bien definido.
- Contextos cortos enlazan fuentes; no copian reglas.
- Git conserva historial; documentos muestran estado vigente.
- Hacer commit local al estabilizar un bloque.
- Si el diff mezcla temas, dividir antes de validar.

## Validacion por bloque

```text
pnpm test
pnpm run build
http://127.0.0.1:5173/ -> 200
git diff --check
documentacion de la fuente canonica y modulo
```

Para cambios documentales: comprobar referencias y contradicciones. Para UI: navegador y consola. Para contabilidad: casos de saldo antes/despues.

## Definicion de terminado

- Requisito comprobado contra el estado actual.
- Pruebas proporcionales al riesgo.
- Sin regresiones visibles conocidas.
- Fuente canonica actualizada.
- Worktree revisado.
- Commit local si el bloque es estable.
- Sin push, publicacion o conexion externa salvo pedido explicito.
