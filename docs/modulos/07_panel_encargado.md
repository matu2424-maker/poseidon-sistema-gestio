# Modulo 07 - Panel del encargado

## Objetivo

Vista de revision operativa y control, separada del flujo visual del cajero.

## Estado actual

El layout lateral, cabecera y cambio de funcion viven en `src/features/layout/AppShell.tsx`.
El panel inicial por rol vive en `src/features/dashboard/RoleDashboard.tsx`.

El encargado entra directo a su panel y ve:

- diferencias del local activo;
- cuenta efectivo;
- cuenta banco;
- ingreso total del mes actual hasta hoy;
- salida total del mes actual hasta hoy;
- resultado neto economico del mes actual hasta hoy.

Con el dataset demo inicial, el panel del encargado muestra datos reales de prueba:

- cajas cerradas de julio 2026;
- una diferencia pendiente;
- saldos de cuentas de efectivo/banco;
- ingreso, salida y resultado neto mensual.

## Reglas

- No opera caja desde la barra lateral.
- Para operar caja usa Trabajar como cajero.
- Puede consultar `Resumen de cajas` como encargado porque es una vista de auditoria sin comandos operativos.
- Al cambiar a cajero conserva usuario real y registra funcion usada.
- Puede revisar diferencias, gastos, cuentas corrientes, cierres periodicos, personal, salarios, clientes, reportes y auditoria.
- En Diferencias, el encargado gestiona desde una pantalla de control con filtros y ventana flotante de detalle, no con formularios largos dentro de la tabla.
- Control de gastos vive en `src/features/manager/Expenses.tsx`.
- En Control de gastos la tabla permite ordenar por fecha, caja, local, categoria, subcategoria, descripcion, comprobante, monto, usuario, estado y revision.
- Revisar, observar o anular un gasto queda auditado; anular no borra el movimiento.
- Reportes vive en `src/features/reports/Reports.tsx` y comparte exportaciones desde `src/lib/export.ts`.
- Cierre periodico vive en `src/features/reports/Periodic.tsx`.
- En Cierre periodico, las tablas de cajas incluidas y cierres guardados son ordenables por columnas visibles.

## Calculos mensuales

- Ingreso total: resultado positivo de maquinas en cajas cerradas del mes.
- Salida total: gastos + salarios + regalos + resultado negativo de maquinas.
- Resultado neto: ingreso total - salida total.
- Transferencias, aportes y retiros se revisan aparte como movimientos financieros.

## Estructura visual actual

- `Control financiero`: una banda compacta con diferencias, cuenta efectivo y cuenta banco.
- `Resultado economico`: una banda compacta con ingreso total, salida total y resultado neto del mes.
- Debajo hay una unica fila de accesos rapidos a diferencias, cuentas corrientes, control de gastos, salarios y resumen de cajas.
- En `Cierres y reportes` aparecen `Resumen de cajas`, `Cierre periodico` y `Reportes`; no aparece apertura de caja.
- Las metricas no contienen botones para evitar duplicar destinos; los accesos rapidos no reemplazan al menu lateral.
- La pantalla de Diferencias prioriza pendientes por defecto y permite buscar/filtrar antes de abrir el detalle de cada recaudacion.

## Estetica

- Tarjetas estilo Datos de caja.
- No repetir datos de barra superior.
- Tipografia de interfaz Segoe UI/Aptos y tipografia monoespaciada solo para importes e identificadores.
- Metricas en superficies neutras separadas por lineas, sin colores laterales.
- Accesos rapidos con color lateral, alineados en una grilla compacta y con el mismo ancho y altura estable.
