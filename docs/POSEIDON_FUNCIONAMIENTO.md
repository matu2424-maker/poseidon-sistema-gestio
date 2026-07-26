# Poseidon - Funcionamiento vigente

Ultima actualizacion: 2026-07-19

Este documento describe el comportamiento funcional implementado. Las formulas y asientos canonicos viven en `docs/REGLAS_CONTABLES.md`; las reglas transversales en `docs/REGLAS_GENERALES.md`.

## 1. Alcance actual

Poseidon gestiona:

- caja diaria y recaudaciones;
- maquinas y contadores;
- gastos, transferencias, regalos y salarios;
- tesoreria Caja/Principal;
- aportes y retiros patrimoniales de socios;
- diferencias de caja;
- locales, taller e historial de maquinas;
- clientes, personal y liquidacion salarial;
- cuentas corrientes, reportes, cierres periodicos y auditoria.

El sistema funciona localmente con datos de prueba. Supabase/Auth/Storage, publicacion y operacion multi-equipo no estan activos.

## 2. Arquitectura funcional

- React Router conserva una URL por pantalla.
- `src/navigation/screens.ts` define ruta, titulo, roles y requisito de caja.
- `src/App.tsx` orquesta datos, sesion y composicion.
- Los comandos de `src/application/` ejecutan reglas sensibles de forma atomica.
- Los helpers de `src/lib/` concentran calculos, cuentas, periodos y auditoria.
- El snapshot local usa esquema `5` y clave `poseidon-sistema-gestion-v2`.
- `normalizeData.ts` completa estructura sin reconstruir finanzas.
- `migrateData.ts` aplica migraciones versionadas e idempotentes.

## 3. Sesion, roles y funcion activa

Usuarios de prueba:

- Cajero 1.
- Cajero 2.
- Encargado.
- Administrador.

No se usa contraseña. El usuario se selecciona al ingresar.

### Cajero

- Opera una recaudacion.
- No usa barra lateral administrativa.
- Con caja cerrada solo accede a Abrir caja, Clientes y Resumen.
- Con caja abierta accede a contadores, movimientos, Caja/Principal y cierre.

### Encargado

- Controla los locales asignados; en la demo, Poseidon.
- Gestiona diferencias, Principal, gastos, salarios, cuentas, reportes, cierres y auditoria.
- Puede cambiar a funcion Cajero para operar una recaudacion.

### Administrador

- Control completo de maestros, locales, maquinas, personas, cuentas, reportes y auditoria.
- Puede cambiar a funcion Cajero.

La auditoria diferencia siempre:

- usuario real;
- rol real;
- funcion activa utilizada.

Los permisos no dependen solo de la navegacion. Antes de mutar el snapshot, los comandos de Caja, movimientos, tesoreria, diferencias, salarios y maestros administrativos validan que la funcion activa sea compatible con el rol real, que el usuario este activo y que tenga acceso a todos los locales involucrados. Un rechazo no crea datos, movimientos ni auditoria parcial.

## 4. Modelo de dinero

Solo se opera en pesos uruguayos (`UYU`).

### Cuentas de Caja

- `Caja / Efectivo`.
- `Caja / Banco`.

Representan los fondos disponibles para la operacion del local y los saldos que hereda una nueva recaudacion.

### Cuentas Principal

- `Principal / Efectivo`.
- `Principal / Banco`.

Representan la tesoreria general desde la que Encargado/Administrador pagan gastos y salarios o realizan movimientos patrimoniales.

### Cuentas de socios

- Mathias.
- Ricardo.

Solo se mueven ante un aporte o retiro patrimonial real.

No existe cuenta, rol ni concepto de custodia. Un traspaso interno Caja/Principal no elige persona.

## 5. Resultado economico

```text
resultado economico = resultado de maquinas - gastos - salarios - regalos
```

No cambian el resultado economico:

- transferencias Caja/Efectivo -> Caja/Banco;
- traspasos Caja <-> Principal;
- aportes y retiros de socios;
- saldos iniciales;
- diferencias de control;
- anulaciones financieras que solo revierten el asiento original.

## 6. Disponibilidad y atomicidad

