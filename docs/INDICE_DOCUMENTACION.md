# Poseidon - Indice de documentacion

Ultima actualizacion: 2026-07-11

Este archivo es la puerta de entrada a la documentacion. Su objetivo es cargar solo el contexto necesario y evitar que una misma regla quede copiada en varios lugares.

## Estado y limite actual

- Poseidon funciona localmente con React, TypeScript, Vite y `localStorage`.
- No hay autenticacion, base de datos ni almacenamiento remoto activos.
- No publicar, desplegar ni conectar servicios externos sin autorizacion explicita.
- La arquitectura online esta documentada como objetivo futuro, no como estado implementado.

## Lectura minima por tipo de tarea

### Retomar una tarea normal

1. `AGENTS.md`.
2. `docs/CONTEXTO_RAPIDO_CODEX.md`.
3. `AGENTS.md` de la feature afectada.
4. Contexto corto de `docs/contextos/`.
5. Documento correspondiente de `docs/modulos/`.

### Cambiar reglas contables

Agregar:

- `docs/REGLAS_CONTABLES.md`.
- `docs/POSEIDON_FUNCIONAMIENTO.md`, solo la seccion relacionada.

### Cambiar interfaz

Agregar:

- `docs/REGLAS_VISUALES.md`.

### Mover o dividir codigo

Agregar:

- `docs/MAPA_TECNICO.md`.
- `docs/MODULARIZACION_REFERENCIAS.md`.
- `docs/PLAN_MEJORA_TECNICA_Y_TOKENS.md` si cambia el plan tecnico.

### Retomar desde otra cuenta o agente

1. `docs/HANDOFF_TECNICO_POSEIDON.md`.
2. Seguir desde ahi la lectura minima del modulo.

### Delegar con agentes o subagentes Codex

1. `docs/PROTOCOLO_AGENTES_CODEX.md`.
2. `AGENTS.md` y contexto corto de la feature afectada.
3. Agregar reglas contables o visuales solo cuando correspondan al perfil convocado.
4. Al terminar, registrar el subagente en `docs/REGISTRO_DELEGACIONES_AGENTES.md` con `docs/plantillas/REPORTE_DELEGACION_AGENTES.md`.

### Preparar futura migracion online

1. `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`.
2. `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`.
3. `docs/REGLAS_CONTABLES.md`.
4. `docs/MAPA_TECNICO.md`.

## Fuentes canonicas

| Tema | Fuente canonica | No duplicar en |
| --- | --- | --- |
| Forma de trabajo, documentacion y auditoria transversal | `docs/REGLAS_GENERALES.md` | Contextos, handoff, retomar |
| Calculos e impactos economicos/financieros | `docs/REGLAS_CONTABLES.md` | Mapa tecnico, plan, handoff |
| Criterios visuales y tablas | `docs/REGLAS_VISUALES.md` | Modulos no visuales, handoff |
| Comportamiento funcional completo | `docs/POSEIDON_FUNCIONAMIENTO.md` | Mapa tecnico, contexto rapido |
| Reglas de una pantalla o modulo | `docs/modulos/` | Retomar, plan tecnico |
| Contexto corto de trabajo | `docs/contextos/` | Documentos funcionales largos |
| Propiedad de archivos y dependencias | `docs/MAPA_TECNICO.md` | Funcionamiento, reglas visuales |
| Estrategia de extraccion/refactor | `docs/MODULARIZACION_REFERENCIAS.md` | Handoff, retomar |
| Prioridades tecnicas vigentes | `docs/PLAN_MEJORA_TECNICA_Y_TOKENS.md` | Historial de cambios |
| Ultimo punto de continuidad | `docs/RETOMAR_MANANA.md` | Reglas permanentes |
| Ejecucion local | `README.md` | Documentos funcionales |
| Validacion automatica y smoke por rol | `docs/VALIDACION_LOCAL.md` | Modulos funcionales |
| Agentes, subagentes y delegacion Codex | `docs/PROTOCOLO_AGENTES_CODEX.md` | Contextos y modulos funcionales |
| Medicion de subagentes | `docs/REGISTRO_DELEGACIONES_AGENTES.md` | Pilotos y documentos funcionales |
| Arquitectura futura online | `docs/ARQUITECTURA_OBJETIVO_ONLINE.md` | Estado actual |
| Secuencia de migracion futura | `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md` | Codigo actual |

## Modulos funcionales

- `docs/modulos/00_base_sistema.md`
- `docs/modulos/01_panel_cajero.md`
- `docs/modulos/02_caja_diaria.md`
- `docs/modulos/03_contadores.md`
- `docs/modulos/04_movimientos_operativos.md`
- `docs/modulos/05_cierre_caja.md`
- `docs/modulos/06_diferencias_caja.md`
- `docs/modulos/07_panel_encargado.md`
- `docs/modulos/08_panel_administrador.md`
- `docs/modulos/09_locales_maquinas_taller.md`
- `docs/modulos/10_clientes_personal_sueldos.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/modulos/12_auditoria.md`

## Contextos cortos

- `CODEX_CAJA`: caja, contadores, movimientos y cierre.
- `CODEX_DIFERENCIAS`: control y correccion de diferencias.
- `CODEX_CUENTAS_CORRIENTES`: saldos y movimientos.
- `CODEX_SALARIOS`: personal, pagos y liquidaciones.
- `CODEX_ENCARGADO`: panel y funciones del encargado.
- `CODEX_ADMINISTRACION`: funciones generales de administrador.
- `CODEX_LOCALES_MAQUINAS`: locales, maquinas y taller.
- `CODEX_CLIENTES_PERSONAL`: clientes, personal y papelera.
- `CODEX_AUDITORIA`: trazabilidad.
- `CODEX_LAYOUT_BASE`: navegacion, roles y layout.

Todos viven en `docs/contextos/`.

## Estudios tecnicos

- `docs/PILOTO_SUBAGENTES_DIFERENCIAS.md`: primer piloto de delegacion, validacion de perfiles y cierre de los riesgos tecnicos priorizados. No redefine la regla de resultado economico.
- `docs/REGISTRO_DELEGACIONES_AGENTES.md`: resultado y eficiencia de cada delegacion real.
- `docs/plantillas/REPORTE_DELEGACION_AGENTES.md`: campos obligatorios para nuevas entradas.

## Regla de mantenimiento

- Una regla se modifica primero en su fuente canonica.
- Los demas documentos solo deben enlazarla o resumirla en una frase.
- `RETOMAR_MANANA` registra estado y proximo paso, no reglas completas.
- Git conserva el historial; los planes no deben acumular listas extensas de trabajo ya terminado.
- Antes de cerrar un cambio documental, verificar referencias, contradicciones, `git diff --check` y estado del repositorio.
