# Reporte de Calidad Poseidon

- ID: `2026-07-26-CAL-01`
- Orden relacionada: `docs/coordinacion/ORDEN_2026-07-26_CAL_01.md`
- Commit probado: `a99953bd07690aa12a9db5087cdd8e3fd349e9fc`
- Rama/worktree: `codex/calidad-pruebas`, `C:/Users/Mathias/.codex/worktrees/calidad/New project codex`
- Fecha: 2026-07-26
- Alcance: Locales, Maquinas/Taller/Desuso, Personal, Clientes y Papelera
- Roles y funcion activa: Administrador/Administrador
- Entorno y viewport: Node `24.14.0`, pnpm `11.9.0`, Playwright `1.61.1`, Chrome aislado headless, `1280x720`

## Proveniencia

- La orden versionada declara como base `a42df35de40c0005a13a6f9dcb80d27bfd86d588`.
- La instruccion operativa recibida fijo `a99953bd07690aa12a9db5087cdd8e3fd349e9fc`.
- Git confirmo que `a42df35...` es ancestro directo de `a99953b...`; este ultimo contiene la asignacion documental de CAL-01 y fue la base efectiva probada.
- Para la repeticion final se detuvo temporalmente el servidor concurrente del checkout principal, se levanto `127.0.0.1:5173` desde el worktree de Calidad con el script oficial y luego se restauro el servidor original.

## Resultado

- Clasificacion global: `FALLO_CONFIRMADO`
- Resumen: siete recorridos nuevos completan normalmente y tres conservan la expectativa funcional deseada como fallo esperado de Playwright. La suite sale con codigo `0`, pero los tres `x` no equivalen a criterios satisfechos.
- Cobertura conforme:
  - Local: alta, ordenamiento, ubicacion de fila, edicion, cambio de estado, cierre, recarga y auditoria.
  - Maquina: edicion en el mismo local, recarga y auditoria.
  - Personal: alta con obligatorios, edicion, baja, papelera, restauracion, recarga y auditoria.
  - Cliente: alta con documento, edicion, papelera, restauracion, recarga y auditoria.
  - Cliente referenciado: bloqueo de eliminacion con regalo y transferencia.
  - Papelera: eliminacion definitiva y auditada de cliente sin operaciones.
  - Personal referenciado: bloqueo de eliminacion por historial salarial.

## Hallazgo 1 - Taller invalida el snapshot

- Clasificacion: `FALLO_CONFIRMADO`
- Regla o criterio esperado: una maquina nace en Taller; puede asignarse, editarse, volver a Taller, pasar a Desuso y quedar bloqueada para eliminar si tiene recaudaciones.
- Comportamiento observado: crear una maquina o mover una existente a Taller abre `Guardado local interrumpido`. La validacion informa `Referencia taller inexistente en locals`.
- Pasos de reproduccion:
  1. Reiniciar datos con `resetPoseidon` e ingresar como `user-admin`.
  2. Crear una maquina desde `/maquinas`, o editar `Poseidon Azul` y usar `Enviar al taller`.
  3. Aceptar la confirmacion.
- Evidencia:
  - Alta: `audit[0].localIds[0]: Referencia taller inexistente en locals.`
  - Retorno: `audit[0].localIds[1]: Referencia taller inexistente en locals.`
  - Casos E2E marcados `test.fail`: alta/ciclo completo y bloqueo de maquina con recaudaciones.
- Impacto: quedan bloqueados por UI el alta en Taller, asignacion posterior, retorno, Desuso y la comprobacion final del bloqueo por recaudaciones. La edicion de una maquina dentro de Poseidon si persiste.

## Hallazgo 2 - Quitar local invalida su auditoria

- Clasificacion: `FALLO_CONFIRMADO`
- Regla o criterio esperado: un local sin referencias puede quitarse y la baja queda auditada.
- Comportamiento observado: el comando quita el local en memoria, pero el guardado estricto rechaza la auditoria porque `localIds` conserva el ID ya ausente de `locals`.
- Pasos de reproduccion:
  1. Crear `Local E2E Eliminable` con ID `92`.
  2. Editarlo y usar `Quitar local`.
  3. Aceptar la confirmacion.