- Una salida nueva no puede dejar negativa la cuenta de dinero que la paga.
- Un importe igual al saldo disponible se acepta.
- Si no hay fondos, se rechaza antes de crear entidad, asiento o auditoria.
- No se crea deuda, cuota ni pago parcial automaticamente.
- Para disponer de fondos en Caja, primero deben existir en Principal y luego traspasarse.
- Para disponer de fondos en Principal, puede existir un ingreso previo, un traspaso desde Caja o un aporte real de socio.
- Una anulacion tambien valida que la cuenta que debe devolver el dinero tenga fondos.
- La cuenta patrimonial de un socio puede representar posicion deudora/acreedora; Caja y Principal no pueden quedar negativas por una nueva salida.

## 7. Apertura de caja

Solo la funcion Cajero abre caja.

### Primera apertura

El Cajero declara efectivo, banco y socio aportante. El sistema crea:

1. aporte del socio a Principal por cada medio con monto;
2. traspaso automatico Principal -> Caja;
3. balance `EN_PROCESO`;
4. foto de maquinas y lecturas iniciales;
5. auditoria.

### Aperturas posteriores

- Efectivo inicial = saldo `Caja / Efectivo`.
- Banco inicial = saldo `Caja / Banco`.
- No se editan manualmente.
- Si no coinciden con el libro, la apertura se rechaza atomicamente.

Solo puede existir una caja abierta por local. Cada una recibe ID visible, por ejemplo `POSE-1`.

## 8. Contadores

- La apertura crea una lectura por maquina activa/no desuso.
- IN/OUT anterior se toma del ultimo contador de la maquina.
- IN/OUT actual inicia igual al anterior.
- El Cajero edita y guarda manualmente.
- Guardar valida toda la grilla antes de aplicar cambios; una fila invalida rechaza el lote completo y no muestra exito.
- IN/OUT actual no puede ser menor al anterior.
- El resultado por maquina se calcula desde la diferencia de contadores.
- Un resultado negativo se registra; puede dejar efectivo esperado negativo y bloquear salidas/cierre.
- La observacion es obligatoria para excepciones pendientes al cerrar.
- Al cerrar se actualizan contadores actuales e historial de maquina.

## 9. Gastos

### Desde Caja

- Funcion Cajero y caja abierta.
- Sale de `Caja / Efectivo`.
- Usa `balanceId`.
- Categoria, subcategoria y monto son obligatorios.
- Descripcion y comprobante son opcionales.
- Se puede anular antes de cerrar. El gasto permanece con estado `ANULADO` y un reverso restituye el saldo sin borrar historial.

### Desde Principal

- Funcion Encargado o Administrador.
- Se crea desde Control de gastos.
- Elige `Principal / Efectivo` o `Principal / Banco`.
- No necesita caja abierta y no usa `balanceId`.
- No cambia el efectivo esperado de una recaudacion.
- Se revisa, observa o anula sin borrar historial.

Todos los gastos integran el resultado economico del local y del periodo correspondiente.

## 10. Transferencias del Cajero

- Funcion Cajero y caja abierta.
- Salen de `Caja / Efectivo` y entran en `Caja / Banco`.
- Conservan registro informativo en la cuenta Transferencias.
- No cambian resultado economico.
- Pueden asociarse a un cliente.
- Se anulan con contramovimientos.

## 11. Regalos

- Funcion Cajero y caja abierta.
- Salen de `Caja / Efectivo`.
- Integran resultado economico.
- Cliente, referencia y monto son obligatorios.
- Detalle es opcional.
- El selector permite buscar y elegir varios clientes.
- Se anulan antes del cierre sin borrar historial; el regalo permanece `ANULADO` y se agrega su reverso contable.

## 12. Salarios y liquidaciones

Todas las cargas usan `SalarySettlement`; no hay una tabla paralela.

### Desde Caja

- Funcion Cajero.
- Conceptos nuevos: Salario y Adelanto.
- Sale de `Caja / Efectivo`.
- Usa la caja activa mediante `balanceId`.
- Exige personal, periodo trabajado y monto.

### Desde Principal

- Funcion Encargado o Administrador.
- Elige `Principal / Efectivo` o `Principal / Banco`.
- No usa `balanceId`.
- Puede operar sin caja abierta.
- Conceptos: Salario, Adelanto, Premio/Gratificacion, Horas extras, Aguinaldo, Salario vacacional y Descuento.
- Descuento no mueve dinero.

