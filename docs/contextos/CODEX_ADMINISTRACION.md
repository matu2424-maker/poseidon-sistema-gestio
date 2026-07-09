# Contexto Codex - Administracion

Ultima actualizacion: 2026-07-09

Leer este contexto antes de modificar panel administrador, menus administrativos, usuarios, configuraciones, categorias, papelera o funciones de control global. Referencias asociadas:

- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/modulos/08_panel_administrador.md`
- `docs/modulos/09_locales_maquinas_taller.md`
- `docs/modulos/10_clientes_personal_sueldos.md`
- `docs/modulos/12_auditoria.md`
- `docs/contextos/CODEX_LOCALES_MAQUINAS.md`
- `docs/contextos/CODEX_CLIENTES_PERSONAL.md`
- `docs/contextos/CODEX_AUDITORIA.md`

## Codigo actual

- Panel, menu y parte de las pantallas administrativas siguen en `src/App.tsx`.
- Usuarios y categorias/subcategorias de gastos viven en `src/features/admin/Settings.tsx`.
- Locales, maquinas y taller viven en `src/features/admin/LocationsMachines.tsx`.
- Clientes administrativos viven en `src/features/admin/Clients.tsx`.
- Personal y papelera viven en `src/features/admin/Staff.tsx`.
- Tipos principales estan en `src/types.ts`.
- Reglas monetarias y fechas compartidas estan en `src/lib/money.ts` y `src/lib/dates.ts`.
- Reglas contables reutilizables estan en `src/lib/currentAccounts.ts`, `src/lib/accountMovements.ts`, `src/lib/cashTotals.ts`, `src/lib/differences.ts` y `src/lib/salaryRules.ts`.
- Tablas configurables deben reutilizar `ColumnChooser` y `TableColumn` desde `src/components/ui.tsx`.

## Reglas criticas

- Administrador puede ver y gestionar todo, pero para operar caja debe cambiar a funcion Cajero.
- No borrar historial operativo: usar baja, papelera, anulacion o ajuste auditado.
- Cambios sensibles deben guardar fecha/hora, usuario, rol real y funcion usada.
- No conectar Supabase, Vercel ni servicios externos sin pedido explicito.
- Tablas administrativas deben ser compactas, ordenables y preparadas para 1080p.

## Asociaciones

- Locales y maquinas impactan caja, contadores, cuentas y cierre.
- Usuarios impactan auditoria y trazabilidad.
- Categorias de gastos impactan carga desde cajero y control de encargado.
- Personal impacta salarios, cuentas personales y caja.
- Clientes impactan regalos y transferencias.

## Pruebas manuales

1. Entrar como `admin`.
2. Revisar menu lateral agrupado.
3. Abrir Locales, Maquinas, Taller, Usuarios, Personal, Clientes y Categorias.
4. Verificar que las tablas ordenen por columnas visibles.
5. Hacer una edicion de prueba y confirmar reconfirmacion/auditoria.
