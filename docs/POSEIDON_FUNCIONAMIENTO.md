# Poseidon Sistema de Gestion - Funcionamiento y reglas

Ultima actualizacion: 2026-07-09

Este documento es la memoria funcional viva del sistema. Cada cambio funcional relevante debe actualizar este archivo en el mismo trabajo.
Cuando el cambio afecte un panel o funcion concreta, tambien se debe actualizar el documento correspondiente en `docs/modulos/`.

## Base tecnica

- Aplicacion web React + Vite + TypeScript.
- Mapa tecnico complementario: `docs/MAPA_TECNICO.md`.
- Contexto rapido para retomar: `docs/CONTEXTO_RAPIDO_CODEX.md`.
- Reglas generales globales: `docs/REGLAS_GENERALES.md`.
- Reglas contables globales: `docs/REGLAS_CONTABLES.md`.
- Reglas visuales globales: `docs/REGLAS_VISUALES.md`.
- Modularizacion y referencias cruzadas: `docs/MODULARIZACION_REFERENCIAS.md`.
- Contextos cortos por modulo para Codex: `docs/contextos/`.
- Documentacion modular por panel/funcion: `docs/modulos/`.
- Reglas compartidas extraidas en `src/lib/`: dinero, fechas, cuentas corrientes, movimientos contables, totales de caja, diferencias y salarios.
- Datos demo, reset operativo, IDs visibles de caja y normalizacion/migracion viven en `src/data/appData.ts`.
- Persistencia actual: `localStorage`, clave `poseidon-sistema-gestion-v2`.
- Supabase/Auth real queda pendiente para una etapa posterior.
- En `localStorage` no se persisten archivos pesados/base64; comprobantes e imagenes guardan metadatos para evitar superar la cuota del navegador.
- El almacenamiento real de archivos queda pendiente para Supabase Storage u otro storage externo.
- Inicio de sesion local de prueba: se selecciona un usuario activo desde una lista y no se pide contrasena.
- Usuarios de prueba disponibles:
  - `admin`
  - `cajero1`
  - `cajero2`
  - `encargado`
- Dataset demo inicial:
  - 3 maquinas activas asignadas al local `Poseidon`;
  - 3 cajas cerradas en julio 2026;
  - una caja con diferencia pendiente de efectivo y banco para probar gestion del encargado y el impacto en cuentas corrientes;
  - gastos con estados de revision `PENDIENTE`, `REVISADO` y `OBSERVADO`;
  - transferencias, regalos, pagos de salario, aportes, retiros, movimientos de cuentas corrientes y auditoria demo.
- El boton `Reiniciar demo` vuelve a cargar este dataset inicial.

## Roles

- `CAJERO`: opera caja diaria, contadores, gastos, transferencias, regalos, salarios y clientes desde el panel del cajero.
- `ENCARGADO`: rol operativo superior para diferencias, gastos, cierres periodicos, personal/salarios, reportes, cuentas corrientes y auditoria. Su panel inicial esta reiniciado para redisenarlo por etapas y hoy muestra diferencias, cuenta efectivo y cuenta banco del local activo.
- `ADMINISTRADOR`: gestiona locales, maquinas, usuarios, personal, liquidaciones, clientes, categorias, reportes y auditoria.
- Un usuario encargado o administrador puede cambiar su funcion activa a `CAJERO` para operar el flujo de caja existente con su mismo usuario real. La auditoria guarda usuario real y funcion usada.

## Reglas generales

- No se borra historial operativo sin pasar por auditoria.
- Las bajas operativas deben quedar como estado, anulacion o papelera antes de eliminacion definitiva.
- Las acciones sensibles usan confirmacion simple antes de ejecutar.
- Las tablas principales deben mantener foco en grilla, busqueda, ordenamiento cuando aplique y acciones claras.
- Todo cambio de datos importante debe crear evento de auditoria.
- La barra lateral de administrador y encargado se organiza por grupos funcionales, no como lista plana.
- Los grupos de la barra lateral son desplegables. El grupo de la pantalla activa se abre automaticamente.
- El item `Caja diaria` es el acceso al modulo de caja: si no hay caja abierta permite abrir una nueva; si hay caja abierta muestra revision/resumen de cajas.
- No debe usarse `Abrir caja` como nombre de menu lateral cuando la pantalla puede mostrar resumen de cajas.

## Criterios visuales

- La estetica base debe ser simple, responsive y profesional, con foco en operacion diaria.
- La interfaz debe verse bien en una configuracion 1080p; los paneles principales no deberian obligar a scroll horizontal salvo tablas muy extensas.
- Los botones de una misma zona deben mantener altura, ancho y alineacion consistentes.
- En tarjetas o recuadros, las acciones se alinean al borde inferior y preferentemente a la derecha para que no queden desparejas.
- No repetir titulos o datos que ya aparecen en la barra superior. Si arriba ya figura pantalla, local, usuario o funcion, el contenido debe ir directo al dato o accion.
- Las pantallas administrativas no deben repetir dentro del cuerpo el mismo nombre que ya muestra la barra superior; el encabezado interno se usa para descripcion, contadores y acciones.
- Las tablas deben ser compactas, ordenadas y legibles, con columnas ajustadas para mostrar la mayor cantidad de informacion util.
- Se priorizan bordes simples, radio bajo, colores sobrios y buen espaciado antes que decoracion.
- En pantallas del encargado, los recuadros de resumen usan estetica tipo `Datos de caja`: etiqueta chica, valor fuerte debajo, filas internas etiqueta/dato y botones alineados abajo a la derecha.

