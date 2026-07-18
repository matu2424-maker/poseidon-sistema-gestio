# Contexto Codex - Cajero

Leer junto con `docs/contextos/CODEX_NUCLEO_CAJA.md`, `docs/REGLAS_CONTABLES.md` y modulos 01, 02, 04 y 05.

## Propiedad

- UI de Caja: `src/features/cashier/`.
- Panel: `src/features/dashboard/CashierDashboard.tsx`.
- Rutas/permisos: `src/navigation/screens.ts`.
- Comandos compartidos: `src/application/cash/`, `src/application/movements/`, `src/application/treasury/` y `src/application/salaries/`.

El chat Cajero es propietario de su experiencia, no de los contratos contables compartidos. Central integra cambios de dominio.

## Flujo

- Sin caja abierta: Abrir caja, Clientes y Resumen de cajas.
- Con caja abierta: contadores, gastos, transferencias, regalos, salarios, Caja/Principal y cierre.
- Cada movimiento operativo usa el `balanceId` activo.
- Cajero opera `Caja / Efectivo` y `Caja / Banco`.
- `Caja y Principal` permite traspasos internos; no selecciona socio y no cambia resultado economico.
- Los aportes/retiros patrimoniales de socios no pertenecen al panel Cajero.
- Tras cerrar navega a `/recaudaciones`.

## Reglas

- No duplicar formulas en React; usar helpers y comandos compartidos.
- Contadores IN/OUT no retroceden.
- Gastos, regalos y salarios del Cajero salen de Caja/Efectivo.
- Transferencias mueven Caja/Efectivo a Caja/Banco.
- Una salida sin fondos se rechaza atomicamente.
- Efectivo esperado debe coincidir con Caja/Efectivo.
- Si el efectivo esperado es negativo, se cubre con fondos reales de Principal y un traspaso Principal -> Caja.
- El cierre puede traspasar Caja -> Principal y compara el remanente con lo declarado.
- No existe selector de persona ni custodia en traspasos de Caja.
- Todas las columnas visibles de datos ordenan; Acciones/Seleccion no.

## Prueba minima

1. Ingresar como `cajero1`.
2. Abrir caja.
3. Cargar las tres maquinas.
4. Registrar movimientos de Caja.
5. Mover fondos entre Caja y Principal.
6. Cerrar declarando efectivo/banco y traspaso final.
7. Verificar resumen, cuentas y auditoria.
