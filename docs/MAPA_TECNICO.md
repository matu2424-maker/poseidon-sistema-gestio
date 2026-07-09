# Poseidon - Mapa tecnico del sistema

Ultima actualizacion: 2026-07-09

Este documento resume como esta armado el sistema para seguir programando sin perder contexto.

## Stack y estado

- Frontend: React + Vite + TypeScript.
- Estilos: CSS global en `src/styles/global.css`.
- Persistencia actual: `localStorage`, clave `poseidon-sistema-gestion-v2`.
- Backend real: pendiente. Supabase/Auth/Storage no estan activos.
- Archivos subidos: se guardan metadatos, no el archivo completo.
- Publicacion: no publicar ni desplegar sin confirmacion explicita del usuario.
- Servidor local oficial: `iniciar-poseidon.bat` en `http://127.0.0.1:5173/`; liberar puerto con `detener-poseidon.bat`.

## Archivos principales

- `src/App.tsx`: estado general, pantallas, acciones de UI y render principal.
- `src/types.ts`: tipos principales del dominio.
- `src/lib/money.ts`: formato de dinero/contadores y helpers de inputs monetarios.
- `src/lib/dates.ts`: fecha actual, hora visible, fecha/hora y rangos mensuales.
- `src/lib/audit.ts`: construccion centralizada de eventos de auditoria.
- `src/lib/clients.ts`: documento de clientes, normalizacion, busqueda y duplicados.
- `src/lib/export.ts`: descarga de archivos, exportacion CSV y exportacion Excel-compatible de cierre diario.
- `src/lib/files.ts`: metadatos locales de archivos subidos.
- `src/lib/storage.ts`: lectura/escritura de `localStorage`, compactacion y preferencias de columnas.
- `src/lib/currentAccounts.ts`: ids, creacion, asegurado y saldos de cuentas corrientes.
- `src/lib/accountMovements.ts`: movimientos contables por origen y totales corridos desde movimientos.
- `src/lib/cashTotals.ts`: calculo de contadores y totales por recaudacion.
- `src/lib/differences.ts`: estado, conteo e impacto funcional de diferencias de caja.
- `src/lib/display.ts`: nombres visibles, roles e IDs visibles compartidos.
- `src/lib/ids.ts`: generacion de IDs locales para entidades demo/localStorage.
- `src/lib/machineHistory.ts`: construccion de eventos de historial de maquinas.
- `src/lib/people.ts`: helpers de nombres visibles de personal.
- `src/lib/salaryRules.ts`: conceptos, periodos, base salarial, importes y validaciones de salarios.
- `src/lib/sorting.ts`: estado y helpers compartidos para ordenar tablas por columnas visibles.
- `src/features/cashier/OpenCash.tsx`: apertura de caja y listado de ultimas cajas cerradas.
- `src/features/cashier/ClosedBalanceSummary.tsx`: resumen solo lectura de una caja cerrada.
- `src/features/cashier/Counters.tsx`: carga manual de IN/OUT, validaciones y totales previos al guardado.
- `src/features/cashier/CloseCash.tsx`: cierre de caja, declaracion final, retiros finales y sincronizacion de diferencias/cuentas.
- `src/features/cashier/Movements.tsx`: gastos, transferencias, regalos, salarios desde caja, retiros/aportes y clientes del cajero.
- `src/features/manager/Differences.tsx`: pantalla de gestion e historial de diferencias.
- `src/features/manager/Expenses.tsx`: control, revision, observacion y anulacion auditada de gastos para encargado/admin.
- `src/features/salaries/SalarySettlements.tsx`: liquidacion de salarios, detalle de empleado, cuenta personal y cierres de liquidacion.
- `src/features/admin/Clients.tsx`: clientes administrativos y editor compartido por administrador/cajero.
- `src/features/admin/Staff.tsx`: personal, editor de personal, historial salarial y papelera.
- `src/features/admin/Settings.tsx`: usuarios y categorias/subcategorias de gastos.
- `src/features/audit/Audit.tsx`: bitacora general con ordenamiento por fecha, usuario, accion y entidad.
- `src/features/reports/Reports.tsx`: reportes iniciales, exportaciones y tabla ordenable de cierres.
- `src/components/ui.tsx`: componentes visuales compartidos `InfoCard`, `FormButtons`, `Modal`, `ColumnChooser` y `TableColumn`.
- `src/styles/global.css`: clases visuales de toda la app.
- `src/main.tsx`: arranque React.
- `src/components/WelcomeScreen.tsx`: componente heredado/no usado por el flujo actual.
- `docs/POSEIDON_FUNCIONAMIENTO.md`: reglas funcionales vivas.
- `docs/RETOMAR_MANANA.md`: resumen rapido para continuar.
- `docs/REGLAS_CONTABLES.md`: matriz de impacto economico, financiero y cuentas corrientes.
- `docs/REGLAS_VISUALES.md`: criterios visuales permanentes.
- `docs/MODULARIZACION_REFERENCIAS.md`: plan de modularizacion con dependencias cruzadas.
- `docs/contextos/`: contextos cortos por modulo para reducir lectura repetida.
- `README.md`: guia general del proyecto.