## Barra lateral

- Administrador:
  - `Inicio`: Panel general.
  - `Control y auditoria`: Diferencias, Gastos, Auditoria y Cuentas corrientes.
  - `Cierres y reportes`: Reportes y Cierre periodico.
  - `Gestion`: Locales, Maquinas, Taller y Categorias gastos.
  - `Personas`: Clientes, Personal, Liquidacion salarios y Usuarios.
  - `Sistema`: Papelera.
- No muestra accesos operativos de caja; para abrir/cerrar/cargar caja el administrador cambia a funcion `CAJERO`.
- Encargado:
  - `Inicio`: Panel encargado.
  - `Control y auditoria`: Diferencias, Gastos, Auditoria y Cuentas corrientes.
  - `Cierres y reportes`: Caja diaria, Cierre periodico y Reportes.
  - `Personas`: Personal, Liquidacion salarios y Clientes.
- No muestra grupo `Caja operativa`; para operar como caja el encargado cambia a funcion `CAJERO`.

## Refactor tecnico

- `src/types.ts` contiene los tipos principales del sistema.
- `src/App.tsx` sigue concentrando estado global, acciones principales y composicion de pantallas, pero datos demo/normalizacion, reglas compartidas y pantallas principales ya viven fuera.
- Ya salieron de `src/App.tsx`: auditoria, storage, ordenamiento, datos demo/normalizacion, helpers de clientes/archivos, componentes UI compartidos, `src/features/layout/AppShell.tsx`, `src/features/dashboard/RoleDashboard.tsx`, `src/features/accounts/CurrentAccounts.tsx`, `src/features/manager/Differences.tsx`, `src/features/manager/Expenses.tsx`, `src/features/cashier/OpenCash.tsx`, `src/features/cashier/ClosedBalanceSummary.tsx`, `src/features/cashier/Counters.tsx`, `src/features/cashier/CloseCash.tsx`, `src/features/cashier/Movements.tsx`, `src/features/salaries/SalarySettlements.tsx`, `src/features/admin/Clients.tsx`, `src/features/admin/Staff.tsx`, `src/features/admin/Settings.tsx`, `src/features/admin/LocationsMachines.tsx`, `src/features/audit/Audit.tsx`, `src/features/reports/Reports.tsx` y `src/features/reports/Periodic.tsx`.
- `src/components/ui.tsx` tambien centraliza `ColumnChooser` y `TableColumn` para que las tablas configurables no dupliquen markup ni tipos.
- Los siguientes refactors deben decidirse por bloque chico y con beneficio claro; no queda pendiente conocido de datos demo/normalizacion.
- `docs/MAPA_TECNICO.md` documenta el mapa de pantallas, clases CSS principales, calculos y deuda tecnica actual.
- `src/components/WelcomeScreen.tsx` existe como componente heredado/no conectado al flujo principal actual.

## Locales

- Local principal actual: `Poseidon`.
- Los locales tienen ID numerico corto.
- Estados: `ACTIVO`, `INACTIVO`, `CERRADO`.
- Si un local pasa a `CERRADO`, sus maquinas vuelven al Taller con confirmacion.
- Desde Locales se pueden ver maquinas asociadas, historial, recaudaciones y auditoria.

## Maquinas

- Las maquinas nacen en `Taller`.
- Estados: `ACTIVA`, `INACTIVA`, `MANTENIMIENTO`, `DESUSO`.
- `DESUSO` solo se permite cuando la maquina esta en Taller.
- Las maquinas en `DESUSO` no aparecen en el listado general; se ven en el apartado de desuso del Taller.
- Para eliminar una maquina debe estar en Taller.
- No se puede eliminar una maquina con recaudaciones.
- Reset de contadores:
  - queda auditado;
  - no debe hacerse con caja abierta del local;
  - pone IN y OUT actuales en 0 para nuevas cajas.

## Caja diaria

- El cajero no usa barra lateral.
- Las casillas de importes de dinero muestran `0` al iniciar.
- Al hacer clic en una casilla de dinero con valor `0`, se limpia para escribir.
- Si se sale de una casilla de dinero sin ingresar monto, vuelve a `0`.
- Los importes se escriben como numeros simples y se visualizan con separador de miles por punto, por ejemplo `1000` pasa a `1.000`.
- Si no hay caja abierta, debe abrir caja para operar.
- Si no hay caja abierta, el panel del cajero solo permite `Clientes`, `Resumen cajas` y `Abrir caja`; el resto de la operativa muestra aviso de apertura requerida.
- El aviso visible dice `Necesita abrir una nueva caja para poder operar.`
- Si hay caja abierta, entra al panel del cajero y sigue esa caja.
- Al abrir caja se crea una foto de lecturas de maquinas para esa caja.
- Si es la primera caja del local, el cajero debe declarar el primer aporte de capital:
  - aporte inicial en efectivo;
  - aporte inicial en banco/transferencia;
  - responsable del aporte (`RICARDO` o `MATHIAS`).
- El primer aporte de capital crea movimientos de cuenta en `Local / Efectivo` y `Local / Banco`, con momento `APERTURA`.
- Si no es la primera caja del local, la apertura toma automaticamente el saldo que quedo en las cuentas corrientes del local:
  - saldo `Local / Efectivo` como efectivo inicial;
  - saldo `Local / Banco` como banco inicial.
