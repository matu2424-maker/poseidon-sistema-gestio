# Poseidon - Plan de migracion local a online

Ultima actualizacion: 2026-07-19

Estado: plan futuro. No autoriza conexiones, despliegues ni cambios de persistencia.

## Objetivo

Migrar Poseidon desde `localStorage` hacia la arquitectura definida en `docs/ARQUITECTURA_OBJETIVO_ONLINE.md`, manteniendo el sistema local disponible hasta que la version online sea verificada y aprobada.

Ruta aprobada de preparacion: `localStorage` -> `AppDataRepository` -> PostgreSQL/Supabase. PGlite u otra base intermedia quedan fuera del plan para evitar una migracion adicional sin necesidad offline confirmada.

## Principios

- Migrar por etapas reversibles.
- No usar datos reales para diseñar el primer esquema.
- No hacer dual-write prolongado entre local y online.
- No perder auditoria, historial, IDs visibles ni relaciones.
- Conciliar saldos antes y despues de importar.
- Hacer el corte final solo con autorizacion explicita.

## Mapa preliminar de datos

| Coleccion actual | Tabla futura sugerida | Relaciones principales |
| --- | --- | --- |
| `users` | `profiles` | Auth user, rol |
| `users.localIds` | `user_locals` | usuario, local |
| `locals` | `locals` | entidad raiz operativa |
| `locals.images` | `attachments` | local, objeto Storage |
| `machines` | `machines` | local/ubicacion actual |
| `machineLocalHistory` | `machine_history` | maquina, local, usuario |
| `balances` | `cash_balances` | local, apertura/cierre |
| `readings` | `machine_readings` | caja, maquina |
| `expenseCategories` | `expense_categories` | categoria |
| subcategorias | `expense_subcategories` | categoria padre |
| `expenses` | `expenses` | caja, usuario, comprobante |
| `transfers` | `transfers` | caja, cliente |
| `gifts` | `gifts` | caja, referencia |
| `gifts.clientIds` | `gift_clients` | regalo, cliente |
| `capitalMovements` | `capital_movements` | caja, local, medio |
| `staff` | `staff` | local |
| `salaryHistories` | `salary_history` | empleado, vigencia |
| `salarySettlements` | `salary_settlements` | empleado, periodo, caja opcional |
| `salaryClosures` | `salary_closures` | periodo, usuario |
| `clients` | `clients` | local |
| `currentAccounts` | `current_accounts` | tipo, entidad propietaria |
| `accountMovements` | `account_movements` | cuenta, origen, caja opcional |
| `periodicClosures` | `periodic_closures` | local, rango |
| `audit` | `audit_events` | actor, entidad |

El nombre definitivo de tablas y columnas se decide durante el diseno del esquema. Esta tabla fija correspondencias funcionales, no SQL final.

## Fase 0 - Congelar contrato local

- Agregar `schemaVersion` al snapshot local.
- Definir formato de exportacion/importacion.
- Validar JSON al cargar, sin cast directo no verificado.
- Corregir manejo de fecha local y UUID futuros.
- Cubrir comandos contables con pruebas.

Salida: snapshot local versionado, validable y exportable.

## Fase 1 - Separar dominio y persistencia

- Completado en flujos criticos: extraer comandos de negocio de componentes React.
- Completado como contrato transversal: crear `AppDataRepository` asincrono y codec de respaldo.
- Completado: implementar adaptador `localStorage` con ese contrato y cola ordenada de escrituras.
- Completado: mantener comportamiento y datos actuales con pruebas y E2E.
- Pendiente futuro: decidir si el backend necesita repositorios por dominio o un gateway transaccional sobre `AppDataRepository`.

Salida: la aplicacion sigue local, pero la UI deja de depender del almacenamiento concreto.

## Fase 2 - Disenar base de datos

- Crear diagrama entidad-relacion.
- Definir UUID como claves primarias y restricciones unicas para IDs visibles/documentos.
- Definir claves foraneas, estados y checks de montos.
- Definir indices por local, fecha, caja, empleado, maquina y cuenta.
- Definir operaciones que requieren funciones/transacciones.