## Datos demo

- `createSeedData()` arma la demo inicial.
- `createDemoOperationalData()` agrega datos operativos para probar encargado/admin/cajero:
  - cajas cerradas;
  - lecturas de maquinas;
  - gastos, transferencias, regalos y salarios;
  - aportes/retiros;
  - movimientos de cuenta corriente;
  - auditoria demo.
- El boton `Reiniciar demo` vuelve a este estado inicial.
- `monthRange()` vive en `src/lib/dates.ts` y apoya vistas mensuales.
- `accountTotals()` y `localAccountBalances()` viven en `src/lib/currentAccounts.ts`.
- `accountTotalsFromMovements()` vive en `src/lib/accountMovements.ts` y apoya saldo corrido por periodo.

## Documentacion modular

- `docs/REGLAS_GENERALES.md`: reglas globales de funcionamiento, contabilidad, auditoria y estetica.
- `docs/REGLAS_CONTABLES.md`: reglas economicas, financieras y matriz de impactos.
- `docs/REGLAS_VISUALES.md`: reglas de UI, tablas, botones, modales y formularios.
- `docs/MODULARIZACION_REFERENCIAS.md`: mapa de refactor con referencias obligatorias entre modulos.
- `docs/modulos/00_base_sistema.md`: base, usuarios, roles y persistencia.
- `docs/modulos/01_panel_cajero.md`: panel del cajero.
- `docs/modulos/02_caja_diaria.md`: apertura y resumen de cajas.
- `docs/modulos/03_contadores.md`: IN/OUT y recaudacion de maquinas.
- `docs/modulos/04_movimientos_operativos.md`: gastos, transferencias, regalos, salarios, retiros y aportes.
- `docs/modulos/05_cierre_caja.md`: cierre diario y declaracion final.
- `docs/modulos/06_diferencias_caja.md`: diferencias de efectivo y banco.
- `docs/modulos/07_panel_encargado.md`: panel y funciones del encargado.
- `docs/modulos/08_panel_administrador.md`: panel y funciones del administrador.
- `docs/modulos/09_locales_maquinas_taller.md`: locales, maquinas, taller y desuso.
- `docs/modulos/10_clientes_personal_sueldos.md`: clientes, personal y salarios.
- `docs/modulos/11_cuentas_corrientes.md`: cuentas corrientes y movimientos.
- `docs/modulos/12_auditoria.md`: auditoria del sistema.

## Contextos cortos

- `docs/contextos/CODEX_CAJA.md`: cajero, apertura, cierre, contadores y resumen.
- `docs/contextos/CODEX_DIFERENCIAS.md`: diferencias, correcciones, historial y cuentas asociadas.
- `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`: cuentas, movimientos, debito/credito y saldos.
- `docs/contextos/CODEX_SALARIOS.md`: personal, pagos, liquidacion, periodo trabajado y cuenta personal.
- `docs/contextos/CODEX_ENCARGADO.md`: panel del encargado, diferencias, gastos, cuentas y cierres.
- `docs/contextos/CODEX_ADMINISTRACION.md`: administrador, menus, usuarios, configuraciones y control global.
- `docs/contextos/CODEX_LOCALES_MAQUINAS.md`: locales, maquinas, taller, desuso e historial.
- `docs/contextos/CODEX_CLIENTES_PERSONAL.md`: clientes, personal, documentos, papelera y asociaciones.
- `docs/contextos/CODEX_AUDITORIA.md`: auditoria transversal, usuario real, funcion usada e historiales.

