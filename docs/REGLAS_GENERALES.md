# Poseidon - Reglas generales del sistema

Ultima actualizacion: 2026-07-10

Esta es la fuente canonica de reglas transversales de trabajo, documentacion y auditoria general. Aplica a todo el sistema, salvo que un modulo indique una excepcion explicita.

## Reglas de funcionamiento

- Trabajar por modulos cerrados y comprobables.
- No agregar funcionalidades no solicitadas.
- Mantener preparacion multi-local.
- No borrar historial operativo.
- Toda accion sensible requiere confirmacion antes de ejecutarse.
- Las confirmaciones de interfaz usan la unica entrada `src/lib/confirmations.ts`; no se crean wrappers locales por pantalla.
- Titulo, menu, roles permitidos y requisito de caja abierta de cada pantalla se definen en `src/navigation/screens.ts`.
- Encargado y administrador pueden consultar `Resumen de cajas`, pero toda apertura, carga o cierre exige cambiar la funcion activa a `CAJERO`.
- Los avisos se limpian al navegar para no quedar fuera de contexto; un aviso de exito que navega a su resumen puede preservarse de forma explicita.
- Toda creacion, edicion, anulacion, baja, restauracion, eliminacion o ajuste importante debe registrarse en auditoria.
- Las bajas operativas deben ser estado, anulacion o papelera antes de eliminacion definitiva.
- Una entidad con referencias operativas no se elimina fisicamente; queda cerrada, inactiva o en papelera para conservar trazabilidad.
- Los datos de prueba se guardan en un snapshot local versionado.
- Un snapshot corrupto no se reemplaza automaticamente: debe ofrecerse descarga de recuperacion o reinicio confirmado.
- No recortar auditoria, movimientos ni historiales para forzar un guardado local. Si se supera la cuota, informar y pedir exportar respaldo.
- No guardar archivos pesados/base64 en `localStorage`; solo metadatos.
- No conectar Supabase/Auth/Storage real hasta que se reactive esa etapa.
- No publicar ni desplegar sin autorizacion explicita del usuario.
- Para levantar localhost se usa solo `iniciar-poseidon.bat`. Si el puerto queda ocupado, usar `detener-poseidon.bat`. No probar Python, `pnpm preview` ni servidores alternativos.
- Cuando el usuario marque un objetivo activo para ejecutar mejoras del sistema, Codex trabaja con autonomia dentro de ese objetivo: implementa, valida, documenta y commitea bloques locales estables sin pedir permiso paso a paso.
- Con objetivo activo, Codex solo se detiene a pedir confirmacion ante push, publicacion, despliegue, conexion externa, cambios destructivos amplios, credenciales o decisiones de producto ambiguas.
- Hacer commits locales cuando un bloque funcional quede estable, validado y sea correcto cerrar el punto de control.
- Aplicar una skill versionada cuando exista un procedimiento repetible adecuado; la skill debe referenciar fuentes canonicas y no copiar reglas de producto.
- Antes de cada commit ejecutar `pnpm run check:commit`, que selecciona la validacion proporcional a las rutas preparadas.
- Cuando existan pruebas automatizadas para el modulo afectado, ejecutar `pnpm test` antes del build final.
- No hacer push, publicacion ni despliegue sin confirmacion explicita del usuario.
- Para modularizar, leer `docs/MODULARIZACION_REFERENCIAS.md` y dejar referencias cruzadas porque muchos modulos estan asociados.

## Regla obligatoria de documentacion

Cada modificacion del sistema debe quedar documentada antes de cerrar el trabajo.

- Si cambia una regla global, actualizar `docs/REGLAS_GENERALES.md`.
- Si cambia una regla contable, actualizar `docs/REGLAS_CONTABLES.md`.
- Si cambia una regla visual, actualizar `docs/REGLAS_VISUALES.md`.
- Si cambia una asociacion tecnica entre modulos o se mueve codigo, actualizar `docs/MODULARIZACION_REFERENCIAS.md` o `docs/MAPA_TECNICO.md`.
- Si cambia una regla funcional, flujo, calculo o campo, actualizar `docs/POSEIDON_FUNCIONAMIENTO.md`.
- Si cambia una pantalla, funcion o modulo concreto, actualizar el archivo correspondiente en `docs/modulos/`.
- Si cambia la estructura tecnica, clases principales, deuda tecnica o ubicacion de codigo, actualizar `docs/MAPA_TECNICO.md`.
- Si cambia el estado para retomar trabajo, actualizar `docs/RETOMAR_MANANA.md`.
- Si cambia la forma de ejecutar, validar o publicar, actualizar `README.md`.

No se considera cerrado un cambio si la documentacion relacionada quedo desactualizada.

## Reglas contables globales

