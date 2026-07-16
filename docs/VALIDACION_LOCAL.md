# Poseidon - Validacion local

Ultima actualizacion: 2026-07-16

Este documento define la validacion tecnica y funcional minima. No reemplaza las pruebas especificas de cada modulo.

## Validacion automatica

Con el runtime del proyecto disponible:

```bash
pnpm run check:agents
pnpm run check:workstreams
pnpm run check:skills
pnpm run check:design
pnpm run check
pnpm run build
pnpm run check:commit
```

`pnpm run check` ejecuta, en orden:

1. Validacion de 28 controles de agentes Codex.
2. Validacion de cuatro skills y sus contratos.
3. Validacion de 38 controles de gobierno visual, pilotos, referencias, tablas accesibles y pesos tipograficos funcionales.
4. TypeScript sin emitir archivos.
5. ESLint sobre `src/`, `e2e/` y `scripts/`, sin aceptar advertencias.
6. Vitest sobre `src/` y `scripts/`.

`check:agents`, `check:workstreams`, `check:skills` y `check:design` pueden ejecutarse por separado para su infraestructura. `check:commit` selecciona el control proporcional a las rutas preparadas y es la entrada obligatoria antes de un commit.

## Entorno y servidor

```text
iniciar-poseidon.bat --check
```

`--check` valida Node, Vite y si el puerto 5173 esta libre u ocupado sin iniciar otro servidor. Si esta libre, iniciar con `iniciar-poseidon.bat`. Si esta ocupado, comprobar smoke y navegador antes de asumir que el proceso corresponde a Poseidon. Para liberar el puerto usar `detener-poseidon.bat`.

Con `iniciar-poseidon.bat` activo:

```bash
pnpm run smoke:localhost
pnpm run test:e2e
```

El smoke HTTP exige respuesta `200`, nodo `#root` y titulo de Poseidon en `http://127.0.0.1:5173/`.

La suite Playwright usa un perfil aislado de Chrome. Antes de cada caso limpia la clave local de Poseidon y la sesion de pestaña, y carga el dataset demo. Los casos cubren apertura, tres lecturas, cierre y persistencia; diferencias/auditoria; rutas, permisos y funcion activa; conflicto entre pestañas; y cierre salarial con revision correctiva. Las trazas y capturas se conservan solo cuando falla.

## Smoke de interfaz por rol

### Cajero

1. Entrar como `Cajero 1`.
2. Sin caja abierta, verificar que solo se pueda abrir caja, consultar clientes y ver resumen de cajas.
3. Intentar una pantalla que requiera caja debe mostrar `Necesita abrir una nueva caja para poder operar.`.
4. Con caja abierta, verificar contadores, gastos, transferencias, regalos, salarios, aportes/retiros y cierre.

### Encargado

1. Entrar como `Encargado` y confirmar `Funcion: Encargado`.
2. Ver diferencias, cuentas de efectivo/banco y totales mensuales.
3. Abrir `Cierres y reportes`: debe mostrar Resumen de cajas, Cierre periodico y Reportes; no apertura/cierre operativo.
4. Abrir Resumen de cajas y comprobar tabla ordenable y detalle de recaudacion.
5. En Liquidacion de salarios, abrir una foto cerrada y verificar bloqueo del periodo y flujo correctivo.
6. Usar `Trabajar como cajero` solo para operaciones de caja; el usuario real debe seguir siendo Encargado.

### Administrador

1. Entrar como `Administrador` y confirmar grupos Inicio, Control, Cierres, Gestion, Personas y Sistema.
2. Abrir Locales, Maquinas y Taller.
3. Abrir el editor flotante de un local y de una maquina sin guardar cambios.
4. Verificar Datos locales, Auditoria y Resumen de cajas.
5. Usar `Trabajar como cajero` solo para operaciones de caja; el usuario real debe seguir siendo Administrador.

## Criterio visual

- Verificar escritorio 1920 x 1080 y un viewport movil menor a 720 px cuando cambie CSS o layout.
- No debe haber superposiciones, texto fuera de controles ni scroll horizontal innecesario.
- Todas las columnas visibles de datos deben ordenar; Acciones queda exceptuada.

## Evidencia vigente al 2026-07-16

- 29 archivos de pruebas y 155 casos aprobados, incluidos contratos de agentes, chats permanentes, skills, control previo al commit, gobierno visual, disponibilidad y reconciliacion de efectivo, ciclo financiero, cierres salariales, rutas/sesion, diferencias, finitud, migracion incremental, snapshot, referencias y conflictos de escritura.
- 10 casos E2E en 5 archivos aprobados para caja, efectivo negativo con aporte real, desconciliacion caja/libro, diferencias/auditoria, navegacion de roles, accesibilidad, conflicto entre pestañas y cierre salarial correctivo R1.
- `check:skills` aprobado para cuatro skills y `check:commit` aprobado con seleccion automatica de `check` y `build`.
- `check:design` aprobado con 38 controles, estado accesible de ordenamiento, limite automatico de peso funcional y dos referencias visuales reproducibles.
- TypeScript aprobado.
- ESLint aprobado con cero advertencias.
- Build de produccion aprobado.
- Smoke HTTP aprobado.
- Browser: Administrador > Locales > Editar local aprobado.
- Browser: `/panel` -> `/locales`, recarga y Atrás/Adelante aprobados sin errores de consola.
- Browser: Encargado > Cierres y reportes > Resumen de cajas aprobado.
- Browser: Cajero sin caja > aviso, Clientes, Resumen y Abrir caja aprobado.
- Cierre desconciliado: aviso con caja/libro/delta visible, aporte ordinario ausente y cierre deshabilitado; QA visual aprobada en 1280 x 720 y 390 x 844 sin overflow horizontal.
- Viewports 1920 x 1080 y 390 x 844 sin overflow horizontal en panel administrativo.
- CSS final mantuvo el mismo hash de salida tras separarlo por capas.

## Cobertura pendiente

Los flujos criticos de cajero, diferencias/auditoria, cierre salarial y navegacion por los tres roles tienen E2E. Los demas formularios administrativos todavia se validan con pruebas de integracion y smoke manual por rol.