## Deuda tecnica actual

- `src/App.tsx` sigue siendo demasiado grande. Conviene refactorizar de a poco despues de estabilizar flujos.
- Modularizacion iniciada con utilidades puras, helpers de presentacion, storage, auditoria, ordenamiento, reglas de salarios, movimientos contables, totales de caja, apertura/resumen/cierre de caja, contadores y diferencias. Falta mover mas componentes UI.
- `src/components/WelcomeScreen.tsx` no esta conectado al flujo actual y sus clases no son parte del CSS activo.
- Hay textos sin acentos por decision de mantener ASCII y evitar problemas de codificacion.
- El servidor local necesita iniciarse fuera del sandbox cuando se quiere usar el navegador integrado.

## Refactor recomendado

Extraer sin cambiar comportamiento y siguiendo `docs/MODULARIZACION_REFERENCIAS.md`:

- `src/lib/money.ts` - implementado.
- `src/lib/dates.ts` - implementado.
- `src/lib/audit.ts` - implementado: construccion de eventos con usuario real y funcion usada.
- `src/lib/clients.ts` - implementado.
- `src/lib/export.ts` - implementado.
- `src/lib/files.ts` - implementado.
- `src/lib/storage.ts` - implementado: almacenamiento principal, compactacion y preferencias de columnas.
- `src/lib/currentAccounts.ts` - implementado: ids, cuentas y saldos.
- `src/lib/accountMovements.ts` - implementado: movimientos por origen y saldo corrido de movimientos.
- `src/lib/cashTotals.ts` - implementado.
- `src/lib/differences.ts` - implementado.
- `src/lib/display.ts` - implementado.
- `src/lib/ids.ts` - implementado.
- `src/lib/machineHistory.ts` - implementado.
- `src/lib/people.ts` - implementado.
- `src/lib/salaryRules.ts` - implementado.
- `src/lib/sorting.ts` - implementado.
- `src/components/ui.tsx` - implementado: tarjetas, botones, modales y selector de columnas.
- `src/features/manager/Differences.tsx` - implementado.
- `src/features/cashier/OpenCash.tsx` - implementado.
- `src/features/cashier/ClosedBalanceSummary.tsx` - implementado.
- `src/features/cashier/Counters.tsx` - implementado.
- `src/features/cashier/CloseCash.tsx` - implementado.
- `src/features/cashier/Movements.tsx` - implementado.
- `src/features/manager/Expenses.tsx` - implementado.
- `src/features/salaries/SalarySettlements.tsx` - implementado.
- `src/features/admin/Clients.tsx` - implementado.
- `src/features/admin/Staff.tsx` - implementado.
- `src/features/admin/Settings.tsx` - implementado.
- `src/features/audit/Audit.tsx` - implementado.
- `src/features/reports/Reports.tsx` - implementado.
- `src/features/admin/Locals.tsx`
- `src/features/admin/Machines.tsx`

Cada extraccion debe dejar imports/referencias claras hacia los modulos asociados. No duplicar reglas contables ni visuales dentro de componentes.

## Flujo de roles

### Cajero

- No usa barra lateral.
- Entra al panel del cajero.
- Si no hay caja abierta, solo usa Clientes, Resumen cajas y Abrir caja.
- Si hay caja abierta, puede cargar contadores, gastos, transferencias, regalos, salarios, retiros/aportes y cerrar caja.
- Al cerrar caja, va directo a Resumen de cajas.

### Encargado

- Entra al Panel del encargado.
- No opera caja desde el menu lateral.
- Puede pasar a funcion Cajero desde la cabecera.
- Revisa diferencias, gastos, cuentas corrientes, cierres periodicos, reportes, personal, liquidaciones y clientes.

### Administrador

