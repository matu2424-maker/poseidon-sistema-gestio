# Historial de versiones

Este archivo registra cambios incluidos en candidatos y versiones publicadas de Poseidon. La etiqueta Git es la referencia exacta del codigo; este documento explica su contenido.

## [Sin publicar]

- CI actualizado a `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6` y `actions/upload-artifact@v7`, compatibles con el runtime interno Node 24 de GitHub Actions.
- El preflight de release rechaza volver a versiones anteriores de esas cuatro Actions, incluida la carga de evidencia que solo se ejecuta cuando falla un E2E.
- Vercel deja de desplegar automaticamente los cambios diarios de `main`; la entrega online queda reservada para `release/test`.
- La beta `0.1.0-beta.1` fue publicada explicitamente desde `release/test` en el dominio demo de Vercel.
- Se eliminaron del proyecto Vercel las 16 variables historicas de PostgreSQL/Supabase que el frontend vigente no consume.
- La beta fue redesplegada desde el mismo commit congelado con la configuracion limpia, sin usar cache de compilacion.
- Sin cambios funcionales en la aplicacion.

## [0.1.0-beta.1] - 2026-07-24

Estado: beta demo publicada en Vercel el 2026-07-24.

Referencias: `release/test` y `v0.1.0-beta.1` permanecen congelados sobre el commit `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`; `main` contiene controles y documentacion posteriores sin cambios funcionales.

### Incluye

- Base funcional de Cajero, Encargado y Administrador.
- Caja, contadores, movimientos, tesoreria, cuentas corrientes, salarios, maestros, cierres y auditoria.
- Snapshot local esquema 5 con validacion profunda, respaldo, importacion y control de conflictos.
- Preparacion reproducible de Node, pnpm, CI, Vercel y Playwright para la primera fase de prueba online.

### Limites

- Persistencia exclusiva en `localStorage`.
- Login local sin autenticacion real.
- Sin archivos remotos ni backend multiusuario; el despliegue activo es exclusivamente una demo publica.
