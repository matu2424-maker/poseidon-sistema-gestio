# Contexto Codex - Locales, maquinas y taller

Ultima actualizacion: 2026-07-16

Leer este contexto antes de modificar Locales, Maquinas, Taller, maquinas en desuso, historial de maquinas o asociaciones entre local y maquina. Referencias asociadas:

- `docs/REGLAS_VISUALES.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/modulos/09_locales_maquinas_taller.md`
- `docs/modulos/03_contadores.md`
- `docs/modulos/05_cierre_caja.md`
- `docs/contextos/CODEX_NUCLEO_CAJA.md`
- `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`

## Codigo actual

- `AdminLocals`, `AdminMachines`, `AdminLocalEditor`, `AdminMachineEditor`, `WorkshopMachinePicker`, `LocalMachinesModal`, `MachineHistoryModal` y `LocalHistoryModal` viven en `src/features/admin/LocationsMachines.tsx`.
- `src/App.tsx` importa `AdminLocals` y `AdminMachines` desde ese modulo y conserva la composicion de pantallas.
- Contadores usan `calcReading` desde `src/lib/cashTotals.ts`.
- Reset y ajustes de contadores deben quedar auditados.

## Reglas criticas

- Toda maquina se crea inicialmente en Taller.
- Maquina en `DESUSO` solo se ve en apartado Desuso del Taller y no en listado general de Maquinas.
- Para eliminar una maquina primero debe estar en Taller.
- No se puede eliminar una maquina con recaudaciones.
- Si un local pasa a `CERRADO`, sus maquinas vuelven al Taller con aviso previo.
- No se cierra un local ni se trasladan/asignan maquinas mientras ese local tenga caja abierta.
- Locales deben conservar historial de maquinas con fecha.
- IN/OUT actual no puede ser menor al anterior.
- Tablas de locales y maquinas tienen columnas fijas y columnas opcionales guardadas.

## Asociaciones

- Maquinas activas por local alimentan contadores de caja.
- Cambios de local/estado impactan historial y auditoria.
- Reset de contadores requiere revisar si hay caja abierta.
- El ajuste administrativo de IN/OUT usa el mismo bloqueo de caja abierta que el reset.
- Contadores impactan resultado de maquinas y cuentas corrientes del local.

## Pruebas manuales

1. Entrar como `admin`.
2. Abrir Locales y ordenar columnas visibles.
3. Agregar/editar local y asociar maquinas desde Taller.
4. Abrir el numero de maquinas del local y enviar una maquina al Taller.
5. Abrir Maquinas, editar maquina y revisar historial.
6. Probar que maquina en Desuso no aparezca en listado general.
