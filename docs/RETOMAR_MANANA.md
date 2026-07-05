# Poseidon - Retomar trabajo

Fecha de cierre: 2026-07-05

## Antes de tocar codigo

1. Leer `AGENTS.md`.
2. Leer `docs/CONTEXTO_RAPIDO_CODEX.md`.
3. Leer `docs/REGLAS_GENERALES.md`.
4. Leer `docs/POSEIDON_FUNCIONAMIENTO.md`.
5. Leer `docs/MAPA_TECNICO.md`.
6. Leer el documento correspondiente en `docs/modulos/`.
7. Revisar este archivo.
8. Correr `git status --short` para ver cambios pendientes.

## Estado actual

- App React + Vite + TypeScript.
- Persistencia actual en `localStorage`, clave `poseidon-sistema-gestion-v2`.
- La demo inicial contiene datos operativos para probar: 3 maquinas activas, 3 cajas cerradas de julio 2026, una diferencia pendiente, gastos, salarios, regalos, transferencias, aportes/retiros, cuentas corrientes y auditoria.
- No hay Supabase/Auth real activo. Login de prueba local.
- No hay storage real de archivos: comprobantes e imagenes guardan metadatos para evitar romper `localStorage`.
- No publicar en Vercel hasta que el usuario lo pida explicitamente.
- Localhost se levanta solo con `iniciar-poseidon.bat`; si queda ocupado, usar `detener-poseidon.bat`.

## Usuarios de prueba

El login local de prueba no pide contrasena. Se selecciona un usuario activo desde una lista.

| Usuario | Rol |
| --- | --- |
| `admin` | Administrador |
| `cajero1` | Cajero |
| `cajero2` | Cajero |
| `encargado` | Encargado |

El login queda precargado con `cajero1` para probar rapido el panel del cajero.

## Comandos

Camino oficial para levantar localhost:

```text
iniciar-poseidon.bat
```

URL local habitual:

```text
http://127.0.0.1:5173/
```

Verificar entorno sin iniciar servidor:

```text
iniciar-poseidon.bat --check
```

Liberar puerto si queda ocupado:

```text
detener-poseidon.bat
```

No usar Python, `pnpm preview` ni alternativas para levantar la app durante el trabajo diario.

Validacion:

```bash
pnpm run build
```

## Archivos principales

- `src/App.tsx`: estado, datos, pantallas y reglas principales.
- `src/types.ts`: tipos principales del sistema extraidos desde `App.tsx`.
- `src/styles/global.css`: estilos globales.
- `src/components/WelcomeScreen.tsx`: componente heredado/no conectado al flujo actual.
- `docs/POSEIDON_FUNCIONAMIENTO.md`: reglas funcionales vivas.
- `docs/MAPA_TECNICO.md`: mapa tecnico de pantallas, clases, calculos y deuda tecnica.
- `docs/CONTEXTO_RAPIDO_CODEX.md`: resumen corto para cargar contexto con poco costo.
- `docs/REGLAS_GENERALES.md`: reglas globales funcionales, contables y esteticas.
- `docs/modulos/`: detalle por panel y funcion.
- `AGENTS.md`: reglas de trabajo para Codex.
- `README.md`: instrucciones generales del proyecto.

## Modulos ya trabajados