- Resultado economico = resultado de maquinas - gastos - salarios - regalos.
- El resultado economico no incluye transferencias, aportes, retiros, efectivo inicial, banco inicial ni diferencias.
- Las diferencias de efectivo o banco son eventos de control y auditoria.
- Una diferencia no se convierte automaticamente en ganancia, perdida, gasto ni ajuste de caja.
- Al cerrar caja, una diferencia de efectivo o banco mueve la cuenta corriente del local para que la siguiente apertura tome el saldo real declarado.
- Ese movimiento de diferencia no modifica el resultado economico.
- Encargado o administrador deben gestionar diferencias con accion y observacion.
- Si encargado/admin anula una diferencia, se anulan sus movimientos de cuenta y el saldo vuelve al calculo previo.
- Si encargado/admin verifica una diferencia, el movimiento de cuenta queda activo como diferencia auditada.
- Si encargado/admin corrige una diferencia, se editan los importes declarados de efectivo/banco, se recalculan diferencias y se sincronizan movimientos de cuenta.
- Cualquier correccion adicional posterior debe hacerse con ajuste explicito y auditado.
- Los pagos de salario desde caja afectan la caja por `balanceId`, pero la liquidacion y cuenta personal se imputan por periodo trabajado (`period`).
- El cajero solo carga nuevos pagos de salario con `SALARIO` o `ADELANTO`; conceptos administrativos quedan para encargado/admin.
- En salarios, del dia 1 al 10 se sugiere trabajar mes anterior; desde el dia 11 se sugiere mes actual. En liquidacion es solo periodo inicial sugerido y puede cambiarse manualmente.
- En salarios, descuento reduce pendiente/base cubierta, pero no es dinero entregado ni salida de caja.
- `Pagado / Entregado` = salario pagado + adelantos + premio/gratificacion + horas extras + bonos. No resta descuentos.
- `Cubierto base` = salario pagado + adelantos + descuentos. No puede superar el salario base del periodo.
- `EXTRA` queda como codigo tecnico interno y en interfaz se muestra como `Premio / Gratificacion`.
- Los cambios de salario base son prospectivos: no pueden afectar cierres de liquidacion ya cerrados; si afectan periodos abiertos con liquidaciones activas, requieren reconfirmacion.

## Reglas visuales globales

- Disenar para una pantalla 1080p.
- Evitar scroll horizontal innecesario en paneles principales.
- Tablas administrativas densas, claras y compactas.
- Las tablas nuevas deben permitir ordenar por sus columnas visibles por defecto, salvo que haya una razon funcional clara para no hacerlo.
- Regla permanente de tablas: toda tabla nueva o existente que se modifique debe poder ordenarse por cada columna/concepto visible. Las columnas de acciones/comandos no requieren ordenamiento.
- Si una columna visible no va a ser ordenable, debe explicarse el motivo y pedir aprobacion antes de implementar.
- Botones de una misma zona con tamano y alineacion consistentes.
- En tarjetas, acciones al borde inferior y preferentemente a la derecha.
- No repetir datos que ya aparecen en la barra superior.
- En pantallas administrativas, no repetir como `h2` interno el nombre exacto de la pantalla si ya aparece en la barra superior.
- Mantener tarjetas de radio bajo, colores sobrios y foco en datos.
- Los recuadros con colores laterales se reservan principalmente para botones o tarjetas de accion.
- Las pantallas operativas deben priorizar flujo, rapidez y baja confusion.
- Los mensajes de error deben aparecer en la misma pantalla donde ocurre el problema.

## Reglas de formularios

- Campos monetarios se escriben como numeros simples y se formatean con punto de miles.
- Si un monto esta en `0`, al hacer foco se limpia para escribir.
- Si el usuario deja vacio un monto, vuelve a `0`.
- Excepcion: en la correccion de diferencias, efectivo y banco son obligatorios; un campo vacio permanece vacio y genera error, nunca se interpreta como cero.
- Donde corresponde solo numeros, validar entrada numerica.
- Las acciones destructivas o sensibles no se ejecutan sin reconfirmacion.
- Los formularios deben marcar claramente los campos obligatorios; en Personal se usa nota visible y `*` en cada campo requerido.

## Reglas de auditoria global

Cada evento debe registrar, cuando aplique:

- fecha y hora;
- usuario real;
- rol real;
- funcion usada;
- accion;
- entidad;
- id de entidad;
- valor anterior;
- valor nuevo;
- motivo u observacion.
- local asociado, cuando la entidad o el movimiento pertenece a un local.

- Administrador puede consultar la auditoria completa; encargado solo puede consultar eventos resueltos a uno de sus `localIds`.
- Un evento sin contexto local resoluble no se muestra al encargado.
