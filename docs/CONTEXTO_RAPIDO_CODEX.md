# Poseidon - Contexto rapido para Codex

Ultima actualizacion: 2026-07-11

Leer `docs/INDICE_DOCUMENTACION.md` si no esta claro que documento corresponde a la tarea.

## Estado actual

- Aplicacion React + Vite + TypeScript.
- Persistencia local en `localStorage`, clave `poseidon-sistema-gestion-v2`.
- Login de prueba por seleccion de usuario, sin contrasena.
- Local principal: Poseidon; estructura preparada para multi-local.
- Archivos guardan metadata local, no contenido persistente real.
- Supabase/Auth/Storage y publicacion quedan pendientes y requieren autorizacion explicita.
- `src/App.tsx` orquesta estado; `src/navigation/screens.ts` define pantallas/permisos y `src/navigation/lazyScreens.ts` carga las pantallas funcionales bajo demanda.
- `src/data/normalizeData.ts` migra/normaliza el snapshot; `src/infrastructure/storage/` valida y persiste.
- Pruebas actuales: 58 casos en 18 archivos, incluidos ciclo financiero completo, diferencias, salarios, cuentas, migracion, activos, repositorio y permisos; ademas un E2E critico de cajero.
- Infraestructura Codex: `.codex/config.toml` limita concurrencia/profundidad y `.codex/agents/` contiene perfiles de solo lectura para alcance, contabilidad e interfaz.
- Piloto de Diferencias completado en solo lectura; resultados y riesgos para futuros objetivos en `docs/PILOTO_SUBAGENTES_DIFERENCIAS.md`.

## Usuarios de prueba

- `cajero1`, `cajero2`: Cajero.
- `encargado`: Encargado.
- `admin`: Administrador.

## Reglas que no se deben inferir de nuevo

- Resultado economico = resultado maquinas - gastos - salarios - regalos.
- Transferencias, aportes, retiros y saldos iniciales son financieros; no cambian resultado economico.
- Diferencias no cambian resultado economico; si sincronizan las cuentas del local con lo declarado.
- Estados vigentes de diferencias: `PENDIENTE`, `VERIFICADA`, `CORREGIDA`, `ANULADA`.
- La liquidacion salarial se asocia al periodo trabajado; la caja se asocia por `balanceId`.
- No borrar historial operativo: anular, desactivar, enviar a papelera o ajustar con auditoria.
- Toda accion sensible registra usuario real, rol real, funcion usada, fecha/hora y motivo cuando corresponde.
- Toda tabla de datos permite ordenar sus columnas visibles, excepto acciones/seleccion o excepcion documentada.
- No publicar, desplegar ni conectar servicios externos sin confirmacion.

Detalle completo: `docs/REGLAS_CONTABLES.md`, `docs/REGLAS_GENERALES.md` y `docs/REGLAS_VISUALES.md`.

## Ruta de lectura por tarea

1. `AGENTS.md`.
2. `AGENTS.md` de la feature.
3. Contexto corto en `docs/contextos/`.
4. Modulo afectado en `docs/modulos/`.
5. Agregar reglas contables, visuales o mapa tecnico solo si la tarea los necesita.

Para delegar trabajo, leer `docs/PROTOCOLO_AGENTES_CODEX.md`. No crear subagentes para tareas simples ni superar dos ejecuciones paralelas.

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

## Comandos

```text
pnpm run check
pnpm run build
iniciar-poseidon.bat
pnpm run smoke:localhost
```

Para liberar el puerto: `detener-poseidon.bat`. No usar servidores alternativos.

## Proxima prioridad tecnica

Mantener todo local. Comandos criticos, integracion contable y puerto de persistencia ya estan probados. El proximo trabajo debe volver a un modulo funcional concreto; no hace falta otra refactorizacion transversal amplia.
