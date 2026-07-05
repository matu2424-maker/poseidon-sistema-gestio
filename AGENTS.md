# Poseidon Sistema de Gestion - Instrucciones para Codex

## Objetivo

Construir una aplicacion web administrativa para gestionar caja diaria, maquinas tragamonedas, gastos, transferencias, regalos, cierres, reportes y auditoria del local Poseidon.

## Reglas de trabajo

- Trabajar por modulos cerrados y probables.
- Antes de modificar codigo, explicar el plan.
- Despues de modificar codigo, explicar como ejecutar y probar.
- No agregar funcionalidades no solicitadas.
- Priorizar claridad, mantenibilidad y seguridad.
- Mantener preparacion multi-local aunque hoy solo exista Poseidon.
- No borrar historial operativo: desactivar, anular o ajustar con auditoria.
- Mantener actualizado `docs/POSEIDON_FUNCIONAMIENTO.md` cuando cambien reglas, pantallas, campos, flujos o calculos del sistema.
- Mantener actualizado el documento correspondiente en `docs/modulos/` cuando cambie una regla o flujo de un modulo.
- Cada modificacion de codigo debe dejar documentado el cambio donde corresponda antes de cerrar el trabajo: reglas generales, documento funcional vivo, mapa tecnico y/o modulo afectado.
- Al retomar trabajo en otra sesion, leer primero `docs/CONTEXTO_RAPIDO_CODEX.md`, `docs/REGLAS_GENERALES.md`, `docs/RETOMAR_MANANA.md`, `docs/POSEIDON_FUNCIONAMIENTO.md` y `docs/MAPA_TECNICO.md`.
- No publicar en Vercel ni conectar servicios externos salvo pedido explicito del usuario.

## Criterios visuales

- La interfaz debe verse bien en una pantalla 1080p: evitar scroll horizontal innecesario en paneles principales y priorizar grillas compactas.
- Los botones deben quedar bien alineados entre si; en tarjetas, alinear acciones al borde inferior y preferentemente a la derecha.
- Mantener tamanos consistentes de botones dentro de la misma zona de trabajo.
- Evitar repetir el mismo titulo o dato arriba y abajo; si la barra superior ya muestra pantalla/local/usuario/funcion, el contenido no debe duplicarlo.
- Tablas y paneles administrativos deben ser densos, claros y profesionales, con columnas ajustadas para ver la mayor cantidad posible sin perder legibilidad.
- Mantener el diseno simple: tarjetas de radio bajo, colores sobrios, foco en datos y acciones.

## Estado de trabajo

- El sistema esta en etapa de prueba local con persistencia en `localStorage`.
- Supabase/Auth real y storage real de archivos quedan pendientes para una etapa posterior.
- Las validaciones minimas antes de cerrar un cambio son `pnpm run build` y comprobar que `http://127.0.0.1:5173/` responda.
- Para levantar localhost se usa solo `iniciar-poseidon.bat`; si el puerto queda ocupado, usar `detener-poseidon.bat`. No probar Python, `pnpm preview` ni servidores alternativos.

## Roles

- CAJERO: opera caja del dia.
- ENCARGADO: opera y revisa local, confirma retiro/base.
- ADMINISTRADOR: control completo.

## Orden de modulos

0. Base del sistema.
1. Usuarios, roles y locales.
2. Apertura de caja.
3. Contadores de maquinas.
4. Gastos, transferencias y regalos.
5. Cierre de caja.
6. Reportes Excel.
7. Administracion.
8. Auditoria y ajustes.
9. Cierre periodico.
