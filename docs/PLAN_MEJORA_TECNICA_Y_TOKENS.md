# Poseidon - Plan tecnico y ahorro de contexto

Ultima actualizacion: 2026-07-11

Este documento contiene prioridades vigentes. Los bloques terminados viven en Git y no se enumeran uno por uno aqui.

## Objetivos

- Reducir riesgo al modificar reglas contables y flujos operativos.
- Leer menos codigo y documentacion por tarea.
- Mantener referencias entre modulos asociados.
- Preparar el codigo para persistencia futura sin abandonar `localStorage` ahora.
- Cerrar cambios pequeños, probados, documentados y commiteados localmente.

## Linea base

- Aproximadamente 13.800 lineas TypeScript/React.
- `global.css`: historicamente superaba 3.200 lineas; ahora es un manifiesto de 7 imports y la cascada se divide por capas/feature.
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
- Completado: `pnpm check` ejecuta typecheck, ESLint sin advertencias y pruebas.
- Completado parcialmente: fixtures de migracion, permisos y comandos ampliados; seguir sumando por comando nuevo.

Resultado: datos locales mas previsibles y fallos detectados antes.

## Prioridad 2 - Reducir archivos grandes

Orden ejecutado:

1. `LocationsMachines.tsx`.
2. `Movements.tsx`.
3. `SalarySettlements.tsx`.
4. `appData.ts`.

Primera division mecanica completada el 2026-07-10: editores/historiales de locales y maquinas, clientes/salarios/tabla de movimientos, editor salarial y normalizador de datos. Navegacion, permisos, confirmaciones, avisos, CSS por capas, lint y smoke documentado tambien quedaron centralizados.

## Prioridad 3 - Comandos de dominio

- Completado para apertura, contadores, cierre, diferencias y liquidaciones salariales.
- Los comandos reciben actor, funcion, reloj e IDs, devuelven resultado tipado y actualizan entidad/cuentas/historial/auditoria en conjunto.
- Completado: movimientos operativos con validacion de funcion/caja, cuentas, contramovimientos y auditoria.
- Completado: locales/maquinas con validacion de rol, referencias, taller, cuentas, historial y auditoria.

No agregar Redux o un store complejo antes de definir comandos.

## Prioridad 4 - Cobertura automatizada

Agregar en este orden:

- Completado: apertura -> contadores -> cierre;
- Completado: correccion/anulacion de diferencias y saldos;
- Completado: alta, correccion y anulacion de pagos/adelantos/descuentos;
- Completado: movimientos operativos;
- Pendiente: cierre salarial;
- Pendiente: traslado, reset y eliminacion de maquinas;
- Completado inicial: migracion de ID historico, limpieza de imagenes y reconstruccion de asientos faltantes;
- Completado: ciclo integrado de caja, saldos, liquidacion, diferencias y roundtrip de snapshot; la migracion reconstruye la salida de efectivo faltante en transferencias.
- Completado inicial: permisos por rol y requisito de caja abierta;
- Completado inicial: E2E Playwright de apertura, carga de las tres maquinas, cierre y persistencia despues de recargar;
- Pendiente: pruebas UI automatizadas de formularios administrativos y flujos completos del encargado;
- Completado manual/documentado: smoke de cajero, encargado y administrador en navegador.

## Prioridad 5 - Navegacion y UI compartida

- Completado: registro unico de pantalla, titulo, menu y roles.
- Completado: confirmacion compartida.
- Completado: mensajes con ciclo de vida claro para evitar avisos obsoletos.
- Mover componentes transversales fuera de features propietarias.
- Completado: CSS dividido por base, layout, features y responsive, preservando exactamente el orden original.
- Completado: pantallas funcionales cargadas bajo demanda; bundle inicial reducido de 507,03 kB a 283,65 kB sin advertencia de chunk grande.

## Preparacion online sin implementacion

- Arquitectura objetivo: `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`.
- Plan reversible: `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`.
- Completado en local: puerto `AppDataRepository`, codec de respaldo, adaptador `localStorage` y cola asincrona de escrituras.
- Mientras no se autorice: mantener adaptador local y no crear conexiones/credenciales.

## Reglas para ahorrar tokens

- Buscar simbolos/rangos, no leer archivos grandes completos.
- Un objetivo por modulo o corte transversal bien definido.
- Contextos cortos enlazan fuentes; no copian reglas.
- Git conserva historial; documentos muestran estado vigente.
- Hacer commit local al estabilizar un bloque.
- Si el diff mezcla temas, dividir antes de validar.

## Agentes y subagentes Codex

- Configuracion controlada en `.codex/config.toml`: tres hilos abiertos como maximo y profundidad uno.
- Perfiles iniciales de solo lectura: alcance, revision contable y revision visual.
- Maximo operativo de dos subagentes en paralelo.
- Delegar solo trabajo independiente que evite contaminar el contexto principal.
- No usar subagentes para comandos simples, cambios evidentes ni revisiones duplicadas.
- El agente principal integra resultados, controla escritura, valida y documenta.
- Completado: piloto de Diferencias de caja con mapa de alcance y revision contable, sin cambios funcionales.
- Ajuste aplicado tras el piloto: limites explicitos de archivos, palabras, riesgos y pruebas por perfil.
- Pendiente de una tarea nueva: comprobar la carga nominal de los tres perfiles personalizados.
- Fuente canonica: `docs/PROTOCOLO_AGENTES_CODEX.md`.
- Resultado del piloto: `docs/PILOTO_SUBAGENTES_DIFERENCIAS.md`.

## Validacion por bloque

```text
pnpm run check
pnpm run build
pnpm run smoke:localhost
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
