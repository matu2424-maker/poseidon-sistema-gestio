# Poseidon - Handoff tecnico

Ultima actualizacion: 2026-07-11

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
- Archivos actuales: metadata, no storage real.
- Backend/Auth/Storage/publicacion: pendientes y fuera de alcance sin autorizacion.

## Entorno

```text
pnpm run check:agents
pnpm run check
pnpm run build
iniciar-poseidon.bat
http://127.0.0.1:5173/
detener-poseidon.bat
```

No usar Python, `pnpm preview` ni servidores alternativos para localhost.

## Arquitectura actual

- `src/App.tsx`: estado global, usuario/funcion, navegacion, apertura y composicion.
- `src/types.ts`: contrato de datos actual.
- `src/data/appData.ts`: seed, reset y normalizacion local.
- `src/lib/`: reglas y helpers compartidos.
- `src/components/`: UI transversal.
- `src/features/`: pantallas por dominio/rol.
- `src/styles/global.css`: estilos globales.
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
- Helpers de dinero, periodos, cuentas, diferencias, salarios, auditoria y ordenamiento compartidos.
- Pruebas unitarias para periodos, referencias de caja, diferencias, movimientos/saldo corrido y limites salariales.
- Documentacion modular y `AGENTS.md` por feature.

## Riesgos conocidos

- `localStorage` no es multiusuario ni persistencia durable.
- La compaccion puede recortar historial por cuota.
- Componentes grandes mezclan UI y operaciones de negocio.
- Pruebas de flujos completos todavia pendientes.
- Manejo de fecha local requiere endurecimiento.
- Permisos de frontend no sustituyen seguridad de backend.

## Prioridad recomendada

1. Higiene tecnica pequeña y pruebas de fecha/persistencia.
2. Dividir `LocationsMachines.tsx` conservando comportamiento.
3. Dividir Movimientos y Salarios.
4. Extraer comandos puros de dominio.
5. Versionar/validar snapshot local.
6. Preparar repositorios manteniendo adaptador local.

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
