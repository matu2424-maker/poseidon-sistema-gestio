# Contexto Codex - Encargado

Leer junto con `docs/REGLAS_CONTABLES.md`, `docs/modulos/07_panel_encargado.md`, modulos 04/06/10/11/12 y los contextos de diferencias, cuentas y salarios.

## Propiedad

- Panel: `src/features/dashboard/ManagerDashboard.tsx`.
- Resumen puro: `src/lib/managerDashboardSummary.ts`.
- Actividad reciente: `src/features/dashboard/ManagerActivityTable.tsx`.
- Layout/menu: `src/features/layout/AppShell.tsx`.
- Gastos: `src/features/manager/Expenses.tsx`.
- Cuentas/Tesoreria: `src/features/accounts/CurrentAccounts.tsx`.
- Cierre periodico: `src/features/reports/Periodic.tsx`.

## Alcance

- Ve solamente locales asignados; demo: Poseidon.
- Revisa diferencias, recaudaciones, cuentas, auditoria, reportes y cierres.
- Registra gastos y salarios desde Principal/Efectivo o Principal/Banco.
- Mueve fondos Caja <-> Principal.
- Registra aportes y retiros patrimoniales de Mathias/Ricardo.
- Para operar contadores, movimientos de Caja o cierre cambia expresamente a funcion Cajero.
- Auditoria siempre conserva rol real Encargado y funcion utilizada.

## Reglas financieras

- Un gasto administrativo no usa caja abierta ni `balanceId`.
- Un salario administrativo no usa caja abierta ni `balanceId`.
- Caja solo cambia mediante operaciones de Cajero, diferencias o traspasos explicitos.
- Principal no puede quedar negativo por una nueva salida.
- Un traspaso interno no cambia resultado economico.
- Un aporte/retiro de socio no cambia resultado economico y no es custodia.
- Las diferencias se verifican, corrigen o anulan con observacion y asientos append-only.
- Cierres periodicos incluyen cajas cerradas y movimientos de Principal del rango.

## Interfaz

- No repetir titulos de la barra superior.
- Mostrar alerta, Caja, Principal y liquidez por medio sin ocultar saldos negativos.
- Separar control financiero accionable de resultado economico mensual pasivo.
- Mostrar una sola entrada por destino: evitar accesos duplicados.
- Identificar la recaudacion activa y su apertura sin convertirla en operacion de Cajero.
- Mostrar los cinco movimientos monetarios mas recientes del local.
- Todas las columnas visibles de datos ordenan.
- Los errores se muestran dentro del modal/pantalla donde ocurren.

## Prueba minima

1. Entrar como `encargado`.
2. Ver alerta, Caja, Principal y resultado mensual del local.
3. Abrir Diferencias, Cuentas y Resumen desde sus celdas contextuales.
4. Ordenar cada columna de Actividad financiera reciente.
5. Registrar un gasto desde Principal y comprobar que Caja no cambia.
6. Registrar una liquidacion desde Principal.
7. Hacer un traspaso Caja/Principal.
8. Registrar aporte y retiro real de socio.
9. Revisar cuentas, auditoria y cierre periodico.
10. Cambiar a Cajero y comprobar que la identidad real se conserva.
