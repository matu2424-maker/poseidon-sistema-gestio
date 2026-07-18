# Poseidon - Reglas generales

Ultima actualizacion: 2026-07-18

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
- El trabajo delegado o paralelo usa una orden con commit base, alcance, propietario y criterios; un cambio local simple autorizado directamente a Central no requiere una orden adicional.
- Estado, decisiones transversales, migraciones y capacidades se registran en `docs/coordinacion/` y se validan con `pnpm run check:governance`.

## Historial y persistencia

- No borrar historial operativo.
- Bajas y correcciones se resuelven con estado, anulacion, contramovimiento, papelera o ajuste auditado.
- Una entidad referenciada por operaciones no se elimina fisicamente.
- El snapshot local es versionado y no recorta auditoria ni movimientos para ahorrar espacio.
- Un snapshot corrupto no se sobrescribe automaticamente.
- Cada guardado compara la version leida; un conflicto entre pestanas bloquea la escritura y conserva el intento.
- Una pestana pasiva puede adoptar el ultimo snapshot; una con cambios propios no mezcla estados.
- Un fallo de escritura debe detener la operacion y ofrecer recuperacion.
- Los archivos pesados no se guardan en `localStorage`; solo sus metadatos.

## Navegacion, roles y permisos

- `src/navigation/screens.ts` es la fuente de rutas, titulos, menus, roles y requisito de caja abierta.
- Rol real y funcion activa son distintos y ambos se auditan.
- Encargado y Administrador pueden consultar recaudaciones y trabajar como Cajero mediante un cambio explicito de funcion.
- Apertura, contadores, movimientos propios de Caja y cierre exigen funcion Cajero.
- Desde funcion administrativa, Encargado y Administrador operan gastos, salarios y tesoreria desde Principal.
- Un Encargado solo accede a sus locales asignados.
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