### Periodo y limites

- El periodo usa `AAAA-MM`.
- Del dia 1 al 10 se sugiere mes anterior; desde el 11, mes actual.
- La sugerencia se puede cambiar.
- La imputacion usa el periodo trabajado, no la fecha de pago.
- Salario pagado no supera salario base.
- Salario + adelantos no supera salario base.
- Salario + adelantos + descuentos no supera salario base.
- Corregir una liquidacion valida el incremento neto en la misma cuenta.

### Cierre salarial

- Crea una foto mensual inmutable por empleado.
- Congela base, conceptos, total, cubierto, entregado y pendiente.
- Bloquea operaciones ordinarias del periodo.
- Toda correccion posterior abre una revision R1/R2 enlazada con motivo.
- No borra ni reescribe R0.

## 13. Traspasos Caja y Principal

Tipos:

- `Caja a Principal` (`RETIRO_CAJA`).
- `Principal a Caja` (`APORTE_CAJA`).

Reglas:

- Conservan el medio Efectivo o Banco.
- No cambian resultado economico ni patrimonio.
- Si existe caja abierta, deben asociarse a ella.
- Cajero solo puede mover fondos con caja abierta.
- Encargado/Administrador pueden operar desde Cuentas corrientes.
- Un traspaso operativo puede anularse con motivo si su caja sigue abierta y el reverso tiene fondos.
- Los traspasos de apertura y cierre son automaticos e inmutables.

El alta legacy de aportes/retiros queda deshabilitada. Los objetos antiguos se conservan para lectura, migracion y anulacion compatible.

## 14. Socios

Tipos:

- `APORTE_SOCIO`: socio -> Principal.
- `RETIRO_SOCIO`: Principal -> socio.

Reglas:

- Solo Mathias o Ricardo.
- Efectivo o Banco.
- No cambia resultado economico.
- Retiro requiere saldo en Principal.
- Se registra desde Cuentas corrientes por Encargado/Administrador.
- Alta/anulacion crea asientos dobles y auditoria.
- Un `RETIRO` legacy no se convierte en retiro de socio: se interpreta como Caja -> Principal.

## 15. Cierre de caja

Solo funcion Cajero.

### Control

La pantalla muestra:

- saldos iniciales;
- resultado de maquinas;
- gastos, salarios y regalos de Caja;
- transferencias;
- traspasos Principal -> Caja y Caja -> Principal;
- resultado economico;
- salida total;
- efectivo/banco esperados y declarados.

### Declaracion

El Cajero informa:

- traspaso final Caja -> Principal en efectivo;
- traspaso final Caja -> Principal en banco;
- efectivo declarado que permanece en Caja;
- banco declarado que permanece en Caja;
- observacion si hay diferencia.

No elige socio ni receptor.

### Formulas

```text
efectivo esperado final = esperado antes del cierre - traspaso a Principal/Efectivo
banco esperado final = Caja/Banco - traspaso a Principal/Banco
diferencia efectivo = declarado efectivo - esperado final
diferencia banco = declarado banco - esperado final
```

El remanente declarado abre la proxima caja. Lo transferido queda disponible en Principal.

### Bloqueos

- maquinas pendientes sin observacion;
- importes invalidos o negativos;
- traspaso superior al saldo;
- diferencia sin observacion;
- efectivo esperado negativo;
- desacople entre calculo interno y `Caja / Efectivo`.

Un efectivo esperado negativo se cubre con fondos reales de Principal y traspaso Principal -> Caja. Un desacople tecnico exige una reconciliacion auditada y no se corrige con un traspaso ordinario.

Todo bloqueo ocurre antes de mutar datos. El cierre exitoso actualiza maquinas, crea traspasos finales, diferencias, asientos, auditoria y navega a Resumen de cajas.

Apertura, contadores y cierre usan la misma frontera de autorizacion de comandos y exigen funcion Cajero. En salarios, los pagos de Caja verifican ademas que empleado y caja pertenezcan al mismo local; las fotos salariales validan todos los locales congelados antes de cerrar o corregir.

## 16. Diferencias de caja

Se crean al cerrar cuando declarado y esperado no coinciden.

Estados:

