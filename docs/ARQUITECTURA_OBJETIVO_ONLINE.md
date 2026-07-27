# Poseidon - Arquitectura objetivo online

Ultima actualizacion: 2026-07-26

Estado: implementacion preparatoria local. El esquema, configuracion y gateway
se versionan sin activar todavia un backend remoto.

Base local ya implementada: `AppDataRepository` asincrono, codec de respaldo,
adaptador `localStorage` y cola de escrituras ordenadas. La frontera remota se
implementa mediante `PoseidonCommandGateway`; no existe conexion operativa.

Decision vigente: la evolucion es directa desde el modo `localStorage` hacia
PostgreSQL/Supabase mediante comandos transaccionales especificos. No se
persiste `AppData` completo como una fila remota. La fuente completa es
`DEC-2026-007`.

Preparacion de entrega ya implementada localmente: runtime y package manager fijados, build reproducible, CI versionado, preflight, changelog y flujo `main -> release/test`. Esto no activa hosting ni modifica la persistencia.

## Objetivo

Preparar una evolucion desde la aplicacion local actual hacia un sistema online multiusuario, multi-local, auditable y recuperable, sin reescribir las reglas de negocio ni las pantallas de una sola vez.

## Limites

- El sistema sigue usando `localStorage` por defecto hasta que el ambiente
  remoto completo apruebe sus criterios de activacion.
- No guardar credenciales, URLs privadas ni claves en documentacion o codigo versionado.
- No activar Supabase, Auth, Storage o Vercel solo por tener el esquema o el
  gateway preparados.
- No agregar una base local intermedia: `AppDataRepository` es la frontera de reemplazo y evita acoplar la aplicacion al proveedor futuro.
- La migracion debe preservar IDs visibles, relaciones, saldos, estados e historial.

## Implementacion preparatoria disponible

- `supabase/migrations/`: nueve migraciones atomicas para tipos, identidad,
  maestros, caja/libro, salarios/cierres, adjuntos, auditoria, idempotencia y
  RLS; la version remota negociada es `3`.
- `supabase/tests/database/`: pgTAP de estructura, restricciones, append-only,
  permisos por rol/local, comandos financieros y contexto de sesion.
- `src/application/ports/PoseidonCommandGateway.ts`: frontera de mutaciones
  remotas tipadas.
- `src/infrastructure/remote/`: seleccion explicita de backend, transporte RPC
  autenticado, contexto de sesion, plan determinista y ejecutor reanudable de
  migracion/conciliacion. El gateway que inserta lotes aun no esta implementado.
- `docs/MATRIZ_MIGRACION_APPDATA_POSTGRESQL.md`: correspondencia de las 22
  colecciones y reglas de conciliacion.
- `.github/workflows/quality.yml`: base PostgreSQL descartable y pgTAP como
  puerta del candidato `release/test`.

Esta implementacion se registra como `VALIDATING`: contiene 11 de las 31 RPC
enumeradas por el gateway, pero no habilita el modo remoto en React.

## Arquitectura propuesta

```text
React / Vite
  -> capa de presentacion
  -> comandos y consultas de aplicacion
  -> reglas de dominio puras
  -> modo local: AppDataRepository -> localStorage
  -> modo remoto: PoseidonCommandGateway -> RPC especifica

Supabase futuro
  -> Auth
  -> PostgreSQL
  -> Row Level Security
  -> Storage privado
  -> funciones/transacciones para operaciones atomicas
```

## Capas

### Presentacion

- Componentes React, formularios, tablas, modales y navegacion.
- No calcula saldos ni modifica varias colecciones directamente.
- Traduce errores de dominio a mensajes visibles.

### Aplicacion

Comandos sugeridos:

- `openCash` y `closeCash`.
- `recordExpense`, `recordTransfer`, `recordGift`.
- `recordSalaryPayment` y `closeSalaryPeriod`.
- `manageDifference`.
- `assignMachine`, `sendMachineToWorkshop`, `resetCounters`.
- `createLocal`, `updateLocal`, `closeLocal`.

Cada comando recibe actor, local, fecha/ID y datos de entrada; devuelve resultado o error tipado. Los efectos contables y de auditoria deben formar parte de la misma operacion.

### Dominio

- Entidades, estados permitidos, validaciones e invariantes.
- Calculos de caja, cuentas, diferencias y salarios.
- Sin dependencias de React, navegador, Supabase o `localStorage`.

### Infraestructura

- Persistencia local durante desarrollo.
- Repositorios Supabase cuando se apruebe la migracion.
- Subida/lectura de archivos.
- Exportacion, respaldo y restauracion.

## Fronteras de persistencia

`AppDataRepository` conserva snapshot, respaldo e importacion del modo local.
No se implementara un adaptador remoto que lea y reemplace el snapshot completo.

`PoseidonCommandGateway` define las mutaciones remotas. Cada nombre de comando
se traduce a una RPC dedicada, exige idempotencia y obtiene la identidad real
del token de sesion. La UI no envia un `userId` confiable.

