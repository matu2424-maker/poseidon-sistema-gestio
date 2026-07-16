# Poseidon - Sistema visual

Ultima actualizacion: 2026-07-16

Guia de aplicacion de la identidad visual de Poseidon. `docs/REGLAS_VISUALES.md` conserva las reglas obligatorias; este documento explica patrones, jerarquia, referencias y validacion para implementarlas sin depender de la memoria de un chat.

## Fuentes y autoridad

Orden de consulta para una tarea visual:

1. `AGENTS.md` y el `AGENTS.md` de la feature.
2. `docs/REGLAS_VISUALES.md` para reglas permanentes.
3. Este documento para patrones de composicion.
4. Contexto corto y documento del modulo.
5. `docs/referencias-visuales/README.md` y una captura aprobada cuando exista.

Una captura demuestra una composicion aprobada, pero no reemplaza reglas ni autoriza copiar una pantalla completa en otro flujo.

## Identidad

- Poseidon conserva azul marino y azul como identidad de navegacion y acciones principales.
- Fondos de trabajo usan neutros frios claros; superficies de datos son blancas o gris muy suave.
- Verde, rojo y naranja comunican estado o impacto; no forman paletas completas de pantalla.
- Los colores semanticos no sustituyen texto, estado o signo monetario.
- La interfaz es operativa: sobria, compacta, legible y orientada a revisar o ejecutar tareas repetidas.

Variables vigentes en `src/styles/base.css`:

| Variable | Uso principal |
| --- | --- |
| `--navy`, `--navy-2` | Navegacion, identidad y contraste alto |
| `--blue` | Accion primaria y seleccion activa |
| `--green` | Estado correcto o resultado favorable |
| `--orange` | Advertencia o mantenimiento |
| `--red` | Error, peligro o diferencia que requiere atencion |
| `--bg`, `--card`, `--soft` | Fondo, superficie y apoyo neutro |
| `--line`, `--text`, `--muted` | Bordes, texto principal y texto secundario |
| `--font-ui` | Interfaz local con Segoe UI/Aptos y reemplazos de sistema |
| `--font-data` | Importes, contadores e identificadores alineados |
| `--radius-control`, `--radius-surface` | Radios compartidos para controles y superficies |
| `--shadow-surface` | Separacion leve de superficies principales |

No agregar un color global por una sola pantalla. Primero comprobar si una variable existente expresa la funcion requerida.

## Estructura de pantalla

La barra superior es propietaria de:

- titulo de pantalla;
- local activo;
- usuario real;
- funcion activa;
- cambio a funcion Cajero cuando corresponda.

El contenido no repite esos datos. Puede comenzar con una frase operativa breve cuando aclara el objetivo sin describir la interfaz.

Orden recomendado:

1. selector de periodo o controles de contexto;
2. resumen compacto;
3. filtros y acciones generales;
4. tabla o herramienta principal;
5. detalle, historial o acciones secundarias.

La tabla o herramienta principal debe aparecer en el primer viewport siempre que la cantidad de controles lo permita.

## Superficies

### Resumen compacto

Usar una sola superficie dividida en celdas cuando varias metricas pertenecen al mismo periodo o entidad. Cada celda tiene:

- etiqueta corta;
- valor principal;
- aclaracion de una linea solo si evita ambiguedad.

El patron aprobado es `Diferencias de caja`: cuatro metricas en una superficie, `4` columnas en escritorio, `2x2` en ancho intermedio y `1` columna en movil.

### Tarjeta de accion

Reservada para un destino o comando concreto. Puede usar acento lateral, icono y boton alineado al borde inferior. No mezclar en una misma grilla tarjetas accionables y metricas pasivas con igual apariencia.

### Superficie informativa

Usa borde fino, radio maximo de `8px`, sombra leve solo si mejora separacion y sin colores laterales. Los datos relacionados se separan con lineas o espacio, no mediante tarjetas anidadas.

### Panel de formulario

Agrupa campos de una misma accion. Campos obligatorios, error y botones pertenecen al mismo panel o modal. La accion principal se alinea a la derecha y la secundaria queda a su izquierda.

## Tipografia y densidad