- `PENDIENTE`.
- `VERIFICADA`.
- `CORREGIDA`.
- `ANULADA`.

Reglas:

- No cambian resultado economico.
- Ajustan `Caja / Efectivo` o `Caja / Banco` para que el libro refleje lo declarado.
- Encargado/Administrador deben observar y gestionar.
- Verificar confirma el impacto.
- Corregir modifica declarados y agrega el delta contable necesario.
- Anular agrega contramovimientos; no borra asientos.
- `ANULADA` es terminal.
- No se gestiona una diferencia mientras hay otra caja abierta del local.
- Un ajuste historico no reescribe fondos iniciales de cajas posteriores.
- Historial por mes incluye pendientes y resueltas.

## 17. Cuentas corrientes

La pantalla agrupa:

- Caja.
- Principal.
- Socios.
- Otras cuentas.

Los saldos se derivan de movimientos activos. No se cargan manualmente.

La tabla muestra fecha, concepto, detalle, usuario, debito, credito y saldo corrido. Cada columna de datos ordena. Un movimiento puede abrir su detalle y la recaudacion asociada.

Cuentas corrientes tambien es la entrada administrativa para:

- Caja <-> Principal;
- aporte de socio;
- retiro de socio;
- anulaciones permitidas.

## 18. Paneles

### Panel Cajero

- Datos de recaudacion activa.
- Resultado de maquinas y salidas.
- Efectivo/Banco inicial y actual.
- Accesos a operaciones.
- Sin caja, bloquea operaciones y orienta a abrir.

### Panel Encargado

- Alerta unica para diferencias pendientes y cuentas monetarias negativas.
- Control financiero en tres celdas: Diferencias, Efectivo y Banco.
- Efectivo/Banco muestran liquidez total y desglose Caja/Principal.
- Resultado del mes con ingresos, salidas, neto y desglose de maquinas, gastos, salarios y regalos.
- Contexto de recaudacion activa con ID, fecha y usuario de apertura.
- Accesos unicos a gastos, salarios, clientes, personal, reportes y auditoria.
- Actividad financiera con los cinco movimientos monetarios mas recientes y todas sus columnas ordenables.
- Los calculos se concentran en `managerDashboardSummary`; el panel no modifica cuentas ni replica formulas.

### Panel Administrador

- Control general, reportes y gestion de maestros.
- Acceso a cuentas y tesoreria.
- Para Caja cambia a funcion Cajero.

## 19. Locales y maquinas

### Locales

- Alta, edicion, cierre e historial.
- ID numerico corto.
- Datos: nombre, estado, locatario, telefono, email, ubicacion, imagenes como metadatos.
- Asociacion de maquinas disponibles desde Taller.
- Cerrar local envia sus maquinas al Taller.
- Con caja abierta no se cierra el local ni se mueven maquinas.
- Quitar un local permitido no borra sus auditorias; los IDs de alcance quedan
  congelados aunque el maestro deje de existir.

### Maquinas

- Alta en Taller con IN/OUT inicial cero.
- Taller es una ubicacion virtual valida en maquinas, historial y auditoria; no
  se modela como un local operativo.
- Asignacion a local, mantenimiento, taller y desuso.
- Desuso solo desde Taller y no aparece en listado operativo.
- Para eliminar debe estar en Taller y no tener recaudaciones.
- Reset de contadores solo sin caja abierta; queda auditado e historizado.
- IN/OUT solo cambia por recaudacion o ajuste administrativo permitido.

## 20. Clientes

- Identificador principal: tipo y numero de documento.
- Cedula acepta numeros; Pasaporte acepta letras/numeros.
- Documento obligatorio y no duplicado entre clientes vigentes.
- Foto y documento guardan metadatos.
- Cajero puede agregar, editar y enviar a papelera.
- Regalos y transferencias pueden asociarse a clientes.
- Un cliente referenciado no se elimina fisicamente.

## 21. Personal

- Alta, edicion, baja y papelera.
- Campos principales: identidad, contacto, cargo, local, ingreso, salario, horarios, vacaciones, emergencia y banco.
- Cargos permitidos: Cajera/o, Encargado/a, Mantenimiento y Limpieza.
- Tipos salariales: mensual, jornal y hora.
- Cambios de salario base son prospectivos, con fecha efectiva, motivo y auditoria.
- No modifican cierres salariales existentes.
- Personal con historial no se elimina fisicamente.

