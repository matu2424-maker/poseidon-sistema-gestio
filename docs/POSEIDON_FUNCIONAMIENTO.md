# Poseidon Sistema de Gestion - Funcionamiento y reglas

Ultima actualizacion: 2026-06-26

Este documento es la memoria funcional viva del sistema. Cada cambio funcional relevante debe actualizar este archivo en el mismo trabajo.

## Base tecnica

- Aplicacion web React + Vite + TypeScript.
- Persistencia actual: `localStorage`, clave `poseidon-sistema-gestion-v2`.
- Supabase/Auth real queda pendiente para una etapa posterior.
- En `localStorage` no se persisten archivos pesados/base64; comprobantes e imagenes guardan metadatos para evitar superar la cuota del navegador.
- El almacenamiento real de archivos queda pendiente para Supabase Storage u otro storage externo.
- Usuarios de prueba:
  - `admin / admin123`
  - `cajero1 / cajero123`
  - `cajero2 / cajero123`
  - `encargado / encargado123`

## Roles

- `CAJERO`: opera caja diaria, contadores, gastos, transferencias, regalos, sueldos y clientes desde el panel del cajero.
- `ENCARGADO`: rol operativo superior para caja, diferencias, reportes y auditoria.
- `ADMINISTRADOR`: gestiona locales, maquinas, usuarios, personal, liquidaciones, clientes, categorias, reportes y auditoria.

## Reglas generales

- No se borra historial operativo sin pasar por auditoria.
- Las bajas operativas deben quedar como estado, anulacion o papelera antes de eliminacion definitiva.
- Las acciones sensibles usan confirmacion simple antes de ejecutar.
- Las tablas principales deben mantener foco en grilla, busqueda, ordenamiento cuando aplique y acciones claras.
- Todo cambio de datos importante debe crear evento de auditoria.

## Locales

- Local principal actual: `Poseidon`.
- Los locales tienen ID numerico corto.
- Estados: `ACTIVO`, `INACTIVO`, `CERRADO`.
- Si un local pasa a `CERRADO`, sus maquinas vuelven al Taller con confirmacion.
- Desde Locales se pueden ver maquinas asociadas, historial, recaudaciones y auditoria.

## Maquinas

- Las maquinas nacen en `Taller`.
- Estados: `ACTIVA`, `INACTIVA`, `MANTENIMIENTO`, `DESUSO`.
- `DESUSO` solo se permite cuando la maquina esta en Taller.
- Las maquinas en `DESUSO` no aparecen en el listado general; se ven en el apartado de desuso del Taller.
- Para eliminar una maquina debe estar en Taller.
- No se puede eliminar una maquina con recaudaciones.
- Reset de contadores:
  - queda auditado;
  - no debe hacerse con caja abierta del local;
  - pone IN y OUT actuales en 0 para nuevas cajas.

## Caja diaria

- El cajero no usa barra lateral.
- Las casillas de importes de dinero muestran `0` al iniciar.
- Al hacer clic en una casilla de dinero con valor `0`, se limpia para escribir.
- Si se sale de una casilla de dinero sin ingresar monto, vuelve a `0`.
- Los importes se escriben como numeros simples y se visualizan con separador de miles por punto, por ejemplo `1000` pasa a `1.000`.
- Si no hay caja abierta, debe abrir caja para operar.
- Si hay caja abierta, entra al panel del cajero y sigue esa caja.
- Al abrir caja se crea una foto de lecturas de maquinas para esa caja.
- Si es la primera caja del local, el cajero debe declarar el primer aporte de capital:
  - aporte inicial en efectivo;
  - aporte inicial en banco/transferencia;
  - responsable del aporte (`RICARDO` o `MATHIAS`).
- El primer aporte de capital crea movimientos de cuenta en `Local / Efectivo` y `Local / Banco`, con momento `APERTURA`.
- Si no es la primera caja del local, la apertura toma automaticamente el saldo que quedo en las cuentas corrientes del local:
  - saldo `Local / Efectivo` como efectivo inicial;
  - saldo `Local / Banco` como banco inicial.