- Tiene acceso completo a administracion.
- No opera caja desde el menu lateral.
- Para operar caja cambia a funcion Cajero desde la cabecera.

## Pantallas principales en `App.tsx`

- `Welcome`: pantalla inicial real.
- `Login`: seleccion local de usuario sin password.
- `Shell`: layout con barra lateral para encargado/admin.
- `CashierWorkspace`: layout sin barra lateral para cajero.
- `Panel`: panel inicial segun rol efectivo.
- `OpenCash`: apertura y resumen de ultimas cajas. Vive en `src/features/cashier/OpenCash.tsx`.
- `ClosedBalanceSummary`: resumen solo lectura de caja cerrada. Vive en `src/features/cashier/ClosedBalanceSummary.tsx`.
- `Counters`: carga manual de IN/OUT. Vive en `src/features/cashier/Counters.tsx`.
- `Expenses`: carga de gastos desde tabla. Vive en `src/features/cashier/Movements.tsx`.
- `ManagerExpenses`: control y revision de gastos por encargado/admin. Vive en `src/features/manager/Expenses.tsx`.
- `Transfers`: transferencias. Vive en `src/features/cashier/Movements.tsx`.
- `Gifts`: regalos con selector de clientes. Vive en `src/features/cashier/Movements.tsx`.
- `CashierSalaryPayments`: carga simple de salarios. Vive en `src/features/cashier/Movements.tsx`.
- `CapitalMovements`: retiros y aportes. Vive en `src/features/cashier/Movements.tsx`.
- `CashierClients`: clientes desde cajero. Vive en `src/features/cashier/Movements.tsx`.
- `AdminClients`: clientes administrativos. Vive en `src/features/admin/Clients.tsx`.
- `CloseCash`: cierre de caja. Vive en `src/features/cashier/CloseCash.tsx`.
- `Reports`: reportes/exportaciones. Vive en `src/features/reports/Reports.tsx`.
- `AdminCurrentAccounts`: cuentas corrientes.
- `AdminStaff`: personal. Vive en `src/features/admin/Staff.tsx`.
- `AdminSalarySettlements`: liquidacion simple. Vive en `src/features/salaries/SalarySettlements.tsx`.
- `AdminUsers`: usuarios. Vive en `src/features/admin/Settings.tsx`.
- `AdminExpenseCategories`: categorias/subcategorias de gastos. Vive en `src/features/admin/Settings.tsx`.
- `AdminMachines`: maquinas y taller.
- `AdminMachineEditor`: alta/edicion/reset/envio a taller/eliminacion de maquina.
- `AdminLocals`: locales.
- `AdminLocalEditor`: alta/edicion/cierre/quitar local y asociar maquinas.
- `Differences`: gestion de diferencias de caja. Vive en `src/features/manager/Differences.tsx`.
- `Audit`: auditoria. Vive en `src/features/audit/Audit.tsx`.
- `Periodic`: cierres periodicos.

## Calculos criticos

### Resultado de maquina

`resultado = (IN actual - IN anterior) - (OUT actual - OUT anterior)`

IN/OUT actual no puede ser menor que IN/OUT anterior.

### Resultado economico

`resultado economico = resultado maquinas - gastos - salarios - regalos`

No incluye:

- transferencias;
- aportes;
- retiros;
- efectivo inicial;
- banco inicial;
- diferencias de caja.

### Efectivo esperado

Parte del efectivo inicial y mueve:

- suma resultado de maquinas;
- suma aportes en efectivo;
- resta gastos;
- resta salarios;
- resta regalos en efectivo;
- resta transferencias;
- resta retiros en efectivo.

### Banco esperado

Se calcula desde la cuenta banco del local menos retiros finales por transferencia.

### Diferencias

