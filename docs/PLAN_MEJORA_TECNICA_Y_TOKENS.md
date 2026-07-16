# Poseidon - Plan tecnico y ahorro de contexto

Ultima actualizacion: 2026-07-16

Este documento contiene prioridades vigentes. Los bloques terminados viven en Git y no se enumeran uno por uno aqui.

## Objetivos

- Reducir riesgo al modificar reglas contables y flujos operativos.
- Leer menos codigo y documentacion por tarea.
- Mantener referencias entre modulos asociados.
- Preparar el codigo para persistencia futura sin abandonar `localStorage` ahora.
- Cerrar cambios pequeños, probados, documentados y commiteados localmente.

## Linea base

- Aproximadamente 18.700 lineas fisicas TypeScript/React en 104 archivos de `src/`.
- Aproximadamente 3.700 lineas fisicas CSS en 8 archivos por capas.
- `global.css`: historicamente superaba 3.200 lineas; ahora es un manifiesto de 7 imports y la cascada se divide por capas/feature.
- Documentacion anterior al bloque de optimizacion: aproximadamente 4.000 lineas.
- Veintiseis archivos de pruebas, 134 casos, mas 8 casos E2E en 5 archivos.
- Archivos de mayor concentracion: Liquidacion de salarios, seed/normalizacion, Locales/Maquinas, historiales y estilos administrativos.
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
- Completado: comparacion optimista del snapshot; una pestaña desactualizada no sobrescribe cambios de otra y conserva respaldo del intento.
- Completado: un fallo de escritura bloquea nuevas operaciones y permite descargar/reintentar el dato pendiente.
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

- Completado para apertura, contadores, cierre de caja, diferencias, liquidaciones y cierres salariales.
- Los comandos reciben actor, funcion, reloj e IDs, devuelven resultado tipado y actualizan entidad/cuentas/historial/auditoria en conjunto.
- Completado: movimientos operativos con validacion de funcion/caja, cuentas, contramovimientos y auditoria.
- Completado: locales/maquinas con validacion de rol, referencias, taller, cuentas, historial y auditoria.
- Pendiente: aplicar autorizacion de rol, funcion activa y local asignado de forma uniforme dentro de apertura, contadores, cierre y salarios.
- Pendiente: extraer cierres periodicos y revision/anulacion administrativa de gastos que aun se resuelven en handlers React.

No agregar Redux o un store complejo antes de definir comandos.

## Prioridad 4 - Cobertura automatizada

Agregar en este orden:

- Completado: apertura -> contadores -> cierre;
- Completado: correccion/anulacion de diferencias y saldos;
- Completado: alta, correccion y anulacion de pagos/adelantos/descuentos;
- Completado: movimientos operativos;
- Completado: cierre salarial definitivo, bloqueo de periodo y revisiones correctivas enlazadas;
- Completado: creacion, asignacion, ajuste, reset, traslado y eliminacion de maquinas, incluidos bloqueos con caja abierta;
- Completado inicial: migracion de ID historico, limpieza de imagenes y reconstruccion de asientos faltantes;
- Completado: ciclo integrado de caja, saldos, liquidacion, diferencias y roundtrip de snapshot; la migracion reconstruye la salida de efectivo faltante en transferencias.
- Completado inicial: permisos por rol y requisito de caja abierta;
- Completado inicial: E2E Playwright de apertura, carga de las tres maquinas, cierre y persistencia despues de recargar;
- Completado: E2E de conflicto entre dos pestañas y recuperacion sin sobrescritura;
- Completado: E2E de cierre salarial, bloqueo, correccion R1 y conservacion de la foto R0;
- Pendiente: pruebas UI automatizadas de formularios administrativos y flujos completos del encargado;
- Completado manual/documentado: smoke de cajero, encargado y administrador en navegador.

## Prioridad 5 - Navegacion y UI compartida

- Completado: registro unico de pantalla, titulo, menu y roles.
- Completado: React Router en modo declarativo, URL estable por pantalla, rutas directas, recarga, Atrás/Adelante y sesion local de pestaña.
- Completado: protecciones de ruta por funcion activa y caja abierta conservando `screenDefinitions` como matriz central.
- Completado: confirmacion compartida.
- Completado: mensajes con ciclo de vida claro para evitar avisos obsoletos.
- Completado: modales con foco/Escape, avisos anunciables, filas clicables por teclado y `aria-sort` en encabezados ordenables.
- Mover componentes transversales fuera de features propietarias.
- Completado: CSS dividido por base, layout, features y responsive, preservando exactamente el orden original.
- Completado: pantallas funcionales cargadas bajo demanda; despues de incorporar React Router el bundle inicial mide 328,76 kB, sin advertencia de chunk grande y por debajo del historico de 507,03 kB.

## Prioridad tecnica vigente

1. Reforzar autorizacion dentro de comandos y separar usuario real, funcion activa y locales permitidos.
2. Extraer a comandos las operaciones sensibles que todavia modifican varias colecciones desde React.
3. Ampliar pruebas de cierre periodico y permisos negativos.
4. Completar al final la validacion runtime profunda del snapshot.

