# Historial de versiones

Este archivo registra cambios incluidos en candidatos y versiones publicadas de Poseidon. La etiqueta Git es la referencia exacta del codigo; este documento explica su contenido.

## [Sin publicar]

- CI actualizado a `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6` y `actions/upload-artifact@v7`, compatibles con el runtime interno Node 24 de GitHub Actions.
- El preflight de release rechaza volver a versiones anteriores de esas cuatro Actions, incluida la carga de evidencia que solo se ejecuta cuando falla un E2E.
- Sin cambios funcionales en la aplicacion.

## [0.1.0-beta.1] - 2026-07-24

Estado: candidato sincronizado con GitHub el 2026-07-24; todavia no desplegado.

Referencias: `main`, `release/test` y `v0.1.0-beta.1` quedaron publicados sobre el commit `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`.

### Incluye

- Base funcional de Cajero, Encargado y Administrador.
- Caja, contadores, movimientos, tesoreria, cuentas corrientes, salarios, maestros, cierres y auditoria.
- Snapshot local esquema 5 con validacion profunda, respaldo, importacion y control de conflictos.
- Preparacion reproducible de Node, pnpm, CI, Vercel y Playwright para la primera fase de prueba online.

### Limites

- Persistencia exclusiva en `localStorage`.
- Login local sin autenticacion real.
- Sin archivos remotos, backend multiusuario ni despliegue activo.
