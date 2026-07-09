# Poseidon - Reglas visuales

Ultima actualizacion: 2026-07-08

Este documento concentra criterios visuales permanentes. Antes de modificar pantallas, tablas, modales o paneles, leer este archivo y el contexto del modulo afectado.

## Principios

- Disenar para pantalla 1080p.
- Evitar scroll horizontal innecesario en paneles principales.
- Priorizar datos, acciones claras y baja carga visual.
- Mantener diseno simple, profesional, sobrio y compacto.
- No repetir el mismo titulo o dato arriba y abajo.
- Si la barra superior ya muestra pantalla/local/usuario/funcion, el contenido no debe duplicarlo.

## Botones

- Botones de una misma zona deben tener tamanos y alineacion consistentes.
- En tarjetas o recuadros, acciones al borde inferior y preferentemente a la derecha.
- El usuario marco como critico que los botones queden alineados.
- Botones operativos deben ser claros y no moverse por contenido dinamico.
- `Cerrar caja` o acciones principales pueden tener color destacado, pero sin romper consistencia.

## Tablas

- Toda tabla nueva o tabla existente modificada debe permitir ordenar por cada columna/concepto visible.
- Excepcion normal: columnas de acciones/comandos.
- Cualquier otra excepcion debe explicarse y aprobarse antes.
- Tablas administrativas deben ser densas, legibles y compactas.
- Ajustar columnas para ver la mayor cantidad posible sin perder lectura.
- Los indicadores de orden usan texto ASCII `asc` / `desc`.
- Fila con error debe marcarse visualmente en rojo donde ocurre el problema.

## Modales

- Usar ventanas flotantes para edicion/detalle cuando el usuario lo pida o cuando evita perder contexto.
- El error debe aparecer dentro del modal si la accion ocurre dentro del modal.
- Los modales de gestion deben mostrar detalle suficiente, accion clara, observacion si corresponde e historial cuando sea relevante.

## Tarjetas y recuadros

- Evitar tarjetas grandes si la informacion puede ir en resumen compacto.
- Recuadros con colores laterales se reservan principalmente para botones o tarjetas de accion.
- Los recuadros informativos deben seguir estilo tipo `Datos de caja`: etiqueta chica, valor fuerte y filas compactas.
- No usar decoracion innecesaria.

## Formularios

- Campos obligatorios deben estar marcados claramente.
- Campos monetarios:
  - se escriben como numeros simples;
  - se formatean con punto de miles;
  - si estan en `0`, al enfocar se limpian;
  - si quedan vacios, vuelven a `0`.
- Donde corresponde numero, validar entrada numerica.
- Mensajes de error deben aparecer en la misma pantalla o modal donde sucede el error.

## Referencias por pantalla

- Cajero: `docs/contextos/CODEX_CAJA.md`, `docs/modulos/01_panel_cajero.md`.
- Diferencias: `docs/contextos/CODEX_DIFERENCIAS.md`, `docs/modulos/06_diferencias_caja.md`.
- Salarios: `docs/contextos/CODEX_SALARIOS.md`, `docs/modulos/10_clientes_personal_sueldos.md`.
- Cuentas corrientes: `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`, `docs/modulos/11_cuentas_corrientes.md`.
- Administracion: `docs/modulos/08_panel_administrador.md`, `docs/modulos/09_locales_maquinas_taller.md`.

