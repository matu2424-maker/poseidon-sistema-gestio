# Poseidon - Reglas generales

Ultima actualizacion: 2026-07-26

Fuente canonica de reglas transversales de producto, trabajo, interfaz y auditoria. Las formulas y movimientos de cuentas viven en `docs/REGLAS_CONTABLES.md`.

## Trabajo y alcance

- Trabajar por modulos cerrados y comprobables.
- Antes de editar, explicar alcance, archivos, riesgos y pruebas, salvo orden literal de ejecutar u objetivo activo.
- No agregar funciones no solicitadas ni resolver por inferencia una decision de producto ambigua.
- Mantener preparacion multi-local, aunque el foco actual sea Poseidon.
- No hacer push, publicar, desplegar ni conectar servicios externos sin autorizacion expresa.
- Un bloque estable se valida, documenta y cierra con commit local.
- Antes del commit ejecutar `pnpm run check:commit`.
- Para localhost usar exclusivamente `iniciar-poseidon.bat`; liberar el puerto con `detener-poseidon.bat`.
- La autorizacion literal del usuario habilita el cambio, pero no transfiere a Central la propiedad de una experiencia de rol.
- Todo cambio no trivial de Cajero, Encargado o Administrador usa una orden con commit base, alcance, propietario y criterios, y se ejecuta en el worktree del chat permanente correspondiente.
- Central puede resolver directamente contratos compartidos, integracion, gobierno, documentacion global, recuperacion urgente o correcciones triviales sin cambio de comportamiento. Un alcance mixto se divide antes de editar.
- Estado, decisiones transversales, migraciones y capacidades se registran en `docs/coordinacion/` y se validan con `pnpm run check:governance`.

## Versiones y despliegues

- `docs/RELEASES_Y_DESPLIEGUES.md` es la fuente canonica para versionado, ambientes, candidatos y rollback.
- `main` conserva la integracion estable; `release/test` solo puede apuntar a un commit validado de `main`.
- `package.json`, `CHANGELOG.md` y la etiqueta `v<version>` deben coincidir.
- Una etiqueta publicada es inmutable: no se mueve, reutiliza ni reemplaza.
- Todo candidato ejecuta `check`, `build`, E2E, `release:check` y `check:commit`.
- El push y el despliegue son autorizaciones diferentes. Preparar rama, etiqueta, workflow o bundle local no autoriza ninguna de las dos.
- Antes del primer push se verifica que no existan credenciales, `.env`, `.vercel/`, adjuntos ni artefactos generados versionados.
- Antes de desplegar una version que cambie `schemaVersion` se documenta compatibilidad de snapshot y recuperacion de datos.
- Un rollback de interfaz nunca borra ni revierte automaticamente movimientos financieros.

## Historial y persistencia

- No borrar historial operativo.
- Bajas y correcciones se resuelven con estado, anulacion, contramovimiento, papelera o ajuste auditado.
- Una entidad referenciada por operaciones no se elimina fisicamente.
- El snapshot local es versionado y no recorta auditoria ni movimientos para ahorrar espacio.
- Un snapshot del esquema vigente debe contener todas las colecciones y respetar tipos, campos, enums, importes finitos, IDs unicos, referencias y asociaciones de local/caja antes de entrar al sistema.
- Un snapshot heredado se migra por `schemaVersion` y se somete a la misma validacion profunda antes de hidratar la aplicacion.
- Un snapshot corrupto no se sobrescribe automaticamente.
- Una carga, importacion, migracion o escritura invalida se rechaza con rutas concretas de error; el JSON original o el intento de guardado se conserva para recuperacion y no se normalizan relaciones silenciosamente.
- Cada guardado compara la version leida; un conflicto entre pestanas bloquea la escritura y conserva el intento.
- Una pestana pasiva puede adoptar el ultimo snapshot; una con cambios propios no mezcla estados.
- Un fallo de escritura debe detener la operacion y ofrecer recuperacion.
- Los archivos pesados no se guardan en `localStorage`; solo sus metadatos.
- Durante la etapa local de pruebas, un Administrador en funcion Administrador puede crear una base operativa limpia solo desde `Datos locales`. La accion descarga primero un respaldo completo, conserva maestros y reemplaza operaciones, saldos e historial operativo por un unico evento de reinicio auditado.
- Un Administrador en funcion Administrador puede cargar desde `Datos locales` el escenario demo integral. La accion descarga primero un respaldo, reemplaza el snapshot completo sin mezclar registros y agrega una auditoria de la carga.
- El reinicio limpio es una herramienta destructiva del entorno local, no una operacion de negocio ni una funcion habilitable en produccion.
- La carga demo tambien es exclusiva de pruebas locales y no representa altas, anulaciones ni asientos reales de produccion.

## Navegador canonico durante la etapa local

- Chrome, usando el perfil habitual del usuario y el origen exacto `http://127.0.0.1:5173/`, es la unica fuente operativa de datos para validaciones manuales.
- Cada tarea manual de Codex abre una sesion o grupo nombrado `Poseidon - <tarea>` y crea dentro de ese grupo las pestanas necesarias; no toma pestanas sueltas de la navegacion personal del usuario.
- Central y los chats delegados usan el control de Chrome cuando una prueba depende de cajas, cuentas, movimientos o cualquier dato persistido por el usuario.
- El navegador integrado no se usa para crear, editar, importar ni validar datos operativos y no se compara con Chrome como si ambos compartieran almacenamiento.
- Si Chrome no esta disponible o no puede controlarse, se informa la limitacion; no se cambia silenciosamente al navegador integrado.
- Playwright y otras pruebas automatizadas usan contextos aislados, limpian su almacenamiento y cargan datos descartables. Sus resultados validan comportamiento, no el estado operativo de Chrome.
- Mientras exista `localStorage`, usar otro perfil, navegador u origen crea otra base. `localhost:5173` no sustituye a `127.0.0.1:5173`.

