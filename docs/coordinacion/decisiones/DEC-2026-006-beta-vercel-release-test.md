# DEC-2026-006 - Beta Vercel controlada desde release test

Fecha: 2026-07-24

Estado: APPROVED

## Contexto

Poseidon necesita una beta online reversible mientras el desarrollo continua en `main`. La aplicacion todavia usa `localStorage`, no posee autenticacion real ni backend compartido y el proyecto Vercel existente pertenece al plan Hobby.

## Decision

- Vercel usa `release/test` como rama de produccion.
- `main` no genera despliegues automaticos.
- Cada candidato queda congelado en una etiqueta `v0.1.0-beta.N` y en `release/test`.
- La publicacion es una promocion explicita autorizada, no una consecuencia de cada push.
- El dominio Hobby es publico y se usa exclusivamente con datos demo.
- Chrome local en `127.0.0.1` conserva la fuente canonica de datos operativos durante esta etapa.
- Cada publicacion registra version, commit, despliegue, rutas, roles y punto de rollback.

## Primera aplicacion

- Version: `0.1.0-beta.1`.
- Commit: `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`.
- Despliegue: `Cm9tbKqvERgd6bZEYbBZVTzWFHDC`.
- URL: `https://poseidon-sistema-gestio.vercel.app`.
- Rollback disponible: `FidTosTcMj6duffH3egjpu6dtk9W`, commit `e4f0b4d2ff5649c45f77e7fffb8076215a872b6c`.

## Consecuencias

- La beta online y localhost no comparten datos.
- No se cargan datos reales hasta implementar Auth, base y storage remotos.
- Una correccion crea un candidato nuevo; no mueve la etiqueta publicada.
- Las variables historicas sin uso de Vercel requieren autorizacion separada antes de eliminarlas.
- El rollback del frontend no revierte ni combina snapshots de `localStorage`.