- Evidencia: `audit[1].localIds[0]: Referencia 92 inexistente en locals.`
- Impacto: la baja definitiva permitida de locales no persiste. Alta, edicion y cierre del mismo tipo de local si aprobaron.

## Hallazgo 3 - Personal nunca alcanza eliminacion permitida

- Clasificacion: `DUDA_DE_PRODUCTO`
- Regla o criterio esperado: Papelera debe cubrir eliminacion definitiva permitida y bloqueada para personal.
- Comportamiento observado: toda alta de personal por UI crea un historial salarial inicial. La regla vigente considera cualquier historial salarial una referencia y responde `No se puede eliminar definitivamente: conserva 1 historial salarial`.
- Impacto: no existe un recorrido publico para crear personal eliminable. El bloqueo es coherente con la regla modular, pero contradice el criterio de aceptacion que pide tambien un caso permitido.

## Recomendacion para Central

- Cambio sugerido:
  - excluir el identificador virtual `taller` de las referencias de local validadas en auditoria, o modelarlo con un contrato explicito que la validacion reconozca;
  - definir como se conserva el alcance historico de una auditoria cuando la entidad local ya fue quitada;
  - resolver si el historial salarial inicial debe impedir para siempre la eliminacion de personal sin operaciones.
- Alternativas:
  - conservar tombstones de locales eliminados;
  - permitir referencias historicas congeladas que ya no tengan maestro vigente;
  - retirar de la aceptacion la eliminacion permitida de personal si todo historial inicial debe conservarse.
- Riesgo de no actuar: operaciones administrativas aparentemente permitidas terminan en bloqueo global de escritura y no completan el ciclo solicitado para la siguiente beta.
- Modulos y contratos relacionados: `application/machines`, `application/locations`, auditoria, validacion profunda de snapshot, modulo 09 y modulo 10.
- Pruebas que deberian agregarse: al corregir producto, retirar `test.fail` de los tres casos; un pase inesperado ya hace fallar esos tests y obliga a revisar la marca.
- Decision que requiere el usuario: politica de eliminacion de personal con historial salarial inicial y estrategia historica para referencias de locales eliminados.

## Validacion

- `pnpm exec eslint` dirigido a los cuatro specs: aprobado.
- Playwright dirigido a los cuatro specs: 10 contabilizados, 7 pases normales y 3 fallos esperados, salida `0`, 51,4 s.
- `pnpm run test:e2e`: 30 contabilizados, 27 pases normales y 3 fallos esperados, salida `0`, 1,4 min.
- `pnpm run check`: agentes, coordinacion, gobierno, skills, diseno, TypeScript y ESLint aprobados; Vitest 42 archivos y 221 casos.
- `pnpm run build`: aprobado; 1812 modulos transformados.
- `pnpm run smoke:localhost`: HTTP `200`, `#root` y titulo de Poseidon aprobados sobre el servidor del worktree de Calidad.
- `pnpm run check:commit`: aprobado sobre el indice final con Node `24.14.0`.
- `git diff --check`: aprobado.
- Pruebas omitidas y motivo: no se uso el perfil operativo de Chrome porque la orden exige datos descartables; no hubo cambio visual que justificara una matriz de viewports.
- Limites de la revision: Playwright certifica el comportamiento reproducible del snapshot aislado, no los datos operativos del usuario. Los tres casos esperados fallan antes de completar sus pasos posteriores.
- Estado Git final: se entrega limpio tras el commit local informado a Central.

## Declaracion

- No se modifico codigo de aplicacion, helpers E2E compartidos ni documentacion canonica.
- No se integro `main`, no se hizo push, publicacion ni despliegue.
- Los fallos esperados preservan la expectativa funcional deseada; no convierten el comportamiento observado en regla aceptada.
- Una sugerencia no se considera autorizacion para implementar.
