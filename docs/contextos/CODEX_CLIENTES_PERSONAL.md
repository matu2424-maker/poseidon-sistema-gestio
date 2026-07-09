# Contexto Codex - Clientes y personal

Ultima actualizacion: 2026-07-09

Leer este contexto antes de modificar clientes, personal, papelera, documentos, fotos, datos laborales o relaciones con regalos, transferencias y salarios. Referencias asociadas:

- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/modulos/10_clientes_personal_sueldos.md`
- `docs/contextos/CODEX_SALARIOS.md`
- `docs/contextos/CODEX_CAJA.md`
- `docs/contextos/CODEX_AUDITORIA.md`

## Codigo actual

- `AdminClients` y `ClientEditor` viven en `src/features/admin/Clients.tsx`.
- `CashierClients`, `AdminStaff`, `StaffEditor` y `AdminTrash` siguen en `src/App.tsx`.
- Reglas de documento de clientes viven en `src/lib/clients.ts`.
- Metadatos de archivos viven en `src/lib/files.ts`.
- Reglas de salario y periodos trabajados estan en `src/lib/salaryRules.ts`.
- Pagos de salario y cuenta personal usan `src/lib/accountMovements.ts`.

## Reglas criticas

- Clientes se identifican por documento: Cedula o Pasaporte.
- Cliente puede tener foto y datos de contacto.
- Cajero puede agregar, editar y enviar clientes a papelera.
- Personal tiene datos personales, cargo, local, tipo de salario, salario base y estado.
- Cargos permitidos: `Cajera/o`, `Encargado/a`, `Mantenimiento`, `Limpieza`.
- Personal y clientes pasan por papelera antes de eliminar definitivamente.
- Cambios salariales guardan historial con fecha efectiva y no deben modificar periodos cerrados.

## Asociaciones

- Clientes se usan en regalos y transferencias.
- Personal se usa en pagos desde cajero y liquidacion de salarios.
- Cuenta corriente personal vive dentro del detalle de liquidacion de salarios.
- Todo cambio debe quedar auditado.

## Pruebas manuales

1. Entrar como `admin` o `encargado` segun corresponda.
2. Crear cliente con documento y foto/metadato.
3. Usar cliente en regalo o transferencia.
4. Crear personal con campos obligatorios.
5. Modificar salario base y revisar historial.
6. Enviar cliente/personal a papelera y verificar auditoria.