## Navegacion, roles y permisos

- `src/navigation/screens.ts` es la fuente de rutas, titulos, menus, roles y requisito de caja abierta.
- Rol real y funcion activa son distintos y ambos se auditan.
- Ocultar una accion en React no autoriza ni protege la operacion: todo comando sensible vuelve a validar usuario real, funcion activa, estado `ACTIVO`, local existente y asignacion al local antes de mutar.
- La funcion activa debe pertenecer a la matriz del rol real: Cajero solo usa Cajero; Encargado usa Encargado o Cajero; Administrador usa Administrador, Encargado o Cajero.
- Un rechazo de autorizacion ocurre antes de crear entidades, movimientos, diferencias, cierres o auditoria.
- Encargado y Administrador pueden consultar recaudaciones y trabajar como Cajero mediante un cambio explicito de funcion.
- Apertura, contadores, movimientos propios de Caja y cierre exigen funcion Cajero.
- Desde funcion administrativa, Encargado y Administrador operan gastos, salarios y tesoreria desde Principal.
- Un Encargado solo accede a sus locales asignados.
- Locales y maquinas exigen usuario Administrador real, funcion Administrador y estado activo; no alcanza con enviar `actorRole: ADMINISTRADOR`.
- Los avisos se limpian al navegar, salvo una confirmacion que deba llegar al destino.

## Caja y operacion

- Solo puede existir una caja `EN_PROCESO` por local.
- Con caja abierta no se cierra el local, no se trasladan/asignan maquinas y no se ajustan sus contadores administrativos.
- Toda operacion de Caja debe asociarse a la caja activa mediante `balanceId` cuando corresponda.
- Un gasto o salario administrativo pagado desde Principal no usa `balanceId` y no altera el efectivo esperado de Caja.
- Un traspaso operativo Caja <-> Principal durante una caja abierta queda asociado a ese `balanceId`.
- Los traspasos automaticos de apertura y cierre son inmutables.
- El alta legacy de capital esta deshabilitada; los registros anteriores se conservan para lectura y anulacion compatible.

## Reglas contables resumidas

- Resultado economico = resultado maquinas - gastos - salarios - regalos.
- Traspasos Caja/Principal, aportes/retiros de socios, saldos iniciales y diferencias no cambian el resultado economico.
- Las diferencias son eventos de control. Encargado o Administrador las verifica, corrige o anula con observacion y auditoria.
- Una diferencia anulada conserva asientos originales y agrega contramovimientos.
- Los pagos salariales se imputan por periodo trabajado; la salida de dinero se asocia a Caja o Principal segun la cuenta elegida.
- Descuento salarial cubre base pero no entrega dinero.
- Los cierres salariales son fotos inmutables; una modificacion posterior requiere revision correctiva enlazada.

## Documentacion obligatoria

Cada cambio actualiza las fuentes afectadas antes de cerrarse:

- regla transversal: `docs/REGLAS_GENERALES.md`;
- contabilidad: `docs/REGLAS_CONTABLES.md`;
- flujo: `docs/POSEIDON_FUNCIONAMIENTO.md`;
- modulo: archivo de `docs/modulos/`;
- arquitectura: `docs/MAPA_TECNICO.md`;
- rutas: `docs/MAPA_RUTAS.md`;
- continuidad: `docs/RETOMAR_MANANA.md`;
- ejecucion: `README.md` o `docs/VALIDACION_LOCAL.md`.
- version y despliegue: `docs/RELEASES_Y_DESPLIEGUES.md` y `CHANGELOG.md`.
- coordinacion multiagente: registros de `docs/coordinacion/` cuando cambien ordenes, riesgos, decisiones, migraciones o capacidades.

No se considera terminado un cambio con documentacion contradictoria.

## Interfaz

- Diseñar para 1080p y revisar movil cuando cambie layout.
- Evitar scroll horizontal innecesario, solapamientos y texto fuera de controles.
- No repetir el titulo de la barra superior dentro del contenido.
- Botones de una misma zona deben tener tamaño y alineacion consistentes.
- Tablas densas y legibles.
- Toda columna visible de datos es ordenable; Acciones/Seleccion son la excepcion.
- Una columna de datos no ordenable requiere explicacion y aprobacion previa.
- Los errores se muestran en la pantalla y contexto donde ocurren.
- Acciones sensibles requieren reconfirmacion mediante `src/lib/confirmations.ts`.

## Formularios

- Importes se escriben como numeros simples y se muestran con punto de miles.
- Un monto `0` se limpia al recibir foco; vacio vuelve a `0`, salvo campos obligatorios de diferencias.
- Campos numericos rechazan caracteres no validos.
- Campos obligatorios se identifican claramente.
- Los adjuntos aceptados conservan nombre y tipo; la interfaz no debe prometer contenido persistente.

## Auditoria

Cuando aplique, todo evento sensible registra:

- fecha y hora;
- usuario real;
- rol real;
- funcion activa;
- accion y entidad;
- identificador;
- valor anterior y nuevo;
- motivo u observacion;
- local y recaudacion asociados.

- Administrador ve auditoria global; Encargado solo la de sus locales.
- El alcance local se congela al crear el evento.
- No se registran contraseñas ni contenido inline de archivos.
- No se generan logs sinteticos durante el render.
