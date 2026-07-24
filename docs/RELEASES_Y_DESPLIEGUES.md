# Poseidon - Versiones, despliegues y rollback

Ultima actualizacion: 2026-07-24

Estado: beta `0.1.0-beta.1` sincronizada con GitHub. No existe proyecto Vercel vinculado, despliegue ni backend remoto activo.

## Objetivo

Permitir que Poseidon siga evolucionando localmente y que cada version enviada a prueba sea:

- identificable por version y commit;
- reproducible desde el lockfile;
- validada antes de salir;
- recuperable sin reescribir historial;
- independiente de una futura migracion de datos.

## Ambientes

| Ambiente | Codigo | Datos | Estado |
| --- | --- | --- | --- |
| Local | `main` y ramas `codex/*` | `localStorage` de Chrome en `127.0.0.1` | Activo |
| Prueba online | `release/test` | Al inicio, `localStorage` aislado por navegador/origen | Rama sincronizada, no desplegada |
| Produccion | Version estable aprobada | PostgreSQL/Supabase futuro | No creado |

La URL online y `http://127.0.0.1:5173/` nunca comparten `localStorage`. Durante la primera beta no se cargan datos reales ni se interpreta una copia del navegador como base multiusuario.

## Flujo Git

```text
codex/<propietario>
  -> commit entregado
  -> integracion y validacion de Central en main
  -> seleccion explicita del commit
  -> release/test
  -> etiqueta vMAJOR.MINOR.PATCH[-prerelease]
  -> despliegue de prueba autorizado
```

- `main` sigue siendo la rama canonica de integracion.
- `release/test` apunta solamente a un commit de `main` ya validado.
- No se desarrolla directamente en `release/test`.
- No se hace force-push sobre `main`, `release/test` ni una etiqueta publicada.
- Crear una rama o etiqueta local no autoriza push ni despliegue.

## Versionado

Se usa SemVer:

- `v0.1.0-beta.1`: primer candidato de prueba.
- `v0.1.0-beta.2`: correccion compatible del candidato.
- `v0.1.0`: primera version estable de esa linea.
- `v0.1.1`: correccion compatible.
- `v0.2.0`: cambio funcional compatible que amplía el sistema.
- `v1.0.0`: contrato productivo aprobado.

`package.json`, `CHANGELOG.md` y la etiqueta `v<version>` deben coincidir. Una version publicada no se mueve ni se reutiliza.

## Preparar un candidato local

1. Confirmar `main` limpio y sin integraciones pendientes.
2. Ejecutar:

   ```text
   pnpm install --frozen-lockfile
   pnpm run check
   pnpm run build
   pnpm run test:e2e
   ```

3. Actualizar `package.json` y `CHANGELOG.md`.
4. Crear un commit local estable.
5. Ejecutar `pnpm run release:check`.
6. Crear la etiqueta anotada `v<version>`.
7. Crear o actualizar localmente `release/test` al mismo commit.
8. Repetir `pnpm run release:check`.
9. Crear y verificar un `git bundle` fuera del repositorio.
10. Detenerse y solicitar autorizacion explicita antes de push o despliegue.

## Controles automatizados

- `.node-version` fija el runtime reproducible.
- `packageManager` fija pnpm.
- `pnpm install --frozen-lockfile` evita una resolucion distinta durante la entrega.
- `pnpm run release:check` verifica version, changelog, archivos sensibles, build de Vercel, workflow, etiqueta y limpieza Git.
- `.github/workflows/quality.yml` ejecuta `check` y `build` en pull requests, `main` y `release/test`.
- Los E2E se ejecutan en `release/test` y bajo disparo manual. En CI Playwright inicia un servidor aislado y usa Chromium; localmente conserva Chrome y el servidor oficial.

## Candidato sincronizado

- Version: `0.1.0-beta.1`.
- Commit congelado: `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`.
- Referencias remotas: `main`, `release/test` y `v0.1.0-beta.1`.
- Respaldo local previo: `backup/pre-beta-2026-07-24`.
- La etiqueta y `release/test` no se moveran; cualquier correccion genera un nuevo candidato.
- La sincronizacion no autoriza ni implica un despliegue.

## Publicacion de prueba

La primera publicacion debe:

1. usar un proyecto Vercel exclusivo de prueba;
2. vincularse con `release/test`, no desplegar cada cambio local;
3. mantener acceso protegido;
4. usar datos demo;
5. validar Cajero, Encargado y Administrador;
6. registrar URL, version, commit, fecha y resultado;
7. ensayar rollback antes de aceptar la beta.

La configuracion local `vercel.json` compila Vite con lockfile congelado, publica `dist` y conserva el fallback de React Router. `.vercel/` y las variables privadas quedan fuera de Git.

## Rollback

### Codigo local

- Consultar la etiqueta estable anterior.
- Crear una rama de recuperacion desde esa etiqueta.
- No hacer `reset --hard` sobre trabajo no respaldado.
- Aplicar una correccion o `git revert` si se desea conservar la linea actual.

### Frontend desplegado

- Volver a promover el despliegue anterior o desplegar nuevamente la etiqueta conocida.
- Confirmar rutas, login y smoke de los tres roles.
- Registrar el incidente y la version restaurada.

### Datos

El rollback del frontend no revierte datos.

- En `localStorage`, exportar un snapshot antes de una migracion o importacion.
- Un frontend antiguo puede rechazar un snapshot de esquema futuro.
- Toda version que cambie `schemaVersion` debe declarar compatibilidad y estrategia de recuperacion antes de desplegarse.
- Con PostgreSQL/Supabase se usarán migraciones versionadas, respaldo, conciliacion y correcciones auditadas.
- Los movimientos financieros no se borran para volver a una version: se corrigen mediante operaciones append-only, salvo restauracion de desastre expresamente aprobada.

## Criterios para autorizar un push

- `git status` limpio.
- `pnpm run check`, `build`, `test:e2e`, `release:check` y `check:commit` aprobados.
- `CHANGELOG.md` actualizado.
- Etiqueta y rama local apuntan al mismo commit.
- Bundle externo verificado.
- Sin `.env`, `.vercel/`, adjuntos ni credenciales versionados.
- Confirmacion explicita del usuario.

## Criterios para autorizar un despliegue

- Push y CI aprobados.
- Proyecto y ambiente identificados como prueba.
- Acceso protegido y datos demo.
- Variables revisadas sin exponer secretos.
- Plan de rollback probado.
- Confirmacion explicita separada para desplegar.
