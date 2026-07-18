# Modulo 07 - Panel del encargado

Panel: `src/features/dashboard/ManagerDashboard.tsx`.

Layout y cambio de funcion: `src/features/layout/AppShell.tsx`.

## Objetivo

Dar al Encargado control financiero y operativo del local asignado sin mezclar su funcion administrativa con la operacion del Cajero.

## Informacion principal

- Diferencias pendientes.
- Saldos de `Caja / Efectivo` y `Caja / Banco`.
- Saldos de `Principal / Efectivo` y `Principal / Banco`.
- Liquidez total por medio.
- Ingreso, salida y resultado economico del mes actual hasta hoy.

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
- Revisar, observar o anular conserva historial y auditoria.
- Todas las columnas de datos son ordenables.

## Cierre periodico

- Consolida cajas cerradas y movimientos administrativos de Principal.
- Incluye gastos y liquidaciones sin `balanceId` dentro del periodo/local.
- Separa resultado economico, traspasos Caja/Principal y movimientos de socios.
- La foto periodica no borra ni reinicia operaciones.

## Estetica

- No repetir el titulo de la barra superior.
- Metricas compactas con tipografia moderada.
- Accesos rapidos alineados y de tamaño estable.
- Tablas densas; todas las columnas visibles de datos ordenan.