Interfaces iniciales sugeridas:

- `UserRepository`
- `LocalRepository`
- `MachineRepository`
- `CashRepository`
- `MovementRepository`
- `SalaryRepository`
- `ClientRepository`
- `CurrentAccountRepository`
- `AuditRepository`
- `AttachmentRepository`

No es obligatorio crear una interfaz por tabla. Las consultas pueden agruparse
por dominio, pero las mutaciones deben conservar transacciones consistentes.

## Identidad y permisos

- Supabase Auth identifica al usuario real.
- El perfil interno define rol y locales asignados.
- La funcion usada (`ENCARGADO` trabajando como `CAJERO`) se registra aparte del rol real.
- RLS valida permisos en base de datos; ocultar botones no cuenta como seguridad.
- La funcion activa enviada por el frontend es una solicitud; el servidor
  verifica que el rol real pueda ejercerla.
- Ninguna RPC confia en actor, rol o locales derivados solo del payload.
- `CAJERO`: opera cajas y entidades permitidas de locales asignados.
- `ENCARGADO`: consulta y controla locales asignados; puede operar como cajero.
- `ADMINISTRADOR`: administra el sistema completo; puede operar como cajero.
- Cajero no recibe filas completas de personal, cuentas personales, gastos de
  Principal ni sus comprobantes.
- Un evento o cierre con varios locales es visible solamente cuando el usuario
  tiene acceso a todos ellos.

## Persistencia y transacciones

Las siguientes operaciones deben ser atomicas:

- abrir caja con aporte inicial y lecturas;
- cerrar caja con retiros, contadores, saldos y diferencias;
- corregir/anular diferencias y sincronizar cuentas;
- registrar/anular gasto, regalo, transferencia o salario;
- mover maquinas y registrar historial;
- cerrar local y enviar maquinas al taller;
- resetear contadores con auditoria.

Si una parte falla, ninguna parte de la operacion debe quedar aplicada.

Cada mutacion guarda una clave de idempotencia unica por usuario y comando. Un
reintento devuelve el resultado previo o un rechazo consistente; no duplica
asientos, entidades ni auditoria.

## Auditoria

- Tabla append-only.
- Registra fecha/hora del servidor, usuario real, rol real, funcion usada, accion, entidad, ID, antes, despues y motivo.
- No se elimina por tareas de mantenimiento normales.
- Las anulaciones generan eventos nuevos; no reescriben eventos anteriores.
- La base debe impedir que cajero/encargado borren auditoria.

## Archivos

- Buckets privados para comprobantes, fotos de locales/clientes y documentos.
- La base guarda metadata, ruta, MIME, tamano, entidad, usuario y fecha.
- Acceso mediante politicas o URLs firmadas de corta duracion.
- Ruta sugerida: `local/{localId}/{entidad}/{entidadId}/{uuid}`.
- Validar tipos y limites de tamano antes de subir.

## Modelo multi-local

- Toda entidad operativa debe poder derivar su `localId`.
- Asignacion usuario-local usa relacion muchos-a-muchos.
- Los IDs visibles pueden ser secuencias por local, pero la clave primaria futura debe ser UUID.
- Taller puede modelarse como ubicacion especial sin mezclarlo con un local operativo.

## Manejo de fechas

- Timestamps guardados en UTC.
- Fecha operativa guardada como `date`, independiente del timestamp.
- Interfaz presentada en `America/Montevideo`.
- Los cierres y periodos salariales no deben depender de convertir medianoche local con UTC de forma implicita.

## Seguridad y configuracion

- Variables publicas del frontend solo contienen URL y clave publicable.
- Claves de servicio viven exclusivamente en backend/entorno seguro.
- RLS activa antes de importar datos reales.
- Ambientes separados: local, prueba y produccion.
- Backups y restauracion probados antes del corte final.
- Version de frontend, etiqueta Git, migracion de esquema y compatibilidad de datos deben poder rastrearse de forma independiente.
- Las credenciales historicas retiradas del checkout deben revocarse o rotarse
  en su proveedor antes de reutilizar un proyecto remoto.

## Observabilidad

- Errores tecnicos con ID de seguimiento.
- Registro de fallos de comandos sin exponer datos sensibles.
- Indicadores minimos: fallos de guardado, cierres incompletos, diferencias pendientes y errores de archivos.

## Criterios para activar un flujo remoto

- Flujos principales aceptados funcionalmente.
- Comandos contables cubiertos por pruebas.
- Modelo de datos y RLS revisados.
- Estrategia de migracion y rollback aprobada.
- Entorno Supabase de prueba autorizado por el usuario.
- Migraciones reproducibles desde una base vacia.
- Pruebas negativas de permisos por los tres roles.
- Pruebas de idempotencia y concurrencia del comando.
- Conciliacion local/remota sin diferencias no explicadas.