Completado 2026-07-16: una sola caja abierta por local, bloqueos de maquinas/local con caja abierta, periodos salariales validos, referencias ampliadas, auditoria historica estable y guardado local con deteccion de conflictos.

Completado 2026-07-16: cierre salarial mensual inmutable por empleado, esquema 3, bloqueo transversal del periodo y ciclo correctivo auditado R1/R2 sin reescribir cierres anteriores.

Postergado por decision de producto: contexto operativo multi-local. Mientras el foco siga exclusivamente en Poseidon no se implementa selector de local activo.

### Pendiente reservado para el bloque final

**Validacion profunda del snapshot**

- definir esquemas runtime para todas las colecciones, campos, enums e importes finitos;
- validar referencias entre balances, lecturas, maquinas, movimientos, personal, clientes y cierres;
- aplicar migraciones incrementales por `schemaVersion` antes de normalizar;
- conservar el JSON original y producir un informe de errores sin borrar relaciones silenciosamente;
- cubrir snapshots validos, heredados, corruptos y con referencias huerfanas mediante fixtures.

La libreria de esquema runtime se elegira al iniciar ese bloque; no se agrega una dependencia antes de necesitarla.

## Preparacion online sin implementacion

- Arquitectura objetivo: `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`.
- Plan reversible: `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`.
- Completado en local: puerto `AppDataRepository`, codec de respaldo, adaptador `localStorage` y cola asincrona de escrituras.
- Completado en local: control optimista de version, respaldo del intento fallido y recuperacion explicita ante conflicto.
- Mientras no se autorice: mantener adaptador local y no crear conexiones/credenciales.

## Reglas para ahorrar tokens

- Buscar simbolos/rangos, no leer archivos grandes completos.
- Un objetivo por modulo o corte transversal bien definido.
- Contextos cortos enlazan fuentes; no copian reglas.
- Git conserva historial; documentos muestran estado vigente.
- Hacer commit local al estabilizar un bloque.
- Si el diff mezcla temas, dividir antes de validar.

## Agentes y subagentes Codex

- Configuracion en `.codex/config.toml` sin limites propios de hilos o profundidad; se conserva `interrupt_message`.
- Perfiles de solo lectura: alcance, revision contable y custodio de diseno.
- La concurrencia se decide por independencia y utilidad dentro de la capacidad disponible de Codex.
- Delegar solo trabajo independiente que evite contaminar el contexto principal.
- No usar subagentes para comandos simples, cambios evidentes ni revisiones duplicadas.
- El agente principal integra resultados, controla escritura, valida y documenta.
- Completado: piloto de Diferencias de caja con mapa de alcance y revision contable, sin cambios funcionales.
- Ajuste aplicado tras el piloto: limites explicitos de archivos, palabras, riesgos y pruebas por perfil.
- Completado 2026-07-11: una tarea nueva comprobo presencia y obediencia nominal de los tres perfiles; la API disponible no expone selector nativo `agent_type`.
- Completado 2026-07-11: `pnpm run check:agents` valida 28 controles y forma parte de `pnpm run check`.
- Completado 2026-07-11: tres pilotos UI utiles justifican fortalecer el perfil visual existente, sin crear un cuarto agente.
- Completado 2026-07-11: patrones, referencias y control automatico viven en `docs/SISTEMA_VISUAL_POSEIDON.md`, `docs/referencias-visuales/` y `pnpm run check:design`.
- Cada delegacion usa plantilla y registro acumulado; no se crea un perfil nuevo sin tres usos utiles documentados de la misma especialidad.
- El agente principal conserva responsabilidad exclusiva sobre integracion, validacion, documentacion y Git.
- Fuente canonica: `docs/PROTOCOLO_AGENTES_CODEX.md`.
- Validacion de subagentes: `docs/VALIDACION_SUBAGENTES_EN_DIFERENCIAS.md`.
- Revisiones visuales: `docs/REVISIONES_DE_DISENO_POSEIDON.md`.
- Registro: `docs/REGISTRO_DELEGACIONES_AGENTES.md`.

## Skills y control previo al commit

- Completado 2026-07-12: cuatro skills del repositorio para cambio modular, QA visual, regresion contable y localhost.
- Las skills viven en `.agents/skills/` y referencian fuentes canonicas sin copiar reglas de producto.
- `pnpm run check:skills` valida estructura, disparadores, metadata y referencias.
- `pnpm run check:commit` selecciona controles segun las rutas preparadas; `.githooks/pre-commit` lo ejecuta automaticamente en este repositorio.
- Validacion real aprobada: 17 rutas, `check` y `build`, 102 pruebas, sin cambios funcionales. Evidencia en `docs/VALIDACION_SKILLS_Y_PRECOMMIT.md`.
- GitHub queda diferido hasta decidir trabajo remoto. Supabase y Vercel siguen fuera del flujo local.

## Validacion por bloque

```text
pnpm run check
pnpm run build
pnpm run smoke:localhost
pnpm run check:commit
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