- Diferencia efectivo = efectivo declarado - efectivo esperado.
- Diferencia banco = banco declarado - banco esperado.
- Si hay diferencia, la observacion de cierre es obligatoria.
- Las diferencias no modifican automaticamente resultado economico.
- Al cerrar caja, las diferencias se sincronizan como movimientos `DIFERENCIA_CAJA` en las cuentas del local para que efectivo/banco queden en el saldo real declarado.
- Encargado/admin las gestionan con accion y observacion obligatoria.
- `VERIFICADA` mantiene activos los movimientos de diferencia.
- `CORREGIDA` permite editar efectivo/banco declarado, recalcula diferencia, actualiza saldos proximos y resincroniza movimientos `DIFERENCIA_CAJA`.
- `ANULADA` anula los movimientos de diferencia y revierte su impacto en saldos.
- `Differences` abre como historial del mes actual, permite mes anterior o intervalo manual, buscar por ID/local/fecha/observacion, filtrar por estado y gestionar cada recaudacion desde ventana flotante.
- La tabla incluye recaudaciones con historial de diferencia/control aunque la diferencia actual sea cero.
- La tabla principal es compacta y ordenable por todas sus columnas visibles de datos; el detalle de efectivo/banco, observacion original, ultima gestion, formulario de revision e historial auditado viven en el modal.

## Cuentas corrientes

Tipos:

- Transferencias.
- Local / Efectivo.
- Local / Banco.

Las cuentas personales existen para salarios/adelantos, pero se muestran en `Liquidacion de salarios`, no en la pantalla general de cuentas corrientes.

Movimientos:

- Resultado de maquinas positivo entra a Local / Efectivo.
- Resultado de maquinas negativo sale de Local / Efectivo.
- Gastos, regalos y salarios salen de Local / Efectivo.
- Transferencias entran a Local / Banco.
- Retiros salen de Local / Efectivo o Local / Banco.
- Aportes entran a Local / Efectivo o Local / Banco.
- Diferencias de caja entran o salen de Local / Efectivo o Local / Banco.
- `syncDifferenceAccountMovements()` mantiene esos movimientos sincronizados al cierre y al gestionar diferencias.
- La pantalla filtra por mes actual, mes anterior o rango historico manual.
- Encargado ve solo cuentas y movimientos de los locales asignados.
- La tabla de movimientos usa debito, credito y saldo corrido por cuenta.
- Clic en movimiento abre modal de detalle y, si hay `balanceId`, permite ver la recaudacion completa.

## Locales

- ID numerico corto.
- Estados: ACTIVO, INACTIVO, CERRADO.
- Al cerrar local, sus maquinas vuelven al Taller con confirmacion.
- Se puede agregar maquinas desde Taller al crear/editar local.
- Clic en cantidad de maquinas abre ventana flotante.
- Clic en nombre abre historial.

## Maquinas

- Nacen en Taller.
- Estados: ACTIVA, INACTIVA, MANTENIMIENTO, DESUSO.
- DESUSO solo se permite en Taller.
- Las maquinas en DESUSO no aparecen en el listado general.
- Para eliminar, primero deben estar en Taller.
- No se puede eliminar una maquina con recaudaciones.
- Reset de contadores exige que no haya caja abierta del local.
- Reset queda auditado e historializado.

## Clientes

- Se identifican por documento.
- Documento obligatorio.
- Cedula: solo numeros.
- Pasaporte: letras y numeros.
- No puede duplicarse tipo + documento en clientes activos/inactivos.
- Foto y cedula/pasaporte guardan solo metadatos en localStorage.

## Gastos

- Obligatorio: categoria, subcategoria y monto.
- Opcional: descripcion y comprobante.
- Comprobante guarda nombre/tipo/tamano/fecha, no archivo completo.
- Cajero puede eliminar/anular antes de cerrar caja.
- Encargado/admin pueden revisar, observar o anular con auditoria.

## Regalos

- Siempre son en efectivo en la etapa actual.
- Obligatorio: cliente, referencia y monto.
- Detalle opcional.
- Selector de clientes permite busqueda y seleccion multiple.
- Se pueden eliminar antes de cerrar caja.

## Salarios

