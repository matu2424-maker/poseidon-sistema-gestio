# Modulo 00 - Base del sistema

## Alcance

Base tecnica, arranque, usuarios simulados, roles, persistencia local y estructura general.

## Estado actual

- React + Vite + TypeScript.
- `src/App.tsx` conserva estado global, sesion, acciones y composicion de pantallas.
- `src/data/appData.ts` concentra datos demo y limpieza manual; `src/data/normalizeData.ts` normaliza/migra datos locales.
- `src/infrastructure/storage/` valida, versiona, importa y persiste el snapshot local.
- `src/features/layout/AppShell.tsx` contiene pantalla inicial, login local y layouts.
- `src/navigation/screens.ts` es la fuente unica de titulos, menus, roles permitidos y requisito de caja abierta.
- `src/hooks/useNotice.ts` y `src/components/NoticeBanner.tsx` centralizan avisos.
- `src/types.ts` contiene tipos principales.
- `src/styles/global.css` contiene estilos globales.
- Persistencia versionada en `localStorage`.
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
- Encargado/administrador consultan resumen de cajas, pero deben cambiar a funcion Cajero para abrir, cargar o cerrar caja.
- Navegar limpia avisos anteriores; el cierre puede preservar su confirmacion al abrir el resumen.
- No hay Auth real todavia.
- No hay backend real todavia.
- El boton `Reiniciar demo` del administrador vuelve a cargar este dataset inicial de prueba.
- No se borran datos operativos automaticamente al iniciar.
- `Sistema > Datos locales` permite exportar/importar respaldo JSON validado.
- Si el almacenamiento esta corrupto se conserva sin sobrescribir hasta que el usuario descargue respaldo o confirme iniciar datos nuevos.
- Localhost se levanta solo con `iniciar-poseidon.bat` en `http://127.0.0.1:5173/`.
- Si el puerto 5173 queda ocupado, se libera con `detener-poseidon.bat`.
