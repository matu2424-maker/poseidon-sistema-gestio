# Poseidon Sistema de Gestion - Instrucciones para Codex

## Objetivo

Construir una aplicacion web administrativa para gestionar caja diaria, maquinas tragamonedas, gastos, transferencias, regalos, cierres, reportes y auditoria del local Poseidon.

## Reglas de trabajo

- Trabajar por modulos cerrados y probables.
- Antes de modificar codigo, explicar el plan.
- Antes de cualquier modificacion de codigo, documentacion, configuracion o datos, pedir aprobacion explicita del usuario, salvo que el usuario haya ordenado literalmente ejecutar el cambio.
- Cuando el usuario diga "vamos a trabajar en..." o pida estudiar/revisar una funcion, tomarlo como pedido de analisis y sugerencia, no como permiso para modificar.
- Siempre dar primero una sugerencia concreta: que se cambiaria, por que, que archivos se tocarian y como se probaria.
- Solo despues de la aprobacion explicita del usuario se puede modificar archivos.
- Cuando el usuario marque un objetivo activo para ejecutar mejoras del sistema, trabajar con autonomia dentro de ese objetivo: implementar, validar, documentar y cerrar commits locales estables sin pedir permiso paso a paso.
- Aunque haya objetivo activo, no hacer push, publicacion, despliegue, conexion externa, cambios destructivos amplios ni decisiones de producto ambiguas sin confirmacion explicita.
- Despues de modificar codigo, explicar como ejecutar y probar.
- No agregar funcionalidades no solicitadas.
- Priorizar claridad, mantenibilidad y seguridad.
- Mantener preparacion multi-local aunque hoy solo exista Poseidon.
- No borrar historial operativo: desactivar, anular o ajustar con auditoria.
- Mantener actualizado `docs/POSEIDON_FUNCIONAMIENTO.md` cuando cambien reglas, pantallas, campos, flujos o calculos del sistema.
- Mantener actualizado el documento correspondiente en `docs/modulos/` cuando cambie una regla o flujo de un modulo.
- Cada modificacion de codigo debe dejar documentado el cambio donde corresponda antes de cerrar el trabajo: reglas generales, documento funcional vivo, mapa tecnico y/o modulo afectado.
- Al retomar trabajo en otra sesion, leer primero `docs/CONTEXTO_RAPIDO_CODEX.md`, `docs/REGLAS_GENERALES.md`, `docs/RETOMAR_MANANA.md`, `docs/POSEIDON_FUNCIONAMIENTO.md` y `docs/MAPA_TECNICO.md`.
- Para cambios contables, leer tambien `docs/REGLAS_CONTABLES.md`.
- Para cambios visuales, leer tambien `docs/REGLAS_VISUALES.md` y `docs/SISTEMA_VISUAL_POSEIDON.md`.
- Para modularizar o mover codigo entre archivos, leer `docs/MODULARIZACION_REFERENCIAS.md` y el contexto corto del modulo en `docs/contextos/`.
- Al dividir `AGENTS.md` por carpetas en el futuro, cada AGENTS anidado debe referenciar documentos compartidos en vez de duplicar reglas completas, porque muchos modulos estan asociados.
- No publicar en Vercel ni conectar servicios externos salvo pedido explicito del usuario.
- Hacer commit local cuando un bloque quede estable, validado y sea correcto cerrar el punto de control. No hacer push, publicacion ni despliegue sin pedido explicito del usuario.
- Para crear, modificar o validar perfiles/agentes Codex, leer `docs/PROTOCOLO_AGENTES_CODEX.md` y ejecutar `pnpm run check:agents`.
- Para crear, modificar o coordinar chats permanentes de rol, leer `docs/coordinacion/README.md` y ejecutar `pnpm run check:workstreams`.
- El gobierno operativo liviano vive en `docs/coordinacion/PROJECT_STATUS.json`, `DECISIONS.json`, `MIGRATIONS.json` y `CAPABILITIES.json`; se valida tambien con `pnpm run check:governance`.
- Para crear, modificar o usar skills del repositorio, leer `docs/SKILLS_POSEIDON.md` y ejecutar `pnpm run check:skills`.
- Registrar cada delegacion terminada en `docs/REGISTRO_DELEGACIONES_AGENTES.md` usando la plantilla canonica, sin inventar duracion ni consumo.
- No crear un perfil permanente nuevo sin tres delegaciones utiles documentadas de la misma especialidad y autorizacion explicita del usuario.
- Poseidon Central es el unico responsable de integrar resultados en `main`, validar transversalmente, resolver contradicciones y cerrar el commit de integracion. Un chat permanente de rol puede commitear solo en su rama/worktree aislado.
- Las ordenes formales se usan para trabajo delegado, paralelo o con propiedad temporal de archivos. No se exige una orden adicional para un cambio local simple que Central reciba como instruccion literal del usuario.