- Cajero carga forma simple: personal, concepto, periodo trabajado y monto.
- Personal inicia vacio y es obligatorio.
- Conceptos administrativos: SALARIO, ADELANTO, EXTRA, HORAS_EXTRAS, AGUINALDO, SALARIO_VACACIONAL y DESCUENTO. `SUELDO` y `AJUSTE` quedan como conceptos heredados; `AJUSTE` se normaliza como Premio / Gratificacion en la interfaz.
- `cashierSalaryConceptOptions` limita nuevos pagos desde cajero a SALARIO y ADELANTO.
- `suggestedWorkedPeriodFromOperatingDate()` sugiere el periodo trabajado desde la fecha operativa de caja: dia 1 al 10 mes anterior, dia 11 en adelante mes actual.
- `suggestedSalaryPeriodModeFromDate()` define el modo inicial de `AdminSalarySettlements`: dia 1 al 10 abre mes anterior, dia 11 en adelante abre mes actual.
- `AdminSalarySettlements` consulta siempre un mes cerrado (`YYYY-MM`): botones con nombre de mes anterior/actual y selector historico por mes + ano.
- Admin/encargado tienen liquidacion mensual manual.
- `AdminSalarySettlements` arma una fila consolidada por empleado: la base sale de `salaryBaseForPeriod()` usando la ficha de `StaffMember` y `salaryHistories`; las liquidaciones activas registran pagos o conceptos del periodo.
- La pantalla general de `AdminSalarySettlements` no muestra cuenta corriente del personal ni alta global; cada fila abre `Detalle`, y desde ahi se crea la liquidacion con empleado fijo, concepto, monto y notas.
- `CashierSalaryPayments` guarda pagos como `SalarySettlement` con `origin = CAJA`, `balanceId` de la caja actual y `period` del periodo trabajado seleccionado.
- `AdminSalarySettlements` usa `salaryConceptOptions` completo para conceptos administrativos.
- `normalizeSalaryConcept()` migra `SUELDO` heredado a `SALARIO` y `AJUSTE` heredado a `EXTRA` para nuevos calculos.
- `salaryConceptBreakdown()` centraliza el impacto del concepto: salario va a pago realizado, adelanto va a adelantos, aguinaldo/salario vacacional van a bonos, `EXTRA` queda como codigo tecnico para Premio / Gratificacion, horas extras va a pago fuera de horario y descuento va a descuentos.
- `salarySettlementAmount()` conserva el impacto de caja: salario y adelanto cuentan como salida de efectivo cuando se cargan desde caja; descuento no genera salida de caja.
- `salaryHistoryEvent()` registra cambios de tipo de salario o salario base con fecha efectiva, valores anterior/nuevo, usuario y motivo. El editor de personal bloquea cambios que afecten cierres cerrados y pide reconfirmacion si hay liquidaciones abiertas impactadas.
- `SalaryClosure` guarda cierres de liquidacion como foto auditada del periodo: empleados, liquidaciones incluidas, base, premios/horas, bonos, descuentos, total salarios, salario pagado, adelantos, cubierto base, pagado/entregado y pendiente.
- `AdminSalarySettlements` calcula `total = base + premio/gratificacion + horas extras + bonos - descuentos`, `pagado/entregado = salario pagado + adelantos + premio/gratificacion + horas extras + bonos`, `cubierto base = salario pagado + adelantos + descuentos` y `pendiente = base - cubierto base`.
- `validateSalarySettlementLimit()` bloquea liquidaciones cuando salario pagado supera salario base, cuando salario pagado + adelantos supera salario base o cuando salario pagado + adelantos + descuentos supera salario base.
- `SalarySettlement` guarda trazabilidad de origen, creador, aprobador y anulacion; `salaryAccountMovement()` y `localSalaryAccountMovement()` deben recibir el usuario real que ejecuto la accion.
- `Liquidaciones del periodo` dentro del detalle de empleado usa ordenamiento por mes, concepto, importes y estado.
- La cuenta corriente del empleado en el detalle muestra monto, total y pendiente al momento del movimiento, con todas sus columnas ordenables. Se reconstruye tambien desde `SalarySettlement` del periodo trabajado para que los pagos cargados hoy para un mes anterior aparezcan en ese periodo. Abre modal de detalle completo al hacer clic en una fila.
- El sistema registra, no liquida obligaciones legales automaticamente.

## Auditoria

Debe registrar:

- fecha/hora;
- usuario;
- rol real;
- funcion usada;
- accion;
- entidad;
- id;
- valor anterior;
- valor nuevo;
- motivo.

