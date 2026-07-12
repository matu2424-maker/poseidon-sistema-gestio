# Poseidon - Handoff tecnico

Ultima actualizacion: 2026-07-12

Este documento permite continuar el proyecto desde otra cuenta o agente sin leer el chat. Las reglas completas viven en las fuentes canonicas enlazadas; no deben reconstruirse desde este resumen.

## Ordenes directas

1. Trabaja por modulos y propone antes de editar, salvo orden literal u objetivo activo.
2. No publiques, despliegues ni conectes servicios externos sin confirmacion explicita.
3. No borres historial operativo; usa anulacion, estado, papelera o ajuste auditado.
4. No cambies reglas contables sin leer `docs/REGLAS_CONTABLES.md`.
5. Toda tabla de datos debe ordenar sus columnas visibles, salvo acciones/seleccion o excepcion aprobada.
6. Documenta cada cambio en su fuente canonica y modulo.
7. Valida, y crea commit local cuando el bloque quede estable; no hagas push sin pedido.
8. Para subagentes, sigue `docs/PROTOCOLO_AGENTES_CODEX.md`, registra cada delegacion y conserva la integracion/Git en el agente principal.

## Inicio rapido

1. Leer `AGENTS.md`.
2. Leer `docs/INDICE_DOCUMENTACION.md`.
3. Leer `docs/CONTEXTO_RAPIDO_CODEX.md`.
4. Ejecutar `git status --short` y `git log -1 --oneline`.
5. Abrir el `AGENTS.md`, contexto corto y modulo de la feature a trabajar.

No cargar todos los documentos grandes por defecto.

## Estado del producto

- Sistema de gestion para caja diaria, maquinas, movimientos, salarios, clientes, locales, cuentas, reportes y auditoria.
- Local principal de prueba: Poseidon.
- Roles: Cajero, Encargado y Administrador.
- Encargado/Administrador pueden trabajar con funcion Cajero manteniendo identidad real en auditoria.
- Persistencia actual: `localStorage`.
- Login actual: selector de usuario, sin contrasena.
- Navegacion actual: React Router con URL estable por modulo y sesion de pestaña en `sessionStorage`.
- Archivos actuales: metadata, no storage real.
- Backend/Auth/Storage/publicacion: pendientes y fuera de alcance sin autorizacion.

## Entorno

```text
pnpm run check:agents
pnpm run check:skills
pnpm run check:design
pnpm run check
pnpm run build
pnpm run check:commit
iniciar-poseidon.bat
http://127.0.0.1:5173/
detener-poseidon.bat
```

No usar Python, `pnpm preview` ni servidores alternativos para localhost.

## Arquitectura actual

- `src/App.tsx`: orquestacion global, usuario/funcion, local activo, navegacion, apertura y composicion.
- `src/navigation/screens.ts`: matriz tipada de ruta, titulo, rol, menu y requisito de caja.
- `src/infrastructure/session/`: persistencia local de `userId` y funcion activa durante la pestaña.
- `src/types.ts`: contrato de datos actual.
- `src/data/appData.ts`: seed, reset y fachada de datos iniciales.
- `src/data/normalizeData.ts`: migracion y normalizacion del snapshot.
- `src/application/`: comandos de negocio y contratos de persistencia.
- `src/infrastructure/storage/`: snapshot versionado y adaptador `localStorage`.
- `src/lib/`: reglas y helpers compartidos.
- `src/components/`: UI transversal.
- `src/features/`: pantallas por dominio/rol.
- `src/styles/global.css`: manifiesto de capas CSS; estilos reales en `base`, `layout`, `features` y `responsive`.
- `docs/MAPA_TECNICO.md`: propiedad, dependencias y deuda vigente.
- `.codex/` y `scripts/validate-agent-config.mjs`: perfiles y validacion automatica de infraestructura Codex.
- `docs/REGISTRO_DELEGACIONES_AGENTES.md`: medicion real de subagentes, sin inventar tokens ni tiempos.

## Reglas funcionales criticas

