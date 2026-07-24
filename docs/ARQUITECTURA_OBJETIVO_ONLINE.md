# Poseidon - Arquitectura objetivo online

Ultima actualizacion: 2026-07-24

Estado: diseno futuro. Nada de este documento esta conectado o desplegado actualmente.

Base local ya implementada: `AppDataRepository` asincrono, codec de respaldo, adaptador `localStorage` y cola de escrituras ordenadas. No existe adaptador online ni conexion externa.

Decision vigente: cuando se autorice la etapa online, la evolucion sera directa desde el adaptador `localStorage` hacia PostgreSQL/Supabase. No se incorpora PGlite, IndexedDB como base relacional ni otro almacenamiento intermedio salvo una decision futura y explicita de producto que requiera operacion offline-first.

Preparacion de entrega ya implementada localmente: runtime y package manager fijados, build reproducible, CI versionado, preflight, changelog y flujo `main -> release/test`. Esto no activa hosting ni modifica la persistencia.

## Objetivo

Preparar una evolucion desde la aplicacion local actual hacia un sistema online multiusuario, multi-local, auditable y recuperable, sin reescribir las reglas de negocio ni las pantallas de una sola vez.

## Limites

- El sistema sigue usando `localStorage` hasta que el usuario autorice otra etapa.
- No guardar credenciales, URLs privadas ni claves en documentacion o codigo versionado.
- No activar Supabase, autenticacion, Storage, Vercel ni servicios externos por anticipado.
- No agregar una base local intermedia: `AppDataRepository` es la frontera de reemplazo y evita acoplar la aplicacion al proveedor futuro.
- La migracion debe preservar IDs visibles, relaciones, saldos, estados e historial.

## Arquitectura propuesta

```text
React / Vite
  -> capa de presentacion
  -> comandos y consultas de aplicacion
  -> reglas de dominio puras
  -> interfaces de repositorios
       -> adaptador localStorage (actual)
       -> adaptador Supabase (futuro)

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

## Repositorios objetivo

El contrato transversal actual vive en `src/application/ports/AppDataRepository.ts` y permite cambiar el adaptador sin acoplar `App` a `localStorage`. Durante el diseno online se evaluara dividirlo en repositorios de dominio sin perder transacciones atomicas.

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

No es obligatorio crear una interfaz por tabla. Deben representar operaciones de negocio y permitir transacciones consistentes.

## Identidad y permisos

- Supabase Auth identifica al usuario real.
- El perfil interno define rol y locales asignados.
- La funcion usada (`ENCARGADO` trabajando como `CAJERO`) se registra aparte del rol real.
- RLS valida permisos en base de datos; ocultar botones no cuenta como seguridad.
- `CAJERO`: opera cajas y entidades permitidas de locales asignados.
- `ENCARGADO`: consulta y controla locales asignados; puede operar como cajero.
- `ADMINISTRADOR`: administra el sistema completo; puede operar como cajero.

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

- Variables publicas del frontend solo contienen valores anonimos permitidos.
- Claves de servicio viven exclusivamente en backend/entorno seguro.
- RLS activa antes de importar datos reales.
- Ambientes separados: local, prueba y produccion.
- Backups y restauracion probados antes del corte final.
- Version de frontend, etiqueta Git, migracion de esquema y compatibilidad de datos deben poder rastrearse de forma independiente.

## Observabilidad

- Errores tecnicos con ID de seguimiento.
- Registro de fallos de comandos sin exponer datos sensibles.
- Indicadores minimos: fallos de guardado, cierres incompletos, diferencias pendientes y errores de archivos.

## Criterios para iniciar la implementacion

- Flujos principales aceptados funcionalmente.
- Comandos contables cubiertos por pruebas.
- Modelo de datos y RLS revisados.
- Estrategia de migracion y rollback aprobada.
- Entorno Supabase de prueba autorizado por el usuario.
