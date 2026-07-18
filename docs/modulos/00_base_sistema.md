# Modulo 00 - Base del sistema

## Alcance

Base tecnica, arranque, usuarios simulados, roles, persistencia local y estructura general.

## Estado actual

- React + React Router + Vite + TypeScript.
- `src/App.tsx` conserva estado global, sesion, acciones y composicion; la pantalla activa se deriva de la URL.
- `src/data/appData.ts` concentra datos demo y limpieza manual; `src/data/normalizeData.ts` normaliza estructura y `src/data/migrateData.ts` ejecuta migraciones incrementales por version.
- `src/infrastructure/storage/` valida, versiona, importa y persiste el snapshot local.
- El esquema vigente es 5. Un snapshot actual no reconstruye asientos financieros faltantes durante la normalizacion ordinaria.
- `src/features/layout/AppShell.tsx` contiene pantalla inicial, login local y layouts.
- `src/navigation/screens.ts` es la fuente unica de titulos, menus, roles permitidos y requisito de caja abierta.
- Cada pantalla tiene una URL estable documentada en `docs/MAPA_RUTAS.md`; `screenDefinitions` sigue siendo la matriz central.
- `src/infrastructure/session/localSession.ts` conserva durante la pestaña solo usuario y funcion activa, nunca contraseñas.
- `src/hooks/useNotice.ts` y `src/components/NoticeBanner.tsx` centralizan avisos.
- `src/types.ts` contiene tipos principales.
- `src/styles/global.css` es un manifiesto; los estilos se dividen en `base.css`, `layout.css`, `features/` y `responsive.css` conservando el orden de cascada.
- Persistencia versionada en `localStorage`.
- Cada guardado compara la version leida para impedir que una pestaña desactualizada sobrescriba otra.
- Login local sin contrasena.
- La demo inicial incluye datos operativos para probar paneles:
  - 3 maquinas activas asignadas a Poseidon;
  - 3 cajas cerradas en julio 2026;
  - 1 caja con diferencia pendiente de efectivo/banco;
  - gastos, transferencias, regalos, pagos de salario, traspasos Caja/Principal y movimientos de socios;
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
- Encargado/administrador consultan resumen de cajas y operan Principal desde su funcion administrativa.
- Apertura, contadores, movimientos propios de Caja y cierre requieren funcion Cajero.
- Gastos y salarios administrativos usan Principal; los traspasos Caja/Principal y movimientos reales de socios se gestionan desde Cuentas corrientes.
- Navegar limpia avisos anteriores; el cierre puede preservar su confirmacion al abrir el resumen.
- Recargar conserva usuario, funcion activa y modulo; cerrar sesion vuelve a `/ingresar` y limpia la sesion de pestaña.
- No hay Auth real todavia.
- No hay backend real todavia.
- `Sistema > Datos locales` permite al Administrador crear una base operativa limpia con respaldo automatico previo.
- `Sistema > Datos locales` permite al Administrador cargar el escenario demo integral con respaldo automatico previo, reemplazo completo sin mezcla y auditoria de la accion.
- El reinicio conserva los maestros necesarios, pone contadores, adelantos y cuentas en cero, elimina operaciones/cierres del snapshot activo y crea una unica auditoria de inicio limpio.
- La accion es exclusiva de la etapa local de pruebas; no debe existir como borrado de historial en produccion.
- No se borran datos operativos automaticamente al iniciar.
- `Sistema > Datos locales` permite exportar/importar respaldo JSON validado.
- Si el almacenamiento esta corrupto se conserva sin sobrescribir hasta que el usuario descargue respaldo o confirme iniciar datos nuevos.
- Si existe conflicto entre pestañas o falla una escritura, la operacion se bloquea y el intento queda disponible como respaldo antes de reintentar o cargar la ultima version guardada.
- Una pestana pasiva sin cambios propios se sincroniza automaticamente con el ultimo snapshot guardado por otra pestana.
- Modales compartidos encierran el foco, cierran con `Escape` y restauran el foco anterior; avisos y tablas exponen estado accesible.
- Localhost se levanta solo con `iniciar-poseidon.bat` en `http://127.0.0.1:5173/`.
- Si el puerto 5173 queda ocupado, se libera con `detener-poseidon.bat`.