- Resultado economico = resultado maquinas - gastos - salarios - regalos.
- Transferencias, aportes, retiros y saldos iniciales no alteran resultado economico.
- Diferencias de efectivo/banco no alteran resultado economico; sincronizan cuentas con lo declarado.
- Estados de diferencia: `PENDIENTE`, `VERIFICADA`, `CORREGIDA`, `ANULADA`.
- Periodo salarial trabajado y caja de pago son dimensiones distintas (`period` y `balanceId`).
- Salario, adelantos y descuentos respetan limites de base documentados.
- IN/OUT actual nunca puede quedar por debajo del anterior.
- Cerrar un local envia sus maquinas al Taller con confirmacion/auditoria.
- Maquina con recaudaciones no se elimina directamente.

Ver detalle en `POSEIDON_FUNCIONAMIENTO`, `REGLAS_CONTABLES` y `docs/modulos/`.

## Auditoria

Toda accion sensible debe registrar cuando corresponda:

- fecha/hora;
- usuario real;
- rol real;
- funcion usada;
- accion, entidad e ID;
- valor anterior/nuevo;
- motivo u observacion.

## Estado tecnico

- TypeScript estricto.
- Features principales extraidas de `App.tsx`.
- Comandos extraidos para caja, contadores, diferencias, movimientos, salarios, locales y maquinas.
- Puerto asincrono `AppDataRepository`, codec de respaldo, adaptador local y cola ordenada de escrituras.
- Helpers de dinero, periodos, cuentas, diferencias, salarios, auditoria y ordenamiento compartidos.
- 107 pruebas aprobadas en 25 archivos, mas 6 casos E2E en 3 archivos para caja, diferencias/auditoria y rutas de los tres roles.
- Tres perfiles Codex de solo lectura, cuatro skills versionadas y validadores de agentes, skills y sistema visual.
- Documentacion modular y `AGENTS.md` por feature.

## Riesgos conocidos

- `localStorage` no es multiusuario ni persistencia durable.
- La cuota de `localStorage` puede impedir un guardado; el sistema no recorta historial y exige recuperar o exportar.
- El local operativo sigue fijado a Poseidon/primer local; el modelo multi-local existe, pero falta contexto de local activo.
- Apertura, contadores, cierre y salarios no verifican aun de forma uniforme rol, funcion activa y local asignado dentro de cada comando.
- La apertura solo bloquea otra caja abierta para el mismo local y fecha; la unicidad por local depende tambien del flujo visual.
- Cierres salariales, cierres periodicos, control administrativo de gastos y algunos maestros mantienen mutaciones en handlers React.
- Faltan E2E y pruebas completas para formularios administrativos, cierres salariales/periodicos y ciclo de maquinas.
- La validacion inicial del snapshot es estructuralmente superficial antes de la normalizacion.
- Permisos de frontend no sustituyen seguridad de backend.

## Prioridad recomendada

1. Aplicar autorizacion uniforme dentro de comandos: usuario real, funcion activa y locales permitidos.
2. Introducir un contexto real de local activo y blindar una sola caja abierta por local.
3. Extraer cierres salariales, cierres periodicos y anulaciones administrativas sensibles a comandos.
4. Ampliar pruebas negativas de permisos y ciclos completos de salarios y maquinas.
5. Profundizar validacion runtime del snapshot y separar tipos canonicos de compatibilidad heredada.
6. Mantener el adaptador local hasta que el usuario autorice diseño SQL, Auth/RLS y Storage de prueba.

Plan vigente: `docs/PLAN_MEJORA_TECNICA_Y_TOKENS.md`.

## Preparacion online

- Arquitectura objetivo: `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`.
- Plan reversible: `docs/PLAN_MIGRACION_LOCAL_A_ONLINE.md`.
- Son documentos de diseño, no autorización de implementación.

## Cierre de cada tarea

1. Verificar requisito por requisito.
2. Ejecutar pruebas y build proporcionados al riesgo.
3. Comprobar localhost en navegador cuando cambia UI/flujo.
4. Actualizar fuente canonica y modulo.
5. Revisar `git diff --check` y `git status --short`.
6. Crear commit local si el bloque esta estable.
7. Informar claramente lo no probado o pendiente.