- Cada caja tiene un ID visible rastreable con las primeras cuatro letras del local y un numero correlativo, por ejemplo `POSE-1`.
- Cada caja muestra hora de apertura y hora de cierre en los resumenes.
- La pantalla `Nueva caja diaria` muestra el formulario de apertura y las ultimas 2 cajas cerradas del local.
- En `Nueva caja diaria` no hay boton volver; se usa solo para abrir caja cuando no hay caja abierta.
- Al hacer clic en una caja cerrada reciente se ve un resumen en pantalla, solo lectura y sin exportacion.
- Si se consulta el resumen desde el panel del cajero con caja abierta, se muestra solo resumen y ultimas cajas, no el formulario de nueva caja.
- En `Resumen de cajas` hay boton `Volver al panel`.
- En resumen de caja cerrada la diferencia visible se calcula como `efectivo declarado - efectivo esperado` usando los mismos totales mostrados.
- Los contadores de una caja abierta no cambian por reset posterior de maquina; para ver reset en 0 hay que cerrar caja, resetear y abrir nueva caja.
- Cierre de caja:
  - se centra en `Balance de control` y `Declaracion final`;
  - no muestra tarjetas superiores de maquinas, efectivo esperado, salidas ni capital/banco;
  - salidas incluye gastos, sueldos, regalos y retiros en efectivo;
  - transferencias se muestran separadas y descuentan del efectivo esperado;
  - aportes de capital en efectivo suman al efectivo esperado;
  - retiros en efectivo descuentan del efectivo esperado;
  - resultado final es economico, no financiero: resultado de maquinas - gastos - sueldos - regalos;
  - aportes, retiros, transferencias, efectivo inicial y banco inicial no modifican el resultado final porque son movimientos financieros o de caja;
  - dinero en banco muestra el saldo banco del local antes del retiro final banco;
  - aportes/retiros por transferencia mueven la cuenta banco del local pero no el efectivo fisico de caja;
  - al cierre se puede registrar retiro final en efectivo y/o banco;
  - el retiro final queda con responsable (`RICARDO` o `MATHIAS`) y momento `CIERRE`;
  - el retiro final efectivo y el retiro final banco pueden tener responsables distintos;
  - si el retiro final efectivo es `0`, el selector de quien retira efectivo queda deshabilitado, con fondo gris y texto `Sin retiros finales`;
  - si el retiro final banco es `0`, el selector de quien retira banco queda deshabilitado, con fondo gris y texto `Sin retiros finales`;
  - el cajero declara el efectivo final que queda en el local;
  - el efectivo final declarado queda como saldo de apertura de la siguiente caja;
  - el saldo banco restante queda como banco inicial de la siguiente caja;
  - efectivo esperado final y diferencia se calculan antes de confirmar;
  - si hay diferencia, la observacion es obligatoria;
  - si hay maquinas pendientes sin observacion, no se puede cerrar;
  - los errores de cierre se muestran como avisos dentro de la pantalla de cierre.

## Panel del cajero

### Encabezado y resumen superior

- El encabezado muestra:
  - fecha operativa;
  - ID de recaudacion;
  - efectivo inicial de la caja;
  - banco inicial de la caja.
- El resumen superior muestra:
  - resultado de maquinas, en verde si es positivo y rojo si es negativo;
  - salida total, calculada como gastos + sueldos + regalos;
  - efectivo en caja y dinero en banco uno al lado del otro;
  - transferencias;
  - aportes efectivo;
  - gastos;
  - sueldos;
  - regalos;
  - retiros.
