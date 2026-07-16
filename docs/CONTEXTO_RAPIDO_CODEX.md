# Poseidon - Contexto rapido para Codex

Ultima actualizacion: 2026-07-16

Leer `docs/INDICE_DOCUMENTACION.md` si no esta claro que documento corresponde a la tarea.

## Estado actual

- Aplicacion React + React Router + Vite + TypeScript.
- Persistencia local en `localStorage`, clave `poseidon-sistema-gestion-v2`.
- Login de prueba por seleccion de usuario, sin contrasena.
- Local principal: Poseidon; estructura preparada para multi-local.
- Archivos guardan metadata local, no contenido persistente real.
- Supabase/Auth/Storage y publicacion quedan pendientes y requieren autorizacion explicita.
- `src/App.tsx` orquesta estado y sesion; `src/navigation/screens.ts` define ruta/pantalla/permisos y `src/navigation/lazyScreens.ts` carga las pantallas funcionales bajo demanda.
- La URL conserva el modulo; `sessionStorage` conserva solo `userId` y funcion activa durante la pestaña. No reemplaza Auth real.
- `src/data/normalizeData.ts` normaliza estructura; `src/data/migrateData.ts` aplica migraciones incrementales y `src/infrastructure/storage/` valida y persiste el esquema 4.
- Pruebas actuales: 155 casos en 29 archivos, mas 10 E2E en 5 archivos: ciclo critico de cajero, efectivo negativo, desconciliacion caja/libro, disponibilidad de efectivo, diferencias/auditoria, rutas por rol, conflicto entre pestañas, cierre salarial correctivo y coordinacion de chats.
- Infraestructura Codex: `.codex/config.toml` conserva interrupciones visibles sin fijar hilos ni profundidad; `.codex/agents/` contiene perfiles de solo lectura para alcance, contabilidad e interfaz.
- `pnpm run check:agents` valida 28 controles y cada delegacion se mide en `docs/REGISTRO_DELEGACIONES_AGENTES.md`.
- `pnpm run check:workstreams` valida los chats permanentes Cajero, Encargado y Administrador, sus prompts, contextos, propietarios y contratos reservados.
- `poseidon_ui_reviewer` es custodio de diseno en modos propuesta/verificacion; patrones y referencias viven en `docs/SISTEMA_VISUAL_POSEIDON.md` y `docs/referencias-visuales/`.
- `pnpm run check:design` valida 38 controles de gobierno visual, referencias, tablas accesibles y pesos operativos hasta `600` sin mezclarlo con reglas funcionales.
- Cuatro skills versionadas en `.agents/skills/` cubren cambio modular, QA visual, regresion contable y diagnostico de localhost.
- `pnpm run check:skills` valida sus contratos; `pnpm run check:commit` es la entrada unica previa al commit.
- Validacion de subagentes cerrada: perfiles comprobados en tarea nueva y riesgos priorizados implementados con pruebas. Evidencia en `docs/VALIDACION_SUBAGENTES_EN_DIFERENCIAS.md`.
- Validacion de skills cerrada: cambio modular y control previo al commit comprobados sin modificar funcionalidad. Evidencia en `docs/VALIDACION_SKILLS_Y_PRECOMMIT.md`.

## Usuarios de prueba

- `cajero1`, `cajero2`: Cajero.
- `encargado`: Encargado.
- `admin`: Administrador.

## Reglas que no se deben inferir de nuevo

