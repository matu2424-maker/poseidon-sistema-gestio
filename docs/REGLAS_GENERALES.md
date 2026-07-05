# Poseidon - Reglas generales del sistema

Ultima actualizacion: 2026-07-05

Estas reglas aplican a todo el sistema, salvo que un modulo indique una excepcion explicita.

## Reglas de funcionamiento

- Trabajar por modulos cerrados y comprobables.
- No agregar funcionalidades no solicitadas.
- Mantener preparacion multi-local.
- No borrar historial operativo.
- Toda accion sensible requiere confirmacion antes de ejecutarse.
- Toda creacion, edicion, anulacion, baja, restauracion, eliminacion o ajuste importante debe registrarse en auditoria.
- Las bajas operativas deben ser estado, anulacion o papelera antes de eliminacion definitiva.
- Los datos de prueba se guardan localmente en `localStorage`.
- No guardar archivos pesados/base64 en `localStorage`; solo metadatos.
- No conectar Supabase/Auth/Storage real hasta que se reactive esa etapa.
- No publicar ni desplegar sin autorizacion explicita del usuario.
- Para levantar localhost se usa solo `iniciar-poseidon.bat`. Si el puerto queda ocupado, usar `detener-poseidon.bat`. No probar Python, `pnpm preview` ni servidores alternativos.

## Regla obligatoria de documentacion

Cada modificacion del sistema debe quedar documentada antes de cerrar el trabajo.

- Si cambia una regla global, actualizar `docs/REGLAS_GENERALES.md`.
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
- Encargado o administrador deben gestionar diferencias con accion y observacion.
- Cualquier impacto posterior debe hacerse con ajuste explicito y auditado.

## Reglas visuales globales

- Disenar para una pantalla 1080p.
- Evitar scroll horizontal innecesario en paneles principales.
- Tablas administrativas densas, claras y compactas.
- Las tablas nuevas deben permitir ordenar por sus columnas visibles por defecto, salvo que haya una razon funcional clara para no hacerlo.
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