- `Salida total`, `Efectivo en caja` y `Dinero en banco` son recuadros grises de lectura y no ejecutan acciones.
- Los recuadros principales del resumen superior funcionan como accesos directos:
  - `Resultado de maquinas`: abre carga de contadores;
  - `Transferencias`: abre carga de transferencias;
  - `Aportes efectivo` y `Retiros`: abren retiros / aportes y se muestran juntos;
  - `Gastos`: abre carga de gastos;
  - `Sueldos`: abre pago de sueldos;
  - `Regalos`: abre carga de regalos.

### Acciones inferiores

- Al entrar a una accion, se oculta el resumen superior para dar foco al modulo activo.
- Debajo del resumen quedan accesos compactos y del mismo tamano a `Clientes`, `Resumen cajas` y `Cerrar caja`.

## Contadores

- La carga de contadores se abre dentro del panel del cajero.
- No hay guardado automatico.
- Se editan IN/OUT y se guarda con boton.
- IN/OUT actual no puede ser menor al anterior.
- Si IN/OUT actual queda menor al anterior, la fila y el campo quedan marcados en rojo.
- Se muestran entrada total, salida total y resultado.

## Gastos, transferencias y regalos

- Se cargan desde una fila directa en tabla.
- Gastos se pueden eliminar mientras la caja esta abierta, antes del cierre.
- En gastos son obligatorios solo categoria, subcategoria y monto; descripcion y comprobante son opcionales.
- El comprobante de gasto guarda solo nombre/tipo del archivo en esta etapa local; no se guarda la imagen/PDF completo en `localStorage` para evitar caidas por limite de almacenamiento.
- Transferencias se pueden anular.
- Gastos usan categorias y subcategorias definidas por administrador.
- Transferencias y regalos pueden asociarse a clientes existentes.
- Regalos usan selector de clientes en ventana aparte, con buscador y seleccion multiple.
- En regalos no se usa tipo; siempre son en efectivo.
- En regalos son obligatorios cliente, referencia y monto; detalle es opcional.
- La referencia de regalos se elige desde una lista cerrada.
- Regalos se pueden eliminar mientras la caja esta abierta, antes del cierre.

## Retiros y aportes de capital

- Los retiros y aportes se cargan desde el panel del cajero y tambien estan disponibles para usuarios con menu lateral cuando hay caja abierta.
- Campos: tipo (`RETIRO` o `APORTE`), momento (`APERTURA`, `OPERATIVO` o `CIERRE`), medio (`EFECTIVO` o `TRANSFERENCIA`), persona (`RICARDO` o `MATHIAS`), monto y nota opcional.
- Cada movimiento guarda fecha/hora, usuario, local, caja y estado.
- Los movimientos `APERTURA` solo se usan para el primer aporte de capital y no se duplican en el efectivo esperado porque ya forman parte del saldo inicial.
- Los movimientos `OPERATIVO` se cargan durante la caja.
- Los movimientos `CIERRE` se generan desde la pantalla de cierre como retiro final.
- Un retiro es salida de la cuenta corriente del local.
- Un aporte es entrada de la cuenta corriente del local.
- Si el medio es `EFECTIVO`, afecta la cuenta `Local / Efectivo` y el efectivo esperado de caja.
- Si el medio es `TRANSFERENCIA`, afecta la cuenta `Local / Banco` y no cambia el efectivo fisico esperado.
- Se pueden anular movimientos; la anulacion deja auditoria y anula el movimiento de cuenta asociado.

## Personal

- Administrador puede agregar, editar, dar de baja y enviar personal a papelera.
- Datos: nombre, apellido, documento, direccion, telefono, email, nacimiento, cargo, local, fecha ingreso, salario, adelantos, vacaciones, contacto emergencia, cuenta bancaria, horarios y notas.
- Horarios se registran por dia de semana.
- La baja no elimina el registro.

## Liquidacion de sueldos

- Administrador tiene modulo de liquidacion mensual.
- Cajero tiene carga rapida de sueldos desde su panel.
- Conceptos actuales:
  - `SUELDO`
  - `ADELANTO`
  - `EXTRA`
  - `AGUINALDO`
  - `SALARIO_VACACIONAL`
