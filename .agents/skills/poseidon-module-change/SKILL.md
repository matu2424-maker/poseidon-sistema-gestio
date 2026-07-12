---
name: poseidon-module-change
description: Ejecuta cambios funcionales, tecnicos o documentales por modulo en Poseidon. Usar cuando el usuario autorice implementar, corregir, refactorizar o documentar un bloque del sistema y sea necesario controlar alcance, dependencias cruzadas, validacion, documentacion y cierre Git local.
---

# Poseidon Module Change

Aplicar el flujo modular canonico de Poseidon sin cargar todo el proyecto ni duplicar reglas.

## Flujo

1. Leer `AGENTS.md`, `docs/CONTEXTO_RAPIDO_CODEX.md` y `docs/INDICE_DOCUMENTACION.md`.
2. Localizar la feature propietaria, su `AGENTS.md`, su contexto en `docs/contextos/` y su documento en `docs/modulos/`.
3. Agregar `docs/REGLAS_CONTABLES.md`, `docs/REGLAS_VISUALES.md` o `docs/MODULARIZACION_REFERENCIAS.md` solo si el cambio lo exige.
4. Confirmar que existe una orden literal de ejecutar o un objetivo activo que incluya el cambio. Si no existe, presentar alcance, archivos, riesgos y pruebas, y esperar autorizacion.
5. Buscar simbolos y relaciones dirigidas. No leer archivos grandes completos si alcanza con rangos concretos.
6. Delimitar una unidad funcional pequena. Preservar contratos entre modulos, IDs asociados, permisos, auditoria e historial.
7. Delegar solo si `docs/PROTOCOLO_AGENTES_CODEX.md` demuestra una ventaja real. Mantener la integracion en el agente principal.
8. Implementar con los patrones existentes. No mezclar una regla de negocio con una refactorizacion mecanica amplia.
9. Actualizar la fuente canonica afectada antes de cerrar el bloque.
10. Ejecutar validaciones proporcionales y terminar con `pnpm run check:commit`.
11. Revisar el diff completo. Sugerir commit local cuando el bloque este estable; no hacer push ni publicar sin autorizacion explicita.

## Validacion minima

- Codigo o configuracion: `pnpm run check` y `pnpm run build`.
- Interfaz o permisos: agregar validacion por rol y usar `$poseidon-visual-qa`.
- Contabilidad: usar `$poseidon-accounting-regression`.
- Servidor: usar `$poseidon-localhost-diagnostics` y confirmar la aplicacion en el navegador.
- Toda modificacion: `git diff --check` y documentacion vigente.

## Limites

- Aplicar las restricciones vigentes de `AGENTS.md` y `docs/REGLAS_GENERALES.md` sin copiarlas a esta skill.
- Tomar reglas funcionales, contables y visuales solamente de sus fuentes canonicas.
- No resolver por inferencia una decision de producto, publicacion o conexion externa.

## Cierre

Informar cambios, pruebas ejecutadas, riesgos residuales y estado Git. No afirmar que localhost funciona sin comprobacion en navegador.
