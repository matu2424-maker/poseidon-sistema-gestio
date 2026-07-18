# Modulo 01 - Panel del cajero

## Objetivo

Centralizar la operativa diaria del cajero sin barra lateral.

## Estado actual

- El layout visual del cajero vive en `src/features/layout/AppShell.tsx`.
- El panel operativo real del cajero vive en `CashierWorkspace` dentro de `src/features/layout/AppShell.tsx`.
- `src/features/dashboard/CashierDashboard.tsx` queda como compatibilidad legacy; `RoleDashboard.tsx` solo decide la funcion efectiva.
- El cajero entra a un panel propio.
- Si no hay caja abierta, solo puede usar Clientes, Resumen cajas y Abrir caja.
- Si hay caja abierta, ve resumen superior y accesos directos.
- Las funciones se abren dentro del panel, salvo el cierre que usa ventana/modal.

## Datos visibles con caja abierta

- Fecha operativa.
- Caja: ID ABIERTA.
- Efectivo inicial.
- Banco inicial.
- Resultado de maquinas.
- Salida total.
- Efectivo en caja.
- Dinero en banco.
- Transferencias.
- Aportes efectivo.
- Retiros.
- Gastos.
- Salarios.
- Regalos.

## Reglas visuales

- Todo centrado y claro.
- La cabecera, metricas, ayudas y acciones usan la escala tipografica liviana global; solo los importes prioritarios usan semibold.
- Sin caja abierta, el panel se mantiene compacto y alineado arriba; no estira sus bloques para completar el alto de pantalla.
- Botones inferiores del mismo tamano.
- Botones alineados.
- `Salida total`, `Efectivo en caja` y `Dinero en banco` son lectura, no botones.
- Los demas recuadros abren su modulo correspondiente.
- Al entrar a un modulo se oculta el resumen superior para dar foco.
- En movil, `Resumen de cajas` conserva el scroll horizontal dentro de la tabla; la pagina no debe generar overflow global.

## Accesos

- Resultado de maquinas -> Contadores.
- Transferencias -> Transferencias.
- Aportes efectivo / Retiros -> Retiros y aportes.
- Gastos -> Gastos.
- Salarios -> Pago de salarios con `SALARIO` o `ADELANTO`, monto y periodo trabajado. El pago queda asociado a la caja por `balanceId`, pero se imputa al periodo trabajado seleccionado.
- Regalos -> Regalos.
- Clientes -> Clientes.
- Resumen cajas -> Resumen de cajas.
- Cerrar caja -> Cierre de caja.

## Comportamientos operativos vigentes

- Los formularios que generan una salida desde Caja muestran `Caja / Efectivo actual`.
- Si un gasto, regalo, salario, transferencia o traspaso rechaza la operacion, el formulario conserva sus datos.
- Gastos, regalos y salarios anulados siguen visibles con estado `ANULADO`; la accion de anular desaparece en ese registro.
- Si hay maquinas pendientes, `Cerrar caja` queda deshabilitado y la misma pantalla explica el prerrequisito.
