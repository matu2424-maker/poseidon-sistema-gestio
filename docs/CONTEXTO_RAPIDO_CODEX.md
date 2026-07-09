# Poseidon - Contexto rapido para Codex

Ultima actualizacion: 2026-07-08

Leer este archivo primero al retomar. Despues abrir solo el documento del modulo que se va a tocar.

## Que es Poseidon

Poseidon Sistema de Gestion es una app web administrativa para caja diaria, maquinas, recaudaciones, gastos, transferencias, regalos, salarios, clientes, locales, auditoria y cuentas corrientes.

## Estado actual

- App local React + Vite + TypeScript.
- Persistencia en `localStorage`, clave `poseidon-sistema-gestion-v2`.
- Login local por seleccion de usuario, sin contrasena.
- Supabase/Auth/Storage real quedan pendientes.
- No publicar ni desplegar sin confirmacion explicita del usuario.
- Modularizacion iniciada: `src/lib/money.ts`, `src/lib/dates.ts`, `src/lib/currentAccounts.ts`, `src/lib/accountMovements.ts`, `src/lib/cashTotals.ts`, `src/lib/differences.ts` y `src/lib/salaryRules.ts` ya contienen reglas compartidas. La mayor parte de pantallas y acciones de UI siguen en `src/App.tsx`.

## Usuarios de prueba

- `cajero1`: Cajero.
- `cajero2`: Cajero.
- `encargado`: Encargado.
- `admin`: Administrador.

## Archivos que conviene abrir primero

1. `AGENTS.md`
2. `docs/CONTEXTO_RAPIDO_CODEX.md`
3. `docs/REGLAS_GENERALES.md`
4. `docs/MAPA_TECNICO.md`
5. `docs/REGLAS_CONTABLES.md` si cambia caja, cuentas, diferencias, salarios o movimientos.
6. `docs/REGLAS_VISUALES.md` si cambia interfaz.
7. `docs/MODULARIZACION_REFERENCIAS.md` si se va a mover codigo entre archivos.
8. El contexto corto de `docs/contextos/` que corresponda.
9. El archivo del modulo dentro de `docs/modulos/` que corresponda.

## Reglas intocables

- Resultado economico = resultado de maquinas - gastos - salarios - regalos.
- Transferencias, aportes, retiros, efectivo inicial y banco inicial son movimientos financieros o de caja; no cambian el resultado economico.
- Las diferencias de efectivo/banco no cambian resultado economico, pero si mueven la cuenta corriente del local para que la proxima caja abra con el saldo real declarado.
- Encargado/admin gestionan diferencias como pendiente, verificada, corregida o anulada; anular revierte los movimientos de cuenta de la diferencia.
- Todo cambio sensible debe quedar auditado con fecha/hora, usuario, rol real y funcion usada.
- No borrar historial operativo: anular, desactivar, enviar a papelera o ajustar con auditoria.
- El sistema debe mantenerse preparado para multi-local aunque hoy el local principal sea Poseidon.
- Cada modificacion debe actualizar la documentacion correspondiente antes de cerrar el trabajo.
- En salarios, la liquidacion se asocia al periodo trabajado: el salario de un mes puede pagarse del 1 al 10 del mes siguiente, pero sigue asociado al mes trabajado.
- En pagos de salario desde cajero, los nuevos registros solo permiten `SALARIO` y `ADELANTO`; el campo `Periodo trabajado` es obligatorio.
- La caja descuenta salarios por `balanceId`, pero la liquidacion/cuenta personal los muestra por `period`.
- `Liquidacion de salarios` abre con periodo sugerido: dia 1 al 10 mes anterior, desde dia 11 mes actual; el usuario puede cambiarlo con selector mes/ano.
- En liquidacion de salarios, salario pagado no puede superar salario base; salario pagado + adelantos tampoco puede superar salario base; salario pagado + adelantos + descuentos tampoco puede superar salario base.
- En salarios, `Liquidado` fue reemplazado visualmente por `Pagado / Entregado`: no resta descuentos porque descuento no es dinero entregado. `Cubierto base` = salario pagado + adelantos + descuentos.
- `EXTRA` queda como codigo tecnico interno; en interfaz se muestra `Premio / Gratificacion` para no confundirlo con Regalos de clientes.
- En el detalle del empleado, `Liquidaciones del periodo` y `Cuenta corriente del empleado` son tablas ordenables.

## Donde documentar cambios

- Regla global: `docs/REGLAS_GENERALES.md`.
- Regla contable: `docs/REGLAS_CONTABLES.md`.
- Regla visual: `docs/REGLAS_VISUALES.md`.
- Modularizacion o referencias cruzadas: `docs/MODULARIZACION_REFERENCIAS.md`.
- Regla funcional, flujo, calculo o campo: `docs/POSEIDON_FUNCIONAMIENTO.md`.
- Pantalla o modulo concreto: archivo correspondiente en `docs/modulos/`.
- Estructura tecnica, clases o deuda tecnica: `docs/MAPA_TECNICO.md`.
- Estado para retomar: `docs/RETOMAR_MANANA.md`.
- Ejecucion, validacion o publicacion: `README.md`.

## Documentos por modulo

- `docs/modulos/00_base_sistema.md`
- `docs/modulos/01_panel_cajero.md`
- `docs/modulos/02_caja_diaria.md`
- `docs/modulos/03_contadores.md`
- `docs/modulos/04_movimientos_operativos.md`
- `docs/modulos/05_cierre_caja.md`
- `docs/modulos/06_diferencias_caja.md`
- `docs/modulos/07_panel_encargado.md`
- `docs/modulos/08_panel_administrador.md`
- `docs/modulos/09_locales_maquinas_taller.md`
- `docs/modulos/10_clientes_personal_sueldos.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/modulos/12_auditoria.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/MODULARIZACION_REFERENCIAS.md`

## Contextos cortos para Codex

- `docs/contextos/CODEX_CAJA.md`
- `docs/contextos/CODEX_DIFERENCIAS.md`
- `docs/contextos/CODEX_CUENTAS_CORRIENTES.md`
- `docs/contextos/CODEX_SALARIOS.md`
- `docs/contextos/CODEX_ENCARGADO.md`
- `docs/contextos/CODEX_ADMINISTRACION.md`
- `docs/contextos/CODEX_LOCALES_MAQUINAS.md`
- `docs/contextos/CODEX_CLIENTES_PERSONAL.md`
- `docs/contextos/CODEX_AUDITORIA.md`

## Comandos

Build:

```bash
pnpm run build
```

Servidor local estable en esta maquina:

```text
iniciar-poseidon.bat
```

URL:

```text
http://127.0.0.1:5173/
```

Regla: para levantar localhost usar solo `iniciar-poseidon.bat`. Si el puerto 5173 queda ocupado, usar `detener-poseidon.bat`. No probar Python, `pnpm preview` ni servidores alternativos.