- Login local y roles.
- Panel administrador.
- Locales con tabla, editor, maquinas asociadas, historial y cierre de local.
- Maquinas con taller, desuso, reset, historial y auditoria.
- Panel cajero sin barra lateral.
- Apertura de caja con saldos iniciales de efectivo/banco.
- Contadores con guardado manual y validacion visual de errores.
- Gastos, transferencias, regalos, salarios y clientes desde cajero.
- Retiros y aportes de capital.
- Cierre de caja con resultado economico separado de movimientos financieros.
- Cuentas corrientes internas para local efectivo, local banco, personal y transferencias.
- Resumen de cajas actualizado para mostrar diferencia de efectivo, diferencia de banco y gestion de diferencias.
- Panel del encargado rearmado como tablero de control: primera fila con diferencias, cuenta efectivo y cuenta banco; segunda fila con ingreso total del mes, salida total del mes y resultado neto del mes; accesos rapidos a diferencias, cuentas corrientes, control de gastos, salarios y resumen de cajas.
- El boton `Reiniciar demo` del administrador recarga el dataset demo inicial con datos para probar el panel del encargado.
- Encargado y administrador pueden cambiar funcion activa a cajero y operar el panel de cajero existente con su mismo usuario real.
- Apertura y cierre de caja registran usuario real y funcion usada, para saber quien actuo como cajero en cada recaudacion.
- Barra lateral agrupada por funcion para administrador y encargado; ninguno muestra caja operativa directa. Para operar caja cambian a funcion cajero.
- Grupos de barra lateral desplegables, con apertura automatica del grupo activo.
- Control de gastos para encargado con detalle completo, revision, observacion y anulacion auditada.
- Encargado tiene acceso a Cuentas corrientes para ver empleados, transferencias y cuentas por local en efectivo/banco.
- En `Cuentas corrientes` no se repite el titulo dentro del contenido; la barra superior ya muestra la pantalla.
- En `Cuentas corrientes`, encargado ve solo datos de sus locales asignados. La pantalla abre en mes actual y permite mes anterior o consulta historica con rango manual.
- La tabla de `Cuentas corrientes` muestra fecha, tipo, detalle, usuario, debito, credito y saldo corrido; clic en un movimiento abre detalle y acceso a la recaudacion asociada.
- Las cuentas personales se quitaron de `Cuentas corrientes` y se muestran en `Liquidacion de salarios` como cuenta corriente del personal.
- Cierre periodico para encargado/admin: semanal, quincenal, mensual o entre fechas, con guardado auditado de totales y cajas incluidas.
- Encargado puede acceder a personal, clientes y liquidacion simple de salarios.
- Auditoria general.

## Reglas delicadas

