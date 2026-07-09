# Modulo 07 - Panel del encargado

## Objetivo

Vista de revision operativa y control, separada del flujo visual del cajero.

## Estado actual

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
- Al cambiar a cajero conserva usuario real y registra funcion usada.
- Puede revisar diferencias, gastos, cuentas corrientes, cierres periodicos, personal, salarios, clientes, reportes y auditoria.
- En Diferencias, el encargado gestiona desde una pantalla de control con filtros y ventana flotante de detalle, no con formularios largos dentro de la tabla.

## Calculos mensuales

- Ingreso total: resultado positivo de maquinas en cajas cerradas del mes.
- Salida total: gastos + salarios + regalos + resultado negativo de maquinas.
- Resultado neto: ingreso total - salida total.
- Transferencias, aportes y retiros se revisan aparte como movimientos financieros.

## Estructura visual actual

- Primera fila: diferencias, cuenta efectivo y cuenta banco.
- Segunda fila: ingreso total del mes, salida total del mes y resultado neto del mes.
- Debajo hay accesos rapidos a diferencias, cuentas corrientes, control de gastos, salarios y resumen de cajas.
- Los accesos rapidos no reemplazan al menu lateral; sirven para entrar rapido a las revisiones mas frecuentes del encargado.
- La pantalla de Diferencias prioriza pendientes por defecto y permite buscar/filtrar antes de abrir el detalle de cada recaudacion.

## Estetica

- Tarjetas estilo Datos de caja.
- No repetir datos de barra superior.
- Botones alineados abajo a la derecha.
- Accesos rapidos alineados en una grilla compacta, con mismo ancho y altura estable.
