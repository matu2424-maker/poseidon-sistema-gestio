# DEC-2026-007 - Backend transaccional por comandos

Fecha: 2026-07-26

Estado: APROBADA

## Contexto

Poseidon conserva hoy un snapshot local completo mediante `AppDataRepository`.
Ese contrato es adecuado para una sola fuente local, pero no debe trasladarse a
un servidor como una unica fila mutable: dos usuarios concurrentes podrian
sobrescribir movimientos, saldos, auditoria o cierres.

## Decision

La evolucion online usara PostgreSQL/Supabase con estas fronteras:

- tablas relacionales normalizadas y claves tecnicas UUID;
- IDs visibles preservados como campos unicos de negocio;
- consultas autorizadas por RLS, rol real y locales asignados;
- mutaciones criticas mediante una funcion RPC especifica por comando;
- cada comando se ejecuta en una unica transaccion;
- la identidad real se deriva de `auth.uid()` en el servidor;
- la funcion activa solicitada se valida contra el rol real;
- cada mutacion exige una clave de idempotencia;
- auditoria, entidad y asientos contables se confirman o revierten juntos;
- las tablas financieras y de auditoria no admiten escritura directa desde el
  frontend;
- el frontend nunca recibe `service_role`, credenciales de base ni secretos.
- Cajero no consulta tablas completas de personal ni cuentas personales;
- Cajero consulta gastos y comprobantes solamente cuando pertenecen a Caja;
- un alcance multilocal exige acceso a todos los locales, no a uno solo;
- las operaciones e historiales no se borran: cambian estado o reciben un
  reverso.

No se implementara:

- una RPC generica que reciba o reemplace `AppData`;
- dual-write prolongado entre `localStorage` y Supabase;
- calculos financieros nuevos en el adaptador de red;
- identidad de usuario enviada como dato confiable por el cliente.

## Activacion

El modo `local` sigue siendo el valor predeterminado. El modo remoto solamente
puede activarse cuando existan, en un ambiente de prueba:

1. migraciones aplicadas y verificadas desde una base vacia;
2. Auth configurado;
3. perfiles y asignaciones de locales;
4. RLS y permisos negativos probados por los tres roles;
5. RPC del flujo que se habilita;
6. exportacion, importacion y conciliacion con datos demo;
7. rollback ensayado.

Hasta entonces, el gateway y el esquema remoto son preparacion versionada, no
una conexion operativa.

El registro de capacidad usa estado `VALIDATING`. Tener migraciones parseables
o tipos de transporte no equivale a disponer de un backend funcional.

## Consecuencias

- Las reglas puras actuales siguen siendo la referencia para caracterizar cada
  comando, pero el servidor pasa a ser la autoridad de escritura online.
- `AppDataRepository` conserva el modo local y el respaldo; no representa la
  unidad transaccional remota.
- Los comandos se migran de forma incremental y cada flujo debe tener pruebas
  de concurrencia, idempotencia, permisos y conciliacion antes de activarse.
- Un fallo parcial no puede dejar entidades, saldos o auditoria desalineados.
