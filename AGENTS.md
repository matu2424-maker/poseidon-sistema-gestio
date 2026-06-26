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
- Al retomar trabajo en otra sesion, leer primero `docs/RETOMAR_MANANA.md` y `docs/POSEIDON_FUNCIONAMIENTO.md`.
- No publicar en Vercel ni conectar servicios externos salvo pedido explicito del usuario.

## Estado de trabajo

- El sistema esta en etapa de prueba local con persistencia en `localStorage`.
- Supabase/Auth real y storage real de archivos quedan pendientes para una etapa posterior.
- Las validaciones minimas antes de cerrar un cambio son `pnpm run build` y comprobar que `http://localhost:5173/` responda.

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