- Cada caja tiene un ID visible rastreable con las primeras cuatro letras del local y un numero correlativo, por ejemplo `POSE-1`.
- Cada caja muestra hora de apertura y hora de cierre en los resumenes.
- Cada caja registra usuario real y funcion usada en apertura y cierre (`openedByRole` y `closedByRole`), para saber si actuaba como cajero, encargado o administrador.
- La pantalla `Nueva caja diaria` muestra el formulario de apertura y las ultimas 10 cajas cerradas del local.
- En `Caja diaria`, el formulario `Nueva caja diaria` y `Ultimas cajas cerradas` se muestran en bloques verticales para que la tabla tenga ancho suficiente.
- En `Nueva caja diaria` no hay boton volver; se usa solo para abrir caja cuando no hay caja abierta.
- Al hacer clic en una caja cerrada reciente se ve un resumen en pantalla, solo lectura y sin exportacion.
- Si se consulta el resumen desde el panel del cajero con caja abierta, se muestra solo resumen y ultimas cajas, no el formulario de nueva caja.
- En `Resumen de cajas` hay boton `Volver al panel`.
- En `Resumen de cajas`, `Ultimas cajas cerradas` se muestra arriba en formato tabla seleccionable con una caja activa a la vez.
- La tabla de ultimas cajas muestra resultado final, efectivo declarado, diferencia de efectivo, diferencia de banco y estado de gestion de diferencias.
- La tabla de ultimas cajas cerradas permite ordenar por ID, fecha, horario, resultado final, declarado, diferencia efectivo, diferencia banco, estado de diferencia y maquinas.
- Al hacer clic en `Ver` se muestra el resumen individual de esa caja cerrada.
- Despues de cerrar una caja desde el panel del cajero, el sistema envia directo a `Resumen de cajas`.
- `Resumen de cajas` muestra datos relevantes de cada caja cerrada:
  - ID de recaudacion, local, fecha, horario, usuario de apertura y usuario de cierre;
  - resultado final economico;
  - diferencia de caja, efectivo esperado y efectivo declarado;
  - banco esperado, banco declarado y diferencia banco;
  - estado de gestion de diferencias, observacion original del cajero y revision del encargado/admin;
  - resultado de maquinas, entrada total y salida total;
  - saldos proximos de efectivo y banco;
  - salidas operativas separadas: gastos, salarios y regalos;
  - movimientos financieros separados: transferencias, aportes y retiros en efectivo/banco;
  - detalle de maquinas recaudadas.
- En resumen de caja cerrada la diferencia visible se calcula como `efectivo declarado - efectivo esperado` usando los mismos totales mostrados.
- Los contadores de una caja abierta no cambian por reset posterior de maquina; para ver reset en 0 hay que cerrar caja, resetear y abrir nueva caja.
- Cierre de caja:
  - se centra en `Balance de control` y `Declaracion final`;
  - no muestra tarjetas superiores de maquinas, efectivo esperado, salidas ni capital/banco;
  - `Salida total` incluye solo gastos, salarios y regalos;
  - transferencias se muestran separadas y descuentan del efectivo esperado;
  - aportes de capital en efectivo suman al efectivo esperado;
  - retiros en efectivo descuentan del efectivo esperado;
  - retiros por transferencia se muestran separados y afectan la cuenta banco del local;
  - resultado final es economico, no financiero: resultado de maquinas - gastos - salarios - regalos;
  - aportes, retiros, transferencias, efectivo inicial y banco inicial no modifican el resultado final porque son movimientos financieros o de caja;
  - `Balance de control` muestra en orden `Efectivo esperado`, `Dinero en banco esperado`, `Efectivo` declarado por el cajero y `Dinero en banco` declarado por el cajero;
  - aportes/retiros por transferencia mueven la cuenta banco del local pero no el efectivo fisico de caja;
  - al cierre se puede registrar retiro final en efectivo y/o banco;
  - el retiro final queda con responsable (`RICARDO` o `MATHIAS`) y momento `CIERRE`;
  - el retiro final efectivo y el retiro final banco pueden tener responsables distintos;
  - si el retiro final efectivo es `0`, el selector de quien retira efectivo queda deshabilitado, con fondo gris y texto `Sin retiros finales`;
  - si el retiro final banco es `0`, el selector de quien retira banco queda deshabilitado, con fondo gris y texto `Sin retiros finales`;
  - el cajero declara el efectivo final que queda en el local;
  - el cajero declara el dinero banco final que queda en el local;
  - el efectivo final declarado queda como saldo de apertura de la siguiente caja;
  - el dinero banco final declarado queda como banco inicial de la siguiente caja;
  - efectivo esperado final, banco esperado final y diferencias se calculan antes de confirmar;
  - al cerrar, una diferencia de efectivo o banco crea movimientos en las cuentas `Local / Efectivo` y `Local / Banco` para que el saldo siguiente refleje lo declarado por el cajero;
  - esos movimientos de diferencia no modifican el resultado economico;
  - si hay diferencia de efectivo o banco, la observacion es obligatoria;
  - si hay maquinas pendientes sin observacion, no se puede cerrar;
  - los errores de cierre se muestran como avisos dentro de la pantalla de cierre.

## Diferencias de caja

- Las diferencias de efectivo o banco no modifican automaticamente el resultado economico.
- El resultado economico se mantiene como `resultado de maquinas - gastos - salarios - regalos`.
- Una diferencia de caja es un evento de control y auditoria, no una ganancia ni una perdida automatica.
- Al cerrar caja, una diferencia mueve la cuenta corriente del local:
  - diferencia efectivo positiva entra en `Local / Efectivo`;
  - diferencia efectivo negativa sale de `Local / Efectivo`;
  - diferencia banco positiva entra en `Local / Banco`;
  - diferencia banco negativa sale de `Local / Banco`.