- Resultado economico = resultado maquinas - gastos - salarios - regalos.
- Transferencias, aportes, retiros y saldos iniciales son financieros; no cambian resultado economico.
- Ninguna nueva salida en efectivo puede dejar `Local / Efectivo` negativo; el cierre tambien se bloquea si el efectivo esperado es negativo hasta registrar un aporte real.
- Durante una caja abierta, `efectivo esperado` debe coincidir con `Local / Efectivo`. Un delta tecnico bloquea la operativa y no se corrige con un aporte ordinario.
- La migracion esquema 3 -> 4 puede agregar un puente `MIGRACION` solo si las transferencias historicas reconstruidas explican exactamente el delta; no cambia banco ni resultado economico.
- Diferencias no cambian resultado economico; si sincronizan las cuentas del local con lo declarado.
- Estados vigentes de diferencias: `PENDIENTE`, `VERIFICADA`, `CORREGIDA`, `ANULADA`.
- `ANULADA` es terminal; no se gestionan diferencias con caja abierta del mismo local y una gestion historica no reescribe cajas posteriores.
- La liquidacion salarial se asocia al periodo trabajado; la caja se asocia por `balanceId`.
- Un cierre salarial congela el mes por empleado. El periodo queda bloqueado y solo una revision correctiva enlazada puede modificarlo.
- No borrar historial operativo: anular, desactivar, enviar a papelera o ajustar con auditoria.
- Toda accion sensible registra usuario real, rol real, funcion usada, fecha/hora y motivo cuando corresponde.
- Toda tabla de datos permite ordenar sus columnas visibles, excepto acciones/seleccion o excepcion documentada.
- Solo existe una caja abierta por local; con caja abierta no se mueve/asigna maquina, no se ajustan sus contadores administrativos y no se cierra el local.
- Una pestaña desactualizada no sobrescribe otra: el guardado se bloquea y conserva un respaldo pendiente.
- No publicar, desplegar ni conectar servicios externos sin confirmacion.

Detalle completo: `docs/REGLAS_CONTABLES.md`, `docs/REGLAS_GENERALES.md` y `docs/REGLAS_VISUALES.md`.

## Ruta de lectura por tarea

1. `AGENTS.md`.
2. `AGENTS.md` de la feature.
3. Contexto corto en `docs/contextos/`.
4. Modulo afectado en `docs/modulos/`.
5. Agregar reglas contables, visuales o mapa tecnico solo si la tarea los necesita.

Para delegar trabajo, leer `docs/PROTOCOLO_AGENTES_CODEX.md`. No crear subagentes para tareas simples; usar la capacidad disponible solo con trabajos independientes. Registrar cada resultado y exigir tres delegaciones utiles de la misma necesidad antes de proponer un perfil nuevo. Las tres revisiones de diseno estan consolidadas en `docs/REVISIONES_DE_DISENO_POSEIDON.md`.

Para un procedimiento repetible, leer `docs/SKILLS_POSEIDON.md` y usar solo la skill aplicable. No confundir una skill con permiso para editar ni con un perfil permanente.

No releer por defecto `POSEIDON_FUNCIONAMIENTO`, `MAPA_TECNICO` y `HANDOFF` completos.

## Documentacion obligatoria al cambiar

- Regla global: `REGLAS_GENERALES.md`.
- Calculo/impacto: `REGLAS_CONTABLES.md`.
- Diseño: `REGLAS_VISUALES.md`.
- Flujo funcional: `POSEIDON_FUNCIONAMIENTO.md` y modulo correspondiente.
- Propiedad/dependencia tecnica: `MAPA_TECNICO.md`.
- Refactor: `MODULARIZACION_REFERENCIAS.md`.
- Continuidad inmediata: `RETOMAR_MANANA.md`.
- Ejecucion: `README.md`.
- Coordinacion entre chats: `docs/coordinacion/README.md` y `docs/coordinacion/WORKSTREAMS.json`.

## Comandos

```text
pnpm run check:agents
pnpm run check:workstreams
pnpm run check:skills
pnpm run check:design
pnpm run check
pnpm run build
pnpm run check:commit
iniciar-poseidon.bat
pnpm run smoke:localhost
```

Para liberar el puerto: `detener-poseidon.bat`. No usar servidores alternativos.

## Proxima prioridad tecnica

Mantener todo local y enfocado en Poseidon. La prioridad es reforzar autorizacion dentro de comandos, extraer operaciones sensibles que aun viven en handlers React y completar al final la validacion runtime profunda del snapshot. La primera migracion incremental financiera y la reconciliacion caja/libro ya estan implementadas. Multi-local queda postergado. El detalle vigente esta en `docs/PLAN_MEJORA_TECNICA_Y_TOKENS.md` y `docs/MAPA_TECNICO.md`.