- La interfaz usa `--font-ui`; los datos numericos que requieren alineacion usan `--font-data`.
- Las cifras tabulares se activan globalmente para evitar desplazamientos visuales entre importes.
- La jerarquia se obtiene primero mediante tamano, espacio y color; no mediante negrita generalizada.
- Navegacion, etiquetas y texto secundario mantienen pesos moderados. La opcion activa puede aumentar un solo nivel de peso, sin convertirse en un bloque dominante.
- Titulo principal: solo en barra superior.
- Titulo de seccion: compacto y proporcional al panel.
- Etiqueta: pequena, clara y sin espaciado negativo.
- Valor: mayor peso que su etiqueta, sin escalar por ancho de viewport.
- Ayuda: una frase breve; no explicar como usar la pantalla dentro de la interfaz.
- Evitar mayusculas extensas y pesos `900` generalizados. Reservar peso alto para valores, estados y acciones.
- Escala implementada en todo el sistema: texto secundario `400`, etiquetas y datos auxiliares `500`, titulos, botones y valores principales `600`.
- La portada y la marca Poseidon son las unicas excepciones generales que pueden superar `600`.

## Botones e iconos

Jerarquia:

1. Primario: guardar, gestionar, abrir o confirmar el objetivo principal.
2. Secundario: volver, cerrar o ver detalle sin modificar.
3. Peligroso: anular, eliminar definitivamente o cerrar una operacion sensible.

Reglas de aplicacion:

- acciones equivalentes tienen igual alto y ancho estable cuando comparten zona;
- usar iconos Lucide cuando aportan reconocimiento, junto con texto en comandos no universales;
- botones de tarjetas se alinean al borde inferior derecho;
- una pantalla no repite el mismo destino como dos acciones primarias;
- una accion no disponible debe mostrar estado deshabilitado y causa cercana cuando sea relevante.

## Tablas

- La tabla es el centro de listados, historiales y administracion.
- Cada columna visible de datos ordena ascendente y descendente.
- Acciones y seleccion son excepciones normales.
- Encabezado claro, compacto y con indicador ASCII `asc` o `desc`.
- El encabezado comunica el mismo estado mediante `aria-sort`.
- La columna de acciones se alinea a la derecha y mantiene ancho estable.
- Estados usan badge o indicador discreto; no colorear toda la tabla salvo error localizado.
- Fila seleccionable conserva un control accesible evidente; si toda la fila admite clic, tambien acepta `Enter` y barra espaciadora.
- En movil, el desplazamiento horizontal queda dentro del contenedor de tabla; la pagina no desborda.
- Si la accion queda demasiado lejos del identificador en movil, proponer columnas prioritarias o una vista adaptada antes de ocultar datos.
- El patron global usa encabezado gris claro y texto compacto; el azul marino permanece en navegacion y no domina las grillas de datos.

## Formularios y mensajes

- Etiqueta visible y campo asociado.
- Obligatorio marcado antes de guardar.
- Error junto al campo o dentro del modal que origina la accion.
- Exito y aviso se actualizan al cambiar de operacion.
- Avisos dinamicos se anuncian mediante una region `status` sin interrumpir la operacion.
- Confirmaciones sensibles explican el efecto real, sin lenguaje generico.
- Campos monetarios respetan `docs/REGLAS_VISUALES.md` y `src/lib/money.ts`.

## Modales y detalle

- Usar modal cuando conserva el contexto de tabla o panel.
- Cabecera con titulo concreto y cierre secundario.
- Orden: contexto, datos principales, accion, historial.
- Separar secciones con lineas y espacio; evitar paneles dentro de paneles.
- El modal debe tener scroll interno y conservar los botones accesibles en `390x844`.
- El foco inicial queda dentro del modal, `Tab` permanece contenido, `Escape` cierra y el foco vuelve al control de origen.
- `Ver detalle` no debe parecer una accion modificadora.

## Patrones por rol

### Cajero

- Prioridad: operacion inmediata de caja abierta.
- Acciones principales visibles y alineadas.
- Al entrar en una funcion, ocultar resumentes que compitan con la tarea.
- No convertir el panel en un tablero administrativo.

### Encargado