- Criterio visual estable: disenar para 1080p, botones alineados y consistentes, acciones al borde inferior/derecho dentro de tarjetas, tablas compactas y no repetir arriba/abajo datos que ya muestra la barra superior. En pantallas del encargado, los recuadros de resumen siguen estetica tipo `Datos de caja` y los accesos rapidos mantienen mismo ancho/altura.
- Pantallas administrativas: evitar repetir dentro del cuerpo el mismo titulo que ya aparece en la barra superior. Personal, Clientes, Usuarios, Locales, Maquinas, Taller, Categorias de gastos, Diferencias, Cierre periodico y Liquidacion de salarios usan el encabezado interno solo para descripcion/contadores/acciones.
- Personal: alta/edicion muestra nota de campos obligatorios y marca con `*` nombre, apellido, cargo, local, estado, tipo salario y salario base. Cargo es lista cerrada: `Cajera/o`, `Encargado/a`, `Mantenimiento`, `Limpieza`.
- Personal registra historial salarial cuando cambia tipo de salario o salario base: fecha efectiva, valor anterior, valor nuevo, usuario y motivo.
- Liquidacion de salarios quedo redisenada: selector de periodo tipo Cuentas corrientes, resumen global de pendientes/total salarios/total salarios base/extras, tabla principal por empleado con boton `Detalle`, cierre de liquidacion e historial de cierres.
- Regla economica de salarios: cada empleado activo inicia el periodo con salario base desde su ficha/historial. Una liquidacion con concepto `Salario` es pago realizado contra pendiente, no reemplaza la base. Total = base + extras + horas extras + bonos - descuentos. Liquidado = salario pagado + adelantos + extras + bonos - descuentos. Pendiente = base - salario pagado - adelantos - descuentos.
- Validacion de salarios: salario pagado no puede superar salario base y salario pagado + adelantos tampoco puede superar salario base. Se aplica tanto en cajero como en encargado/admin.
- En la tabla de liquidacion por empleado el orden final es: nombre, salario base, extras, bonos, descuentos, total, adelantos, salario pagado, pendiente y accion. Debajo del nombre se ve si no hay liquidacion cargada o cuantas liquidaciones activas tiene el empleado.
- La cuenta corriente del personal ya no aparece en la pantalla general de liquidacion; se consulta dentro del detalle de cada empleado.
- El boton global `Agregar` se quito de la pantalla general. Las liquidaciones se agregan desde `Detalle` de cada empleado con mes, personal fijo, concepto, monto y notas.
- En `Detalle`, la tabla `Liquidaciones del periodo` es ordenable por mes, concepto, importes y estado.
- Cajero y encargado/admin usan la misma lista de conceptos de salario: Adelanto, Salario, Extra, Aguinaldo, Salario vacacional, Horas extras y Descuento. `Sueldo` y `Ajuste` quedan solo como datos heredados; `Ajuste` se normaliza como Extra.
- El pago de salario es a mes vencido: el periodo trabajado define la liquidacion, aunque el pago se realice del 1 al 10 del mes siguiente.
- El impacto de conceptos esta centralizado: salario, adelanto y descuento descuentan pendiente; adelanto no suma al total; descuento no genera salida de caja; salario y adelanto siguen contando como salida de efectivo si fueron cargados desde caja.
- En detalle de liquidacion por empleado, `Eliminar` cambia la liquidacion a `ANULADA`; internamente es baja logica auditada para no borrar historial ni impactar totales.
- Cada liquidacion guarda origen (`CAJA` o `LIQUIDACION`), creador, aprobador, fecha de aprobacion y, si aplica, anulador/fecha de anulacion.
- Los movimientos de cuenta de salarios usan el usuario real que hizo la accion; el uso de `system` queda solo como fallback para datos migrados.
- En el detalle del empleado, la cuenta corriente muestra fecha, concepto, monto, total, pendiente y usuario; todas esas columnas son ordenables. `Total` y `Pendiente` son los valores al momento de registrar ese movimiento.
- La cuenta corriente del detalle usa el periodo trabajado de la liquidacion; una liquidacion cargada hoy para mes anterior se muestra en el mes anterior.
- El detalle del empleado usa resumen compacto, no tarjetas grandes, para ocupar menos espacio vertical.
- Los indicadores de orden de tablas usan texto ASCII (`asc` / `desc`) para evitar errores de codificacion en flechas.
- Resultado final de cierre es economico: resultado de maquinas - gastos - salarios - regalos.
- Transferencias, aportes, retiros, efectivo inicial y banco inicial son movimientos financieros o de caja, no cambian el resultado economico.
- Las diferencias de efectivo/banco no impactan automaticamente la caja ni el resultado economico; quedan pendientes y deben ser gestionadas por encargado/admin con observacion obligatoria.
- Acciones del encargado sobre diferencias: revisada/resuelta/ajustada/anulada cambian el estado de control de la recaudacion y quedan auditadas; no mueven dinero automaticamente.
- Si el retiro final efectivo o banco es `0`, el selector de quien retira queda gris y dice `Sin retiros finales`.
- IN/OUT actual no puede ser menor al anterior; si falla, la fila queda en rojo.
- Las maquinas con recaudaciones no se eliminan directamente.
- Las maquinas en `DESUSO` solo viven en Taller y no aparecen en Maquinas.
- Personal y clientes pasan por papelera antes de eliminar definitivamente.
- Todo cambio sensible debe quedar auditado con fecha/hora y usuario.
- Auditoria tambien guarda la funcion usada cuando un encargado o administrador opera como cajero.
- Los gastos revisados por encargado tienen estado `PENDIENTE`, `REVISADO` u `OBSERVADO`; anular un gasto no lo borra.
- Cierre periodico es una foto de control del rango seleccionado; si se anula, queda registrado y no borra las cajas.

## Validacion hecha al cierre

- `pnpm run build`: correcto.
- Se debe levantar servidor local antes de probar visualmente.
- URL de prueba preferida: `http://127.0.0.1:5173/`.
- El mapa tecnico quedo actualizado en `docs/MAPA_TECNICO.md`.

## Pendientes naturales

- Seguir trabajando en local hasta que el usuario pida explicitamente publicar.
- Antes de publicar o desplegar cualquier version, avisar al usuario y esperar confirmacion.
- Refactor pendiente despues de estabilizar/publicar la demo:
  - `components/cashier/OpenCash.tsx`
  - `components/cashier/ClosedBalanceSummary.tsx`
  - `components/cashier/Counters.tsx`
  - `components/admin/Clients.tsx`
  - `lib/totals.ts`
  - `lib/storage.ts`
- Seguir refinando cierre de caja con datos reales de prueba.
- Revisar reportes/exportacion cuando el flujo de caja quede estable.
- Reimplementar Supabase/Auth real cuando el modelo local este confirmado.
- Implementar storage real para comprobantes e imagenes cuando se reactive Supabase u otro proveedor.
