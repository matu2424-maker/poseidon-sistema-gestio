# Modulo 07 - Panel del encargado

Panel: `src/features/dashboard/ManagerDashboard.tsx`.

Resumen financiero: `src/lib/managerDashboardSummary.ts`.

Tabla de actividad: `src/features/dashboard/ManagerActivityTable.tsx`.

Layout y cambio de funcion: `src/features/layout/AppShell.tsx`.

## Objetivo

Dar al Encargado control financiero y operativo del local asignado sin mezclar su funcion administrativa con la operacion del Cajero.

## Informacion principal

- Una alerta superior concentra diferencias pendientes y cuentas monetarias negativas.
- `Control financiero` muestra diferencias y liquidez por medio en tres celdas accionables.
- Efectivo y Banco desglosan los saldos de Caja y Principal sin mezclarlos.
- `Resultado economico` muestra ingreso, salida y resultado neto del mes actual hasta hoy.
- El desglose economico separa maquinas, gastos, salarios y regalos.
- El contexto de recaudacion identifica la caja abierta, fecha y usuario de apertura; sin caja aclara que la operacion administrativa usa Principal.
- `Actividad financiera reciente` muestra los ultimos cinco movimientos monetarios del local.

## Calculo y trazabilidad

- `managerDashboardSummary` reutiliza los totales, cuentas y diferencias canonicos; el componente no replica formulas contables.
- Los ingresos economicos son el resultado positivo de maquinas.
- Las salidas economicas son resultado negativo de maquinas, gastos, salarios y regalos.
- El resultado neto conserva la regla `maquinas - gastos - salarios - regalos`.
- La liquidez es informativa: suma Caja y Principal por cada medio, sin crear movimientos.
- La actividad reciente solo lee movimientos activos de cuentas monetarias vinculadas al local.
- Cada fila conserva fecha, accion, cuenta, monto con signo, usuario y detalle; incluye la recaudacion cuando existe `balanceId`.
- Todas las columnas visibles de la actividad son ordenables.

## Funciones administrativas

- Gestionar diferencias.
- Consultar recaudaciones.
- Registrar, revisar y anular gastos desde Principal.
- Registrar liquidaciones desde Principal.
- Mover fondos Caja <-> Principal.
- Registrar aportes/retiros reales de socios.
- Consultar cuentas corrientes.
- Cerrar periodos y revisar reportes.
- Gestionar personal, salarios y clientes.
- Consultar auditoria del local asignado.

El panel ofrece una sola entrada visible por destino frecuente. Diferencias, Cuentas corrientes y Resumen de cajas se abren desde su contexto; los accesos rapidos quedan reservados para Gastos, Salarios, Clientes, Personal, Reportes y Auditoria.

## Separacion con Cajero

- Encargado no carga contadores, transferencias de Caja, regalos ni cierre desde su funcion administrativa.
- Para operar la recaudacion usa `Trabajar como cajero`.
- La identidad real sigue siendo Encargado y la auditoria registra funcion `CAJERO`.
- Gastos y salarios desde funcion Encargado se pagan desde Principal y no necesitan caja abierta.
- Caja solo cambia si se registra un traspaso explicito Principal -> Caja o Caja -> Principal.

## Cuentas corrientes

Es la pantalla central de tesoreria:

- consulta Caja, Principal y socios;
- registra traspasos internos;
- registra aportes/retiros patrimoniales;
- permite rastrear cada asiento y su recaudacion cuando existe `balanceId`.

## Control de gastos

- La tabla contiene gastos de Caja y Principal.
- La columna Cuenta distingue el origen financiero.
- Agregar gasto siempre usa Principal/Efectivo o Principal/Banco.
- Revisar u observar no modifica cuentas ni resultado economico.
- Anular conserva el gasto, crea el reverso append-only y audita usuario real, funcion, local, fecha y motivo.
- Las validaciones se ejecutan dentro del comando sobre el snapshot vigente, no sobre datos capturados por la pantalla.
- Revisar, observar o anular conserva historial y auditoria.
- Todas las columnas de datos son ordenables.

## Cierre periodico

- Consolida cajas cerradas y movimientos administrativos de Principal.
- Incluye gastos y liquidaciones sin `balanceId` dentro del periodo/local.
- Cada cierre periodico guarda una foto de un unico local mediante un comando atomico; una anulacion posterior no recalcula la foto.
- Separa resultado economico, traspasos Caja/Principal y movimientos de socios.
- La foto periodica no borra ni reinicia operaciones.

## Estetica

- No repetir el titulo de la barra superior.
- Metricas compactas con tipografia moderada.
- Diferenciar celdas accionables de indicadores economicos pasivos.
- Accesos rapidos alineados, unicos y de tamano estable.
- Tablas densas; todas las columnas visibles de datos ordenan.
- En movil, las superficies se apilan y la tabla conserva su propio desplazamiento horizontal sin desbordar la pagina.