Las acciones sensibles usan confirmacion antes de ejecutarse.

## Clases CSS principales

### Layout general

- `app-shell`: layout con barra lateral.
- `side`, `side-brand`, `side-nav`: barra lateral.
- `side-group`, `side-group-title`, `side-link`: menu lateral desplegable.
- `main`, `top`, `top-meta`, `content`: zona central.

### Cajero

- `cashier-shell`: contenedor del flujo cajero.
- `cashier-top`: cabecera cajero.
- `cashier-content`: area principal.
- `cashier-panel`: marco del panel.
- `cashier-heading`: titulo y datos de caja.
- `cashier-summary-grid`: grilla de metricas.
- `cashier-metric`: tarjeta/boton de metrica.
- `cashier-metric.passive`: metrica solo lectura.
- `cashier-inline-view`: modulo abierto dentro del panel.
- `cashier-secondary-actions`: botones inferiores alineados.
- `cashier-required`: estado sin caja abierta.

### Encargado

- `manager-dashboard`: contenedor del panel.
- `manager-dashboard-minimal`: version actual simplificada.
- `manager-minimal-grid`: grilla de tarjetas.
- `manager-shortcuts`: grilla de accesos rapidos del encargado, con botones de ancho/altura consistente.
- `detail-card-surface`: estilo tipo resumen de caja.

### Cierre de caja

- `close-cash-page`: pantalla.
- `close-cash-toolbar`: cabecera interna.
- `close-workspace`: layout de balance + formulario.
- `close-breakdown`: balance de control.
- `close-form`: declaracion final.
- `close-alert`: avisos.
- `close-difference-input`: diferencias con color.

### Administracion

- `admin-focus`: contenedor de pantalla admin.
- `admin-header`: descripcion, contadores y acciones. No debe repetir como titulo interno el nombre que ya muestra la barra superior.
- `required-note`: nota visual para formularios con campos obligatorios.
- `toolbar-row`: buscador + selector de columnas.
- `editor-card`: editor embebido.
- `embedded-panel`: panel interno.
- `accounts-period-bar`, `accounts-date-range`: selector de periodo y rango de fechas en cuentas corrientes.
- `movement-detail-modal`: detalle de movimiento de cuenta corriente.
- `salary-page`, `salary-period-bar`, `salary-summary-grid`: pantalla y resumen de liquidacion de salarios.
- `salary-table`, `salary-detail-table`, `salary-detail-modal`, `salary-detail-compact`: tabla por empleado, ventana de detalle y resumen compacto de salarios.
- `card-grid.five`: grilla usada cuando el resumen necesita cinco indicadores, por ejemplo total, base, adelantos, extras y bonos.
- `card-grid.six`: grilla usada cuando el resumen necesita seis indicadores, por ejemplo pendiente, total, base, adelantos, extras y bonos.
- `modal-backdrop`, `modal-card`: ventanas flotantes.
- `column-menu`, `column-chooser`: menu de columnas.

### Tablas

- `table-wrap`: wrapper con overflow.
- `data-table`: tabla base.
- `admin-data-table`: tabla administrativa compacta.
- `compact-table`: tabla chica.
- `status-active`, `status-inactive`, `status-closed`, `status-maintenance`, `status-disused`, `status-error`, `status-selected`: colores de fila.
- `money-positive`, `money-negative`: importes con color.
- `table-actions`: acciones alineadas.
- `sort-button`: encabezado sortable.
- Regla tecnica de tablas: toda columna/concepto visible debe tener ordenamiento cuando la tabla sea nueva o se modifique. Excepcion normal: columnas de acciones/comandos. Cualquier otra excepcion debe explicarse y aprobarse antes de implementar.

## Validacion

Antes de cerrar cambios:

1. Ejecutar `pnpm run build`.
2. Levantar servidor local.
3. Verificar `http://127.0.0.1:5173/`.
4. Probar el flujo afectado con rol correspondiente.
5. Actualizar `docs/POSEIDON_FUNCIONAMIENTO.md` si cambia una regla, calculo, pantalla o campo.
