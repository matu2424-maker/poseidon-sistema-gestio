# Revision contable del backend preparatorio

- ID: `2026-07-26-BACKEND-CONTABLE-01`
- Fecha: 2026-07-26
- Perfil: `poseidon_accounting_reviewer`
- Permiso: solo lectura
- Estado revisado: esquema y pruebas bajo `supabase/**`

## Clasificacion inicial

`NO_APTO_PARA_ACTIVAR`

El esquema tenia tres bloqueantes antes de poder considerarse una base
versionable: exposicion de datos sensibles al Cajero, fuga de alcance
multilocal y correspondencia incompleta con `AppData`.

## Resolucion adoptada

1. `staff` queda visible solo para Encargado/Administrador con acceso al local.
2. Cajero ve gastos asociados a Caja, no gastos de Principal.
3. Cajero ve cuentas de Caja, no cuentas personales ni Principal.
4. Adjuntos de gastos de Principal quedan fuera del alcance del Cajero.
5. Auditoria multilocal exige acceso a todos los locales del evento.
6. Snapshot salarial exige que `(closure_id, local_id)` exista en
   `salary_closure_locals`.
7. Historial salarial conserva nombre historico del actor.
8. La cuenta pagadora salarial historica puede conservarse sin inventar; las
   operaciones nuevas deberan exigirla.
9. Se incorporo matriz ejecutable y documental para las 22 colecciones,
   incluyendo IDs, cargos y aliases historicos.
10. Entidades operativas principales rechazan `DELETE`; la correccion futura
    debe usar estado o reverso.

## Riesgos que siguen bloqueando activacion

- Las RPC de negocio especificas aun no existen.
- `assert_available_funds` todavia no forma parte de una RPC real.
- Faltan pruebas de dos piernas atomicas, sobregiro y reverso exacto.
- Faltan invariantes completas de estados de caja, diferencias, salarios y
  cierres periodicos en servidor.
- Faltan pruebas concurrentes de idempotencia.
- Faltan importacion y conciliacion campo a campo contra PostgreSQL real.
- Docker/PostgreSQL no estuvieron disponibles en esta revision; pgTAP no fue
  ejecutado.

## Criterio de Central

El esquema puede versionarse solamente como `VALIDATING` e inactivo. No debe
presentarse como backend terminado ni seleccionarse mediante
`VITE_POSEIDON_BACKEND=supabase` hasta cerrar todos los riesgos anteriores.