- Este movimiento permite que la proxima apertura tome el saldo real declarado, incluso si hubo faltante, sobrante o error a revisar.
- Las diferencias quedan pendientes, visibles y auditadas hasta que un `ENCARGADO` o `ADMINISTRADOR` las gestione.
- La gestion de una diferencia exige seleccionar una accion (`VERIFICADA`, `CORREGIDA` o `ANULADA`) y escribir una observacion obligatoria.
- Estados vigentes de diferencia: `PENDIENTE`, `VERIFICADA`, `CORREGIDA` y `ANULADA`. Los estados antiguos se normalizan al leer datos sin borrar auditoria.
- La observacion original del cajero no se pisa; la gestion posterior guarda usuario, fecha/hora y nota propia.
- Una diferencia puede deberse a error de carga, transferencia mal registrada, retiro/aporte omitido o faltante/sobrante real.
- Si se verifica, los movimientos de diferencia quedan activos y mantienen el saldo real declarado.
- Si se corrige, encargado/admin ingresa efectivo declarado corregido y dinero banco declarado corregido; el sistema recalcula las diferencias, actualiza el saldo proximo de la recaudacion y sincroniza movimientos de cuenta.
- Si se anula, los movimientos de diferencia quedan anulados, dejan de impactar las cuentas del local, la diferencia efectiva queda en cero y los saldos proximos vuelven al calculo esperado de la recaudacion.
- Cualquier correccion adicional posterior debe hacerse mediante un ajuste explicito y auditado.
- En la pantalla `Diferencias`, el encargado ve solo las recaudaciones de sus locales asignados; administrador ve todos los locales.
- La pantalla `Diferencias` abre como historial del mes actual y permite consultar mes anterior o consulta historica por mes/ano.
- Visualmente usa el mismo criterio minimalista de `Liquidacion de salarios`: selector de periodo compacto, resumen superior de cuatro metricas, tabla principal como centro y detalle en ventana flotante.
- La tabla muestra todas las recaudaciones con historial real de diferencia/control en el periodo, incluidas verificadas, corregidas y anuladas aunque la diferencia actual haya quedado en cero. Una caja sin diferencia ni gestion no crea un control artificial.
- Tiene buscador por ID/local/fecha/observacion y filtro por estado.
- La tabla de diferencias es compacta y muestra caja, fecha, local, diferencia efectivo, diferencia banco, estado, ultima gestion y accion. La observacion original se consulta dentro del detalle para no cargar la grilla principal.
- La gestion se hace en una ventana flotante con detalle de efectivo, banco, observacion original y ultima gestion.
- Para guardar una gestion se debe elegir accion y escribir observacion obligatoria.
- El error de observacion obligatoria aparece dentro de la ventana flotante de gestion.
- El modal de cada recaudacion muestra historial completo auditado de cierre, revision, correccion o anulacion.
- Impacto por accion del encargado:
  - `VERIFICADA`: confirma que la diferencia existe; mantiene activos los movimientos de diferencia y no cambia resultado economico.
  - `CORREGIDA`: permite corregir efectivo/banco declarado, recalcula diferencias, sincroniza cuentas y no cambia resultado economico.
  - `ANULADA`: anula la diferencia y sus movimientos de cuenta, deja diferencia efectiva en cero y revierte saldos proximos al valor esperado; no borra la auditoria del cierre.

## Panel del encargado

- El encargado entra a una vista propia de revision operativa, no al panel visual del cajero.
- Desde la cabecera puede pasar a `Trabajar como cajero`; al hacerlo usa el panel de cajero existente con su mismo nombre de usuario.
- El panel inicial fue reiniciado para redisenarlo por etapas.
- En esta etapa muestra solamente:
  - diferencias del local activo: pendientes, total con diferencia, diferencia de efectivo y diferencia de banco;
  - saldo de la cuenta corriente `Local / Efectivo`;
  - saldo de la cuenta corriente `Local / Banco`;
  - ingreso total del mes actual hasta hoy;
  - salida total del mes actual hasta hoy;
  - resultado neto economico del mes actual hasta hoy.
- En el panel del encargado, el ingreso total mensual cuenta solo resultado positivo de maquinas de cajas cerradas del mes.
- La salida total mensual cuenta gastos, salarios, regalos y resultado negativo de maquinas de cajas cerradas del mes.
- El resultado neto mensual se calcula como ingreso total menos salida total.
- Transferencias, retiros y aportes no se mezclan en ingreso/salida economica mensual; se revisan en cuentas corrientes y movimientos financieros.
- Desde los recuadros principales se puede ir a `Diferencias` o `Cuentas corrientes`.
- Debajo de las tarjetas principales hay accesos rapidos a diferencias, cuentas corrientes, control de gastos, salarios y resumen de cajas.

## Panel del cajero

### Encabezado y resumen superior

- El encabezado muestra:
  - fecha operativa;
  - caja abierta con formato `Caja: ID ABIERTA`;
  - efectivo inicial de la caja;
  - banco inicial de la caja.
- El resumen superior muestra:
  - resultado de maquinas, en verde si es positivo y rojo si es negativo;
  - salida total, calculada como gastos + salarios + regalos;
  - efectivo en caja y dinero en banco uno al lado del otro;
  - transferencias;
  - aportes efectivo;
  - gastos;
  - salarios;
  - regalos;
  - retiros.