Salida: migraciones SQL revisables, aun sin datos reales.

## Fase 3 - Autenticacion y permisos

- Crear entorno Supabase de prueba autorizado.
- Configurar Auth.
- Crear `profiles` y `user_locals`.
- Implementar RLS por rol y local.
- Probar intentos permitidos y rechazados para cada rol.

Salida: matriz de permisos demostrada en pruebas.

## Fase 4 - Adaptador Supabase

- Implementar repositorios online respetando los contratos locales.
- Usar transacciones/funciones para comandos atomicos.
- Mantener seleccion de adaptador por configuracion de entorno.
- No activar produccion.

Salida: aplicacion funcional contra datos de prueba online.

## Fase 5 - Archivos

- Crear buckets privados y politicas.
- Implementar subida de comprobantes, fotos y documentos.
- Guardar metadata y relacion con la entidad.
- Validar MIME, tamano, permisos y eliminacion logica.

Salida: archivos accesibles solo para usuarios autorizados.

## Fase 6 - Exportar datos locales

El exportador debe incluir:

- version del esquema;
- fecha/hora y origen;
- todas las colecciones de `AppData`;
- checksum o resumen de cantidades;
- referencias de archivos locales disponibles;
- reporte de datos invalidos o sin relacion.

No modificar el snapshot durante la exportacion.

## Fase 7 - Importar en prueba

- Importar primero maestros: locales, usuarios, personal, clientes, categorias y maquinas.
- Importar luego cajas, lecturas y movimientos operativos.
- Importar cuentas, movimientos derivados, cierres y auditoria.
- Importar archivos al final.
- Registrar tabla de correspondencia ID local -> UUID.

Salida: informe de filas importadas, rechazadas y reconciliadas.

## Fase 8 - Conciliacion

Comparar local y online por local/periodo:

- cantidad de cajas y lecturas;
- resultado de maquinas;
- gastos, salarios y regalos;
- transferencias de Caja, traspasos Caja/Principal y movimientos de socios;
- efectivo/banco esperado y declarado;
- diferencias y estados;
- saldos de cuentas corrientes;
- historial de maquinas y auditoria;
- cierres salariales y periodicos.

Una diferencia de conciliacion bloquea el corte.

## Fase 9 - Prueba operativa

- Flujo completo por rol.
- Dos sesiones concurrentes.
- Cierre de caja y correccion de diferencia.
- Anulaciones y auditoria.
- Pérdida temporal de conexion y recuperacion.
- Archivos, exportaciones y permisos.
- Rendimiento con historial representativo.

Salida: acta de aceptacion o lista de correcciones.

## Fase 10 - Corte final

- Crear respaldo local/exportacion final.
- Bloquear temporalmente nuevas escrituras locales.
- Importar delta final o snapshot definitivo.
- Ejecutar conciliacion final.
- Cambiar configuracion al adaptador online.
- Mantener respaldo local de solo lectura durante el periodo acordado.

Requiere autorizacion explicita antes de ejecutarse.

## Rollback

- No borrar el snapshot local durante el corte.
- Si falla conciliacion, permisos o comandos criticos, volver al adaptador local.
- Documentar operaciones realizadas durante la ventana de prueba para no perderlas.
- Restaurar online desde backup solo despues de identificar la causa.

## Criterios de aceptacion

- Todas las pruebas automatizadas y de permisos pasan.
- Conciliacion con diferencia cero o excepciones documentadas y aprobadas.
- Auditoria completa y no editable por roles operativos.
- Archivos privados accesibles segun permisos.
- Backups y restauracion probados.
- Usuario aprueba el corte y la publicacion por separado.

## Decisiones pendientes

- Proyecto/region Supabase definitivos.
- Politica de retencion y backups.
- Limites de archivos.
- Estrategia offline posterior a la migracion.
- Dominio, hosting y ambientes.
- Tratamiento de datos personales y obligaciones legales aplicables.