## 22. Reportes y cierre periodico

- Reportes consultan cajas, maquinas, diferencias, cuentas y auditoria.
- Cierre periodico admite semana, quincena, mes o rango.
- Consolida cajas cerradas y gastos/salarios administrativos de Principal dentro del periodo/local.
- Separa resultado economico de movimientos financieros.
- Informa traspasos Caja/Principal y movimientos patrimoniales de socios.
- La foto periodica conserva IDs de cajas, gastos, salarios, traspasos y socios incluidos.
- Un cierre periodico no borra ni reinicia operaciones.
- Cada foto corresponde a un unico local. Usuario, funcion activa, asignacion, rango y referencias se validan atomica y nuevamente al guardar.
- Anular una foto cambia solamente su estado y agrega auditoria; no recalcula ni reescribe los importes guardados.

## 23. Auditoria

Toda accion sensible registra, cuando aplica:

- fecha/hora;
- usuario real;
- rol real;
- funcion usada;
- accion, entidad e ID;
- antes/despues;
- motivo;
- local y recaudacion.

La revision de un gasto modifica solo sus metadatos y auditoria. Su anulacion conserva la entidad original y agrega el contramovimiento correspondiente; nunca elimina el registro.

Administrador ve todo. Encargado ve eventos de sus locales. No se auditan contraseñas ni contenido inline de archivos.

## 24. Tablas e interfaz

- No repetir titulos de la barra superior.
- Diseñar para 1080p y verificar movil al cambiar layout.
- Botones alineados y de tamaño consistente.
- Tablas compactas y profesionales.
- Toda columna visible de datos permite ordenar.
- Acciones y Seleccion son las excepciones.
- Errores y validaciones aparecen en el contexto de la accion.

## 25. Persistencia local

- Una pestaña no sobrescribe cambios guardados por otra.
- Un conflicto bloquea escritura y conserva respaldo.
- Una pestaña pasiva adopta el ultimo snapshot.
- Un error de cuota no se oculta ni recorta historial.
- El administrador puede exportar/importar respaldo.
- Desde `Datos locales`, un Administrador en funcion Administrador puede crear una base operativa limpia. Antes se descarga automaticamente el snapshot completo del navegador.
- Desde la misma pantalla puede cargar el escenario demo integral. Antes se descarga automaticamente el snapshot completo y luego se reemplaza la base activa sin mezclar datos anteriores.
- La carga demo deja tres cajas historicas cerradas, una diferencia pendiente y movimientos de gastos, transferencias, regalos, salarios, tesoreria, socios, cuentas corrientes y auditoria para pruebas coordinadas.
- La carga queda auditada con usuario real, funcion, fecha y resumen anterior/nuevo.
- El reinicio conserva local, usuarios, personal, clientes, categorias, cuentas y maquinas; pone contadores y adelantos en cero y elimina cajas, lecturas, gastos, transferencias, regalos, liquidaciones, cierres y movimientos financieros del snapshot activo.
- La base nueva conserva un unico evento de auditoria con actor, funcion, fecha y resumen anterior/nuevo. El historial reemplazado sigue disponible en el respaldo descargado.
- Esta excepcion destructiva existe solo para pruebas locales y no representa anulaciones ni movimientos contables de produccion.
- La carga demo comparte esa condicion: no debe existir como reemplazo de datos en produccion.
- Un snapshot corrupto puede descargarse antes de reiniciar.
- El esquema actual se valida completo y de forma estricta antes de cargar, importar o guardar: colecciones, campos, enums, numeros finitos, IDs, referencias y asociaciones de local/recaudacion.
- Los snapshots heredados migran primero y solo se hidratan si el resultado cumple la validacion vigente.
- Una falla informa las rutas afectadas, no reemplaza el almacenamiento valido y conserva el contenido original o el intento fallido para recuperacion.

## 26. Pendientes tecnicos

- Auth y permisos reales.
- Base de datos multiusuario.
- Storage real de adjuntos.
- Contexto multi-local completo.
- E2E adicional de tesoreria, cierre periodico y formularios administrativos.

Estos pendientes no se implementan ni publican sin autorizacion expresa.