- `Salida total`, `Efectivo en caja` y `Dinero en banco` son recuadros grises de lectura y no ejecutan acciones.
- Los recuadros principales del resumen superior funcionan como accesos directos:
  - `Resultado de maquinas`: abre carga de contadores;
  - `Transferencias`: abre carga de transferencias;
  - `Aportes efectivo` y `Retiros`: abren retiros / aportes y se muestran juntos;
  - `Gastos`: abre carga de gastos;
  - `Salarios`: abre pago de salarios;
  - `Regalos`: abre carga de regalos.

### Acciones inferiores

- Al entrar a una accion, se oculta el resumen superior para dar foco al modulo activo.
- Debajo del resumen quedan accesos compactos y del mismo tamano a `Clientes`, `Resumen cajas` y `Cerrar caja`.
- Al cambiar de pantalla desde el panel del cajero se limpian avisos anteriores para evitar mensajes viejos fuera de contexto.

## Contadores

- La carga de contadores se abre dentro del panel del cajero.
- No hay guardado automatico.
- Se editan IN/OUT y se guarda con boton.
- IN/OUT actual no puede ser menor al anterior.
- Si IN/OUT actual queda menor al anterior, la fila y el campo quedan marcados en rojo.
- Se muestran entrada total, salida total y resultado.

## Gastos, transferencias y regalos

- Se cargan desde una fila directa en tabla.
- Gastos se pueden eliminar mientras la caja esta abierta, antes del cierre.
- En gastos son obligatorios solo categoria, subcategoria y monto; descripcion y comprobante son opcionales.
- El comprobante de gasto guarda solo nombre/tipo del archivo en esta etapa local; no se guarda la imagen/PDF completo en `localStorage` para evitar caidas por limite de almacenamiento.
- Encargado tiene pantalla propia `Control de gastos`.
- `Control de gastos` muestra gastos por caja, local, categoria, subcategoria, descripcion, comprobante, monto, usuario, estado y estado de revision.
- La tabla de `Control de gastos` permite ordenar por fecha, caja, local, categoria, subcategoria, descripcion, comprobante, monto, usuario, estado y revision.
- Estados de revision de gasto: `PENDIENTE`, `REVISADO`, `OBSERVADO`.
- El encargado puede marcar un gasto como revisado u observado; si lo observa debe escribir observacion.
- El encargado puede anular un gasto con motivo obligatorio; no se borra el registro y se anula el movimiento de cuenta asociado.
- Transferencias se pueden anular.
- Gastos usan categorias y subcategorias definidas por administrador.
- Transferencias y regalos pueden asociarse a clientes existentes.
- Regalos usan selector de clientes en ventana aparte, con buscador y seleccion multiple.
- En regalos no se usa tipo; siempre son en efectivo.
- En regalos son obligatorios cliente, referencia y monto; detalle es opcional.
- La referencia de regalos se elige desde una lista cerrada.
- La referencia de regalos inicia por defecto en `Cajero`.
- Regalos se pueden eliminar mientras la caja esta abierta, antes del cierre.

## Retiros y aportes de capital

- Los retiros y aportes se cargan desde el panel del cajero y tambien estan disponibles para usuarios con menu lateral cuando hay caja abierta.
- Campos: tipo (`RETIRO` o `APORTE`), momento (`APERTURA`, `OPERATIVO` o `CIERRE`), medio (`EFECTIVO` o `TRANSFERENCIA`), persona (`RICARDO` o `MATHIAS`), monto y nota opcional.
- En la pantalla operativa de `Retiros y aportes`, el tipo inicia vacio y es obligatorio seleccionar retiro o aporte.
- El campo momento no se muestra en esa pantalla; se guarda internamente como `OPERATIVO`.
- Cada movimiento guarda fecha/hora, usuario, local, caja y estado.
- Los movimientos `APERTURA` solo se usan para el primer aporte de capital y no se duplican en el efectivo esperado porque ya forman parte del saldo inicial.
- Los movimientos `OPERATIVO` se cargan durante la caja.
- Los movimientos `CIERRE` se generan desde la pantalla de cierre como retiro final.
- Un retiro es salida de la cuenta corriente del local.
- Un aporte es entrada de la cuenta corriente del local.
- Si el medio es `EFECTIVO`, afecta la cuenta `Local / Efectivo` y el efectivo esperado de caja.
- Si el medio es `TRANSFERENCIA`, afecta la cuenta `Local / Banco` y no cambia el efectivo fisico esperado.
- Se pueden anular movimientos; la anulacion deja auditoria y anula el movimiento de cuenta asociado.

## Personal

- Administrador puede agregar, editar, dar de baja y enviar personal a papelera.
- Datos: nombre, apellido, documento, direccion, telefono, email, nacimiento, cargo, local, fecha ingreso, salario, adelantos, vacaciones, contacto emergencia, cuenta bancaria, horarios y notas.
- Alta/edicion muestra una nota visible de campos obligatorios y marca cada requerido con `*`.
- Campos obligatorios: nombre, apellido, cargo, local, estado, tipo salario y salario nominal.
- Cargo se selecciona de una lista cerrada: `Cajera/o`, `Encargado/a`, `Mantenimiento` y `Limpieza`.
- Horarios se registran por dia de semana.
- La baja no elimina el registro.

## Liquidacion de salarios