- Prioridad: supervision, excepciones y trazabilidad del local asignado.
- Separar visualmente `Control financiero` de `Resultado economico mensual`.
- Diferenciar superficies accionables de metricas pasivas.
- Evitar accesos duplicados entre tarjetas y botonera.
- El cambio a Cajero permanece separado de las funciones de revision.

### Administrador

- Prioridad: tablas densas, busqueda, filtros, edicion y auditoria.
- Edicion en modal cuando evita perder la seleccion.
- Acciones destructivas requieren reconfirmacion y reglas de referencia historica.

## Patrones aprobados

### Base visual transversal

Estado: implementada en todos los modulos.

- Segoe UI/Aptos para interfaz y Cascadia Mono/Consolas para datos numericos alineados.
- Pesos maximos de `600` en contenido operativo, administrativo, formularios, tablas, modales y estados.
- Tablas con encabezado claro, filas compactas y acciones estables.
- Superficies con radio de hasta `8px`, borde fino y sombra leve.
- Paneles con pocos datos se alinean al inicio y no se estiran para ocupar el viewport.
- La identidad azul de Poseidon se conserva en navegacion, seleccion y acciones principales.

### Diferencias de caja

Estado: aprobado e implementado.

- selector mensual compartido;
- resumen de periodo en superficie compacta;
- buscador y estado afectan solo `resultados visibles`;
- tabla clara como foco;
- `Gestionar` primario y `Ver detalle` secundario;
- modal plano con historial completo;
- referencias visuales en `docs/referencias-visuales/`.

### Liquidacion de salarios

Estado: piloto revisado, rediseno no implementado.

Conservar selector mensual, accion `Detalle`, tablas ordenables y carga dentro del empleado. Antes de cambiar debe resolverse resumen compacto, ocho metricas del detalle, prioridad de columnas en movil y visibilidad del periodo cerrado.

### Panel del encargado

Estado: primera base visual implementada.

- La cabecera permanece unica y el cambio a Cajero conserva su ubicacion en el shell.
- `Control financiero` agrupa diferencias, efectivo y banco en una superficie compacta de tres celdas.
- `Resultado economico` agrupa ingresos, salidas y resultado neto del mes sin repetir el periodo en cada celda.
- Las metricas son informativas y no duplican acciones; los destinos frecuentes viven en una unica fila de botones con tamano estable.
- Titulos, etiquetas e importes usan una escala liviana: los valores principales conservan prioridad sin poner en negrita todo el contenido.
- El contenido de escritorio se centra dentro de un ancho maximo para evitar bandas excesivamente extendidas en pantallas grandes.
- En movil las bandas se convierten en una columna y separan sus celdas con lineas.

## Antipatrones

- repetir el titulo de la barra superior dentro del contenido;
- tarjetas grandes para datos que caben en una banda compacta;
- tarjetas dentro de otras tarjetas;
- botones desalineados o de ancho variable en una misma columna;
- encabezados oscuros dominantes en todas las tablas;
- colores laterales en superficies puramente informativas;
- esconder una regla o estado solo mediante color;
- copiar el diseno de otro producto sin traducirlo al flujo de Poseidon;
- modificar comportamiento funcional durante un refactor visual.

## Flujo del custodio de diseno

Antes de implementar:

1. clasificar pantalla, rol y tarea principal;
2. identificar patron aprobado reutilizable;
3. delimitar archivos y estados;
4. declarar decisiones de producto pendientes;
5. proponer viewports y pruebas.

Despues de implementar:

1. verificar `1920x1080`, `1366x768`, `1024x768` y `390x844` segun riesgo;
2. comprobar overflow de pagina y de tablas;
3. revisar alineacion, foco, estados vacios, error y modal;
4. comprobar ordenamiento de toda columna de datos modificada;
5. comparar con una referencia aprobada solo cuando comparta patron;
6. registrar hallazgos y actualizar la fuente canonica.

## Validacion

Comandos:

```text
pnpm run check:design
pnpm run check
pnpm run build
pnpm run smoke:localhost
pnpm run test:e2e
pnpm run capture:visual
```

`capture:visual` actualiza las referencias aprobadas y debe ejecutarse deliberadamente, no como parte de cada `check`.
