# Poseidon - Validacion local

Ultima actualizacion: 2026-07-11

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
pnpm run test:e2e
```

El smoke HTTP exige respuesta `200`, nodo `#root` y titulo de Poseidon en `http://127.0.0.1:5173/`.

La suite Playwright usa un perfil aislado de Chrome. Antes de cada caso elimina solamente la clave local de Poseidon, carga el dataset demo y prueba apertura, tres lecturas, cierre sin diferencias y persistencia despues de recargar. Las trazas y capturas se conservan solo cuando falla.

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

- 17 archivos de pruebas y 51 casos aprobados, incluido ciclo financiero transversal y migracion de transferencias.
- TypeScript aprobado.
- ESLint aprobado con cero advertencias.
- Build de produccion aprobado.
- Smoke HTTP aprobado.
- Browser: Administrador > Locales > Editar local aprobado.
- Browser: Encargado > Cierres y reportes > Resumen de cajas aprobado.
- Browser: Cajero sin caja > aviso, Clientes, Resumen y Abrir caja aprobado.
- Viewports 1920 x 1080 y 390 x 844 sin overflow horizontal en panel administrativo.
- CSS final mantuvo el mismo hash de salida tras separarlo por capas.

## Cobertura pendiente

El flujo critico de cajero ya tiene E2E. Los formularios administrativos y los flujos completos de encargado todavia se validan con pruebas de integracion y smoke manual por rol.