- Administrador tiene modulo de liquidacion mensual.
- Encargado puede acceder a personal y liquidacion de salarios simple para revisar y cargar pagos por mes.
- Cajero tiene carga rapida de salarios desde su panel.
- Conceptos actuales:
  - `SALARIO`
  - `ADELANTO`
  - `EXTRA`
  - `AGUINALDO`
  - `SALARIO_VACACIONAL`
  - `HORAS_EXTRAS`
  - `DESCUENTO`
- `SUELDO` y `AJUSTE` quedan como conceptos heredados para compatibilidad con datos previos; en pantalla `SUELDO` se muestra como `Salario` y `AJUSTE` se normaliza como `Premio / Gratificacion`.
- El panel del cajero y el panel de encargado/admin usan `SalarySettlement` como fuente canonica; el cajero tiene lista reducida de carga y encargado/admin mantienen la lista completa.
- En cajero, los nuevos pagos de salario solo permiten conceptos `SALARIO` y `ADELANTO`.
- En cajero se cargan `Personal`, `Concepto`, `Periodo trabajado` y `Monto`.
- En cajero, `Personal` inicia vacio y es obligatorio seleccionar una persona activa.
- En cajero, `Concepto` es obligatorio y debe seleccionarse manualmente.
- En cajero, `Periodo trabajado` es obligatorio y se guarda en `SalarySettlement.period`.
- La sugerencia automatica del periodo trabajado usa la fecha operativa de la caja: dias 1 al 10 inclusive sugieren el mes anterior; desde el dia 11 sugiere el mes actual.
- Los pagos de salario cargados por cajero quedan asociados a la caja abierta por `balanceId`, pero se imputan a la liquidacion del periodo trabajado elegido.
- `SalarySettlement` sigue siendo la fuente canonica de pagos/liquidaciones de salario; no existe una tabla paralela para pagos del cajero.
- Los pagos de salario cargados por cajero se pueden anular mientras la caja esta abierta, igual que gastos.
- Si se anula un adelanto de salario antes del cierre, se recalcula el saldo de adelantos del personal.
- Anular un pago de salario desde cajero es baja logica: cambia a `ANULADA`, deja de impactar caja, liquidacion y cuenta personal, y conserva auditoria.
- Cada empleado inicia cada periodo mensual con un salario base tomado de su ficha salarial vigente.
- La liquidacion se ordena por periodo trabajado, no por fecha de pago. El salario trabajado en enero puede pagarse del 1 al 10 de febrero, pero sigue asociado al periodo enero.
- El salario base no se carga como liquidacion: nace desde `Personal` y su historial salarial.
- Encargado/admin pueden modificar tipo de salario y salario base desde `Personal`; cada cambio genera historial con fecha efectiva, valor anterior, valor nuevo, usuario y motivo.
- El cambio de salario base es prospectivo: no modifica liquidaciones cerradas. Si la fecha efectiva afectaria un cierre de liquidacion ya cerrado, el sistema bloquea el cambio.
- Si el cambio de salario base afecta periodos abiertos con liquidaciones activas, el sistema pide reconfirmacion antes de guardar.
- Tipos de salario disponibles: mensual, jornal y hora.
- En el caso mensual, el salario base representa 30 dias de trabajo.
- En admin/encargado, la liquidacion se carga desde el detalle de cada empleado.
- La pantalla de liquidacion usa selector mensual: primero muestra el nombre del mes anterior, luego el mes actual y luego `Consultar mes`.
- `Consultar mes` permite elegir mes y ano, no un rango entre dos fechas.
- Al entrar a `Liquidacion de salarios`, el periodo inicial se sugiere por fecha de pago: dias 1 al 10 abren en mes anterior; desde el dia 11 abren en mes actual.
- La sugerencia del periodo en `Liquidacion de salarios` no bloquea: encargado/admin pueden cambiar a cualquiera de los meses disponibles o elegir otro mes/ano manualmente.
- La vista principal se centra en liquidacion por empleado: nombre, salario base, premios y horas, bonos, descuentos, total, adelantos, salario pagado, pendiente y accion.
- La vista principal no tiene buscador.
- La vista principal no muestra la cuenta corriente general del personal y no tiene boton global de agregar liquidacion.
- Cada fila de empleado tiene boton `Detalle`; desde ahi se agregan y revisan sus liquidaciones.
- La celda de nombre indica si el empleado no tiene liquidacion cargada o cuantas liquidaciones activas tiene en el periodo, junto con el estado consolidado.
- La base economica de la liquidacion nace en `Personal`: todo empleado activo aporta su salario base al periodo aunque aun no tenga liquidacion cargada.
- Si se modifica el salario base, el periodo usa el valor vigente segun historial salarial.
- Una liquidacion con concepto `Salario` no reemplaza la base: registra un pago realizado contra el pendiente.
- Si un empleado activo no tiene pagos cargados en el periodo, aparece en la tabla y su salario base igualmente integra los totales.
- Total por empleado = salario base + premio/gratificacion + horas extras + bonos - descuentos.
- Pagado / Entregado por empleado = salario pagado + adelantos + premio/gratificacion + horas extras + bonos.
- Cubierto base por empleado = salario pagado + adelantos + descuentos.
- Pendiente por empleado = salario base - salario pagado - adelantos - descuentos. Es el dinero de salario base que falta entregarle al empleado.
- Regla de limite: el salario pagado no puede superar el salario base del periodo.
- Regla de limite combinada: salario pagado + adelantos no puede superar el salario base del periodo. Si sucede, el sistema muestra error y no guarda la liquidacion.
- Regla de limite con descuentos: salario pagado + adelantos + descuentos no puede superar el salario base del periodo. El descuento cubre base, pero no es dinero entregado ni salida de caja.
- Los adelantos restan pendiente pero no se suman al total.
- Resumen global: pendientes, total salarios, total salarios base y premios/horas.
- En el detalle de empleado se muestra un resumen compacto de salario base, adelantos, premios/horas, bonos, total, cubierto base, pagado/entregado y pendiente, junto con local, periodo, tipo/cargo y descuentos.
- El detalle de empleado muestra resumen, liquidaciones del periodo y cuenta corriente del empleado.
- En `Liquidaciones del periodo`, el boton `Agregar liquidacion` abre un formulario con mes, personal fijo, concepto principal, monto y notas.
- La tabla `Liquidaciones del periodo` permite ordenar por mes, concepto, salario pagado, adelanto, premio/gratificacion, horas extras, bonos, descuento y estado.
- El personal no se puede cambiar desde ese formulario porque se entra desde el detalle del empleado.
- El estado no se elige manualmente: al guardar, la liquidacion queda `CONFIRMADA`; eliminarla la cambia a `ANULADA`.
- Impacto por concepto: salario suma a salario pagado; adelanto suma a adelantos; aguinaldo y salario vacacional suman a bonos; premio/gratificacion suma como reconocimiento interno al empleado; horas extras suma como pago por horas trabajadas fuera del horario/base; descuento resta directo del salario base y no genera salida de caja.
- `EXTRA` queda solo como codigo tecnico interno; en interfaz se muestra `Premio / Gratificacion` y no pertenece al modulo Regalos de clientes.
- Cada liquidacion guarda origen (`CAJA` o `LIQUIDACION`), usuario creador, usuario aprobador, fecha de aprobacion y, si se elimina, usuario/fecha de anulacion.
- Los movimientos de cuenta de liquidaciones usan el usuario real que ejecuto la accion.
- La cuenta corriente del empleado dentro del detalle muestra fecha, concepto, monto, total, pendiente y usuario; todas esas columnas son ordenables. `Total` es base + premio/gratificacion + horas extras + bonos - descuentos al momento del movimiento y `Pendiente` es el pendiente al momento de registrar ese movimiento.
- La cuenta corriente del empleado se filtra por periodo trabajado de la liquidacion; si se carga una liquidacion de un mes anterior hoy, aparece dentro del mes anterior correspondiente.
- Clic en un movimiento de la cuenta corriente del empleado abre un detalle completo con origen, usuario, recaudacion asociada y notas.
- Si ese movimiento tiene `balanceId`, el detalle permite abrir el resumen completo de la recaudacion asociada.
- La pantalla permite cerrar la liquidacion del periodo seleccionado. El cierre guarda una foto auditada con totales, cubierto base, pagado/entregado, empleados, liquidaciones incluidas, usuario y fecha.
- El cierre de liquidacion no borra movimientos ni liquida automaticamente obligaciones legales; sirve como corte mensual/historico para iniciar y controlar periodos siguientes.
- La pantalla muestra abajo un historial de cierres de liquidacion; un cierre puede anularse sin borrar auditoria.
- La tabla de historial de cierres de liquidacion permite ordenar por ID, periodo, empleados, total salarios, cubierto base, pagado/entregado, pendiente, usuario, fecha cierre y estado.
- Exportar Excel descarga un CSV compatible con Excel del periodo consultado.
- En esta etapa la liquidacion no calcula automaticamente obligaciones legales; se registra manualmente por concepto para saber cuanto se pago, a quien y por que.
- El efectivo en caja descuenta solo salarios asociados a esa caja; una caja nueva siempre inicia salarios en 0.