## Chats permanentes por rol

- La fuente canonica es `docs/coordinacion/README.md`; la propiedad verificable vive en `docs/coordinacion/WORKSTREAMS.json`.
- Central actualiza `PROJECT_STATUS.json` al cambiar una orden, integracion, fase o riesgo material; decisiones, migraciones y capacidades se registran en sus indices JSON antes de cerrar el bloque.
- Los chats permanentes son Poseidon Central, Poseidon Cajero, Poseidon Encargado y Poseidon Administrador.
- Cada chat de rol es propietario de su experiencia, no de todos los dominios que consume.
- Cada chat de escritura usa rama y worktree propios; no se trabaja en paralelo sobre el mismo checkout.
- Los contratos compartidos requieren propietario temporal unico asignado por Central.
- Los chats de rol pueden cerrar commits locales despues de `pnpm run check:commit`, pero no integran `main`, no hacen push ni publican.
- La sincronizacion confiable usa orden de trabajo, codigo/documentacion, commit y entrega estructurada; no se presume memoria compartida entre chats.

## Agentes y subagentes Codex

- La fuente canonica para delegacion es `docs/PROTOCOLO_AGENTES_CODEX.md`.
- Los perfiles personalizados del proyecto viven en `.codex/agents/`; los `AGENTS.md` por carpeta siguen siendo mapas de lectura y reglas, no perfiles ejecutables.
- Usar subagentes solo cuando existan partes independientes que aporten analisis, revision o ejecucion no superpuesta.
- No fijar limites numericos propios de hilos o profundidad; usar la concurrencia que aporte valor dentro de la capacidad disponible de Codex.
- Priorizar perfiles personalizados de solo lectura para alcance, contabilidad e interfaz.
- No usar subagentes para comandos simples, cambios locales evidentes o trabajo cuya respuesta bloquee inmediatamente al agente principal.
- Ningun subagente hace commit, push, publicacion, despliegue ni conexion externa.
- La escritura delegada requiere alcance autorizado y propiedad explicita de archivos; dentro de la delegacion, el agente principal integra, valida, documenta y cierra el commit.

## Criterios visuales

- La interfaz debe verse bien en una pantalla 1080p: evitar scroll horizontal innecesario en paneles principales y priorizar grillas compactas.
- Los botones deben quedar bien alineados entre si; en tarjetas, alinear acciones al borde inferior y preferentemente a la derecha.
- Mantener tamanos consistentes de botones dentro de la misma zona de trabajo.
- Evitar repetir el mismo titulo o dato arriba y abajo; si la barra superior ya muestra pantalla/local/usuario/funcion, el contenido no debe duplicarlo.
- Tablas y paneles administrativos deben ser densos, claros y profesionales, con columnas ajustadas para ver la mayor cantidad posible sin perder legibilidad.
- Toda tabla del sistema debe permitir ordenar por cada columna/concepto visible, salvo columnas de acciones/comandos o una excepcion funcional explicada y aprobada por el usuario antes de implementar.
- Mantener el diseno simple: tarjetas de radio bajo, colores sobrios, foco en datos y acciones.

## Estado de trabajo

- El sistema esta en etapa de prueba local con persistencia en `localStorage`.
- Supabase/Auth real y storage real de archivos quedan pendientes para una etapa posterior.
- Las validaciones minimas antes de cerrar un cambio son `pnpm run check`, `pnpm run build` y `pnpm run smoke:localhost` con el servidor activo.
- Cuando cambien perfiles, reglas o referencias de diseno, ejecutar ademas `pnpm run check:design`; `pnpm run check` ya lo incluye.
- Antes de cada commit local ejecutar `pnpm run check:commit`; el hook versionado aplica el mismo control segun las rutas preparadas.
- Para cambios visuales o de permisos, completar ademas el smoke por rol de `docs/VALIDACION_LOCAL.md`.
- Para levantar localhost se usa solo `iniciar-poseidon.bat`; si el puerto queda ocupado, usar `detener-poseidon.bat`. No probar Python, `pnpm preview` ni servidores alternativos.

## Roles

- CAJERO: opera caja del dia.
- ENCARGADO: opera y revisa local, confirma retiro/base.
- ADMINISTRADOR: control completo.

## Orden de modulos

0. Base del sistema.
1. Usuarios, roles y locales.
2. Apertura de caja.
3. Contadores de maquinas.
4. Gastos, transferencias y regalos.
5. Cierre de caja.
6. Reportes Excel.
7. Administracion.
8. Auditoria y ajustes.
9. Cierre periodico.