- En cajero se cargan solo `Personal`, `Concepto` y `Monto`.
- Los pagos de sueldo cargados por cajero quedan asociados a la caja abierta.
- Los pagos de sueldo cargados por cajero se pueden eliminar mientras la caja esta abierta, igual que gastos.
- Si se elimina un adelanto de sueldo antes del cierre, se descuenta del saldo de adelantos del personal.
- En admin se puede liquidar con mas detalle: sueldo base, adelantos, extra, aguinaldo, salario vacacional y descuentos.
- El efectivo en caja descuenta solo sueldos asociados a esa caja; una caja nueva siempre inicia sueldos en 0.

## Cuentas corrientes

- Existe un libro interno de cuentas corrientes.
- Cada empleado tiene una cuenta corriente automatica.
- Existe una cuenta corriente unica para transferencias.
- Cada local tiene dos cuentas corrientes automaticas:
  - `Local / Efectivo`;
  - `Local / Banco`.
- Los saldos no se cargan manualmente: se calculan desde movimientos.
- Los movimientos tienen cuenta, origen, fecha, usuario, concepto, direccion, monto y estado.
- En empleados, los pagos y adelantos se registran como salidas.
- En transferencias, cada transferencia se registra como entrada en la cuenta de transferencias.
- En locales:
  - resultado de maquinas positivo entra en `Local / Efectivo`;
  - resultado de maquinas negativo sale de `Local / Efectivo`;
  - gastos, regalos y sueldos salen de `Local / Efectivo`;
  - transferencias entran en `Local / Banco`;
  - retiros salen de `Local / Efectivo` o `Local / Banco` segun medio;
  - aportes entran en `Local / Efectivo` o `Local / Banco` segun medio.
- Si se elimina un sueldo antes del cierre, se elimina tambien su movimiento de cuenta.
- Si se anula una transferencia, se anula tambien su movimiento de cuenta.
- Administrador puede ver `Cuentas corrientes` como pantalla solo lectura de saldos y movimientos, incluyendo usuario que ejecuto cada movimiento.

## Clientes

- Administrador y cajero pueden agregar y editar clientes.
- Clientes se pueden enviar a papelera.
- Datos: nombre, documento, telefono, email, direccion, nacimiento, local, categoria, notas y estado.
- Clientes se usan en regalos y transferencias.

## Papelera

- Existe para personal y clientes.
- Permite restaurar o eliminar definitivamente.
- La eliminacion definitiva requiere confirmacion y auditoria.

## Auditoria

- Todo objeto creado, editado, anulado, enviado a papelera, restaurado o eliminado debe quedar registrado en auditoria.
- Cada evento registra fecha/hora, id de usuario, nombre de usuario al momento de la accion, accion, entidad, id de entidad, valor anterior, valor nuevo y motivo.
- Auditoria se usa para cambios sensibles, anulaciones, cierres, liquidaciones y papelera.

## Estado al cierre del 2026-06-26

- Proyecto en prueba local, sin publicacion nueva.
- Build local validado con `pnpm run build`.
- Servidor local validado en `http://localhost:5173/`.
- Contadores usan guardado manual con boton `Guardar contadores`.
- En cierre de caja, los selectores de retiro final quedan deshabilitados y en gris con `Sin retiros finales` cuando el monto es `0`.
- Queda pendiente reimplementar Supabase/Auth real y storage real de comprobantes/imagenes en una etapa posterior.
- Para retomar, revisar tambien `docs/RETOMAR_MANANA.md`.

## Validacion habitual

Antes de cerrar un cambio:

1. Ejecutar `pnpm run build`.
2. Verificar que `http://localhost:5173/` responda.
3. Probar el flujo afectado con usuario correspondiente.
4. Actualizar este documento si cambian reglas, pantallas, campos o calculos.