## Cierre periodico

- Encargado y administrador pueden generar cierres periodicos.
- Tipos disponibles: `SEMANAL`, `QUINCENAL`, `MENSUAL` y `PERSONALIZADO` entre fechas.
- El cierre periodico consolida cajas cerradas dentro del rango seleccionado.
- Totales visibles:
  - resultado economico;
  - resultado de maquinas;
  - salida total;
  - gastos;
  - salarios;
  - regalos;
  - transferencias;
  - retiros;
  - aportes;
  - diferencias de efectivo;
  - diferencias de banco;
  - diferencias pendientes.
- Al guardar un cierre periodico se crea una foto auditada del rango con sus cajas incluidas y totales.
- Un cierre periodico se puede anular, pero no se borra; queda auditado.
- Cierre periodico vive en `src/features/reports/Periodic.tsx`.
- Las tablas de cajas incluidas y cierres guardados permiten ordenar por cada columna visible de datos.

## Cuentas corrientes

- Existe un libro interno de cuentas corrientes.
- Cada empleado tiene una cuenta corriente automatica, visible desde `Liquidacion de salarios`.
- Existe una cuenta corriente unica para transferencias.
- Cada local tiene dos cuentas corrientes automaticas:
  - `Local / Efectivo`;
  - `Local / Banco`.
