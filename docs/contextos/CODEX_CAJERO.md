# Contexto Codex - Operacion del cajero

Ultima actualizacion: 2026-07-17

Leer este contexto antes de modificar el panel, las pantallas o el flujo diario del cajero. Agregar `CODEX_NUCLEO_CAJA` cuando cambien comandos, calculos, saldos o auditoria.

## Propiedad principal

- `src/features/cashier/`
- `src/features/dashboard/CashierDashboard.tsx`
- `docs/modulos/01_panel_cajero.md`
- Pruebas E2E del flujo de cajero que el chat central asigne de forma exclusiva.

`src/features/layout/AppShell.tsx`, estilos globales, rutas y contratos compartidos quedan reservados al chat central salvo asignacion explicita.

## Experiencia operativa

- El cajero trabaja sin barra lateral.
- Si no hay caja abierta, solo puede abrir caja, consultar clientes y revisar cajas cerradas.
- Con caja abierta puede cargar contadores, gastos, transferencias, regalos, salarios, aportes y retiros, y cerrar la recaudacion.
- Despues del cierre navega al resumen de cajas.
- Antes de confirmar el cierre ve las intervenciones del Encargado asociadas a esa recaudacion, incluidos anulados con impacto vigente cero.
- Formularios, avisos, tablas, accesibilidad y navegacion pertenecen a este contexto.
- Las tablas operativas ordenan todas sus columnas visibles de datos; acciones y seleccion son las excepciones.

## Dependencias obligatorias

- Apertura, guardado de lecturas, movimientos y cierre consumen comandos de `src/application/`.
- Totales, cuentas y diferencias se leen desde helpers compartidos; no se duplican formulas en React.
- Salarios se imputan al periodo trabajado y a la caja por `balanceId`.
- Maquinas y locales se consultan, pero sus reglas administrativas pertenecen a su dominio.
- Toda accion sensible conserva usuario real, rol real y funcion usada.

## Limites del chat Cajero

- No modifica por iniciativa propia `src/types.ts`, `src/data/`, `src/infrastructure/`, `src/application/`, `src/navigation/` ni helpers contables.
- Cuando una necesidad cruza esos limites, entrega una solicitud al chat central con regla, contrato requerido, archivos candidatos y pruebas afectadas.
- No cambia permisos de Encargado o Administrador.

## Referencias

- `docs/contextos/CODEX_NUCLEO_CAJA.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/01_panel_cajero.md`
- `docs/modulos/02_caja_diaria.md`
- `docs/modulos/03_contadores.md`
- `docs/modulos/04_movimientos_operativos.md`
- `docs/modulos/05_cierre_caja.md`

## Prueba minima

1. Entrar como `cajero1`.
2. Verificar estado sin caja y abrir una recaudacion.
3. Cargar contadores y movimientos permitidos.
4. Verificar el detalle ordenable de movimientos del Encargado y cerrar declarando efectivo y banco.
5. Revisar resumen, cuentas y diferencias generadas.
