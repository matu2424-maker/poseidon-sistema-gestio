# Modulo 00 - Base del sistema

## Alcance

Base tecnica, arranque, usuarios simulados, roles, persistencia local y estructura general.

## Estado actual

- React + Vite + TypeScript.
- `src/App.tsx` concentra estado global, persistencia, acciones y composicion de pantallas.
- `src/features/layout/AppShell.tsx` contiene pantalla inicial, login local, layout lateral, layout de cajero y navegacion base.
- `src/types.ts` contiene tipos principales.
- `src/styles/global.css` contiene estilos globales.
- Persistencia en `localStorage`.
- Login local sin contrasena.
- La demo inicial incluye datos operativos para probar paneles:
  - 3 maquinas activas asignadas a Poseidon;
  - 3 cajas cerradas en julio 2026;
  - 1 caja con diferencia pendiente de efectivo/banco;
  - gastos, transferencias, regalos, pagos de salario, aportes y retiros;
  - movimientos de cuentas corrientes y auditoria demo.

## Usuarios

- Cajero 1.
- Cajero 2.
- Encargado.
- Administrador.

## Roles

- Cajero: opera caja diaria.
- Encargado: revisa, controla y puede trabajar como cajero.
- Administrador: gestiona todo y puede trabajar como cajero.

## Reglas

- El rol real del usuario no se pierde cuando trabaja como cajero.
- La funcion usada se registra en auditoria.
- No hay Auth real todavia.
- No hay backend real todavia.
- El boton `Reiniciar demo` del administrador vuelve a cargar este dataset inicial de prueba.
- Localhost se levanta solo con `iniciar-poseidon.bat` en `http://127.0.0.1:5173/`.
- Si el puerto 5173 queda ocupado, se libera con `detener-poseidon.bat`.