- Los saldos no se cargan manualmente: se calculan desde movimientos.
- Los movimientos tienen cuenta, origen, fecha, usuario, concepto, direccion, monto y estado.
- La pantalla `Cuentas corrientes` no repite el titulo principal dentro del contenido; inicia con descripcion operativa y contadores de cuentas/movimientos.
- La pantalla `Cuentas corrientes` no muestra cuentas personales; esas se consultan en `Liquidacion de salarios`.
- `Cuentas corrientes` abre por defecto en mes corriente.
- Permite consultar el mes anterior, el mes actual o `Consulta historica` por mes y ano.
- Cuentas corrientes, Diferencias y Liquidacion de salarios usan el mismo selector mensual compartido para mantener meses, anos, etiquetas y tamanos consistentes.
- Encargado ve solo cuentas y movimientos de sus locales asignados; en la demo actual ve Poseidon.
- La pantalla no muestra tarjetas superiores de entrada/salida/saldo local; se centra en periodo, cuentas y movimientos.
- La tabla de movimientos muestra fecha, tipo, detalle, usuario, debito, credito y saldo.
- `Debito` representa salidas de la cuenta; `Credito` representa entradas.
- El saldo de la tabla es corrido y considera saldo activo anterior al mes seleccionado.
- El calculo de saldo corrido usa una unica regla compartida y probada, ordenada cronologicamente desde el saldo anterior.
- El listado lateral y el resumen de cuenta muestran `Saldo final`: saldo anterior + entradas - salidas del periodo visible.
- Al hacer clic en un movimiento se muestra detalle completo, recaudacion asociada y acceso al resumen completo de esa recaudacion cuando exista.
- En empleados, los pagos y adelantos se registran como salidas.
- `Liquidacion de salarios` muestra la cuenta corriente dentro del detalle de cada empleado, no como seccion general de la pantalla.
- En transferencias, cada transferencia se registra como entrada en la cuenta de transferencias.
- En locales:
  - resultado de maquinas positivo entra en `Local / Efectivo`;
  - resultado de maquinas negativo sale de `Local / Efectivo`;
  - gastos, regalos y salarios salen de `Local / Efectivo`;
  - transferencias entran en `Local / Banco`;
  - retiros salen de `Local / Efectivo` o `Local / Banco` segun medio;
  - aportes entran en `Local / Efectivo` o `Local / Banco` segun medio;
  - diferencias de caja entran o salen de `Local / Efectivo` y/o `Local / Banco` para reflejar el saldo declarado al cierre.
- Si se elimina un salario antes del cierre, se elimina tambien su movimiento de cuenta.
- Si se anula una transferencia, se anula tambien su movimiento de cuenta.
- Administrador puede ver `Cuentas corrientes` como pantalla solo lectura de saldos y movimientos, incluyendo usuario que ejecuto cada movimiento.

## Clientes

- Administrador y cajero pueden agregar y editar clientes.
- Clientes se pueden enviar a papelera.
- El cliente se identifica por documento.
- El documento es obligatorio al crear o editar clientes.
- El tipo de documento puede ser `Cedula` o `Pasaporte`.
- Cedula acepta solo numeros; pasaporte acepta letras y numeros.
- No puede existir otro cliente activo o inactivo con el mismo tipo de documento y numero.
- Al restaurar desde papelera tambien se valida que no exista otro cliente activo o inactivo con el mismo documento.
- Datos: nombre, tipo de documento, documento, telefono, email, direccion, nacimiento, local, categoria, notas y estado.
- Clientes pueden tener foto y archivo de cedula/pasaporte cargado.
- En la etapa local, los archivos de clientes guardan metadatos: nombre, tipo, tamano y fecha de carga; no se guarda el archivo completo en `localStorage`.
- Las tablas, buscadores y selectores de clientes muestran o buscan por documento.
- Clientes se usan en regalos y transferencias.

## Papelera

- Existe para personal y clientes.
- Permite restaurar o eliminar definitivamente.
- La eliminacion definitiva requiere confirmacion y auditoria.

## Auditoria

- Todo objeto creado, editado, anulado, enviado a papelera, restaurado o eliminado debe quedar registrado en auditoria.
- Cada evento registra fecha/hora, id de usuario, nombre de usuario al momento de la accion, funcion usada, accion, entidad, id de entidad, valor anterior, valor nuevo y motivo.
- Auditoria se usa para cambios sensibles, anulaciones, cierres, liquidaciones y papelera.

## Estado actual al 2026-07-06

- Proyecto en prueba local, sin publicacion nueva.
- Build local validado con `pnpm run build`.
- El servidor local debe levantarse solo con `iniciar-poseidon.bat` y probarse en `http://127.0.0.1:5173/`.
- Si el puerto 5173 queda ocupado, se libera con `detener-poseidon.bat`.
- Contadores usan guardado manual con boton `Guardar contadores`.
- En cierre de caja, los selectores de retiro final quedan deshabilitados y en gris con `Sin retiros finales` cuando el monto es `0`.
- El panel del encargado esta en version minimalista con tarjetas estilo resumen de caja.
- La barra lateral de encargado/admin usa grupos desplegables.
- Liquidacion de salarios usa periodo trabajado, validacion de salario base, tablas ordenables y resumen compacto en el detalle de empleado.
- Pago de salarios desde cajero quedo limitado a Salario/Adelanto, con periodo trabajado obligatorio y anulación logica antes del cierre.
- Queda pendiente reimplementar Supabase/Auth real y storage real de comprobantes/imagenes en una etapa posterior.
- Para retomar, revisar `docs/RETOMAR_MANANA.md` y `docs/MAPA_TECNICO.md`.

## Validacion habitual

Antes de cerrar un cambio:

1. Ejecutar `pnpm run build`.
2. Verificar que `http://127.0.0.1:5173/` responda.
3. Probar el flujo afectado con usuario correspondiente.
4. Actualizar este documento si cambian reglas, pantallas, campos o calculos.
