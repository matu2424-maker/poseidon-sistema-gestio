# Poseidon - Validacion local

Ultima actualizacion: 2026-07-10

Este documento define la validacion tecnica y funcional minima. No reemplaza las pruebas especificas de cada modulo.

## Validacion automatica

Con el runtime del proyecto disponible:

```bash
pnpm run check
pnpm run build
```

`pnpm run check` ejecuta, en orden:

1. TypeScript sin emitir archivos.
2. ESLint sobre `src/`, sin aceptar advertencias.
3. Vitest.

Con `iniciar-poseidon.bat` activo:

```bash
pnpm run smoke:localhost
```

El smoke HTTP exige respuesta `200`, nodo `#root` y titulo de Poseidon en `http://127.0.0.1:5173/`.

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
5. Usar `Trabajar como cajero` solo para operaciones de caja; el usuario real debe seguir siendo Encargado.

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

## Evidencia del bloque 2026-07-10

- 14 archivos de pruebas y 41 casos aprobados.
- TypeScript aprobado.
- ESLint aprobado con cero advertencias.
- Build de produccion aprobado.
- Smoke HTTP aprobado.
- Browser: Administrador > Locales > Editar local aprobado.
- Browser: Encargado > Cierres y reportes > Resumen de cajas aprobado.
- Browser: Cajero sin caja > aviso, Clientes, Resumen y Abrir caja aprobado.
- Viewports 1920 x 1080 y 390 x 844 sin overflow horizontal en panel administrativo.
- CSS final mantuvo el mismo hash de salida tras separarlo por capas.

## Limite conocido

El smoke por rol se valida actualmente en navegador durante el bloque de trabajo; todavia no existe una suite E2E Playwright dentro del repositorio. Incorporarla conviene cuando el flujo de datos deje `localStorage` o cuando las rutas sean estables.
