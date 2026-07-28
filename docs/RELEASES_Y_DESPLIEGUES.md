# Poseidon - Versiones, despliegues y rollback

Ultima actualizacion: 2026-07-26

Estado: beta demo `0.1.0-beta.1` publicada desde `release/test` en Vercel y
candidato `0.1.0-beta.3` validado para su publicacion controlada. No existe
backend remoto activo; el esquema Supabase preparatorio esta registrado como
`READY` y la capacidad permanece en `VALIDATING`.

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
| Prueba online | `release/test` | `localStorage` aislado por navegador/origen | Activa en `https://poseidon-sistema-gestio.vercel.app` |
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
- `v0.1.0-beta.3`: candidato para prueba remota desde el local fisico.
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
- `pnpm run release:check` verifica version, changelog, archivos sensibles
  vigentes e historicos, build de Vercel, workflow, Actions compatibles con
  Node 24, etiqueta y limpieza Git. Los hallazgos historicos informan solamente
  ruta, blob y categoria, nunca el valor.
- `.github/workflows/quality.yml` ejecuta `check` y `build` en pull requests, `main` y `release/test`.
- Los E2E se ejecutan en `release/test` y bajo disparo manual. En CI Playwright inicia un servidor aislado y usa Chromium; localmente conserva Chrome y el servidor oficial.
- El job `Backend schema` se ejecuta en `release/test` y bajo disparo manual:
  inicia Supabase descartable, ejecuta lint/pgTAP y lo detiene siempre.
- `Release E2E` depende tambien de esa puerta; una migracion o politica SQL
  invalida bloquea el candidato.
- `actions/checkout@v6`, `actions/setup-node@v6`, `pnpm/action-setup@v6` y `actions/upload-artifact@v7` evitan depender del runtime interno Node 20 retirado por GitHub.
- El preflight tambien controla `upload-artifact`, aunque ese paso solo se ejecuta cuando falla un E2E y por eso una version obsoleta puede quedar oculta durante una corrida exitosa.
- `vercel.json` desactiva los despliegues automaticos de `main`; `release:check` impide quitar accidentalmente ese control.
- El candidato frontend sigue usando `localStorage`. Incluir SQL inactivo en una
  version no autoriza configurar variables ni seleccionar el modo Supabase.

## Candidato publicado

- Version: `0.1.0-beta.1`.
- Commit congelado: `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`.
- Referencias congeladas: `release/test` y `v0.1.0-beta.1`.
- Respaldo local previo: `backup/pre-beta-2026-07-24`.
- La etiqueta y `release/test` no se moveran; cualquier correccion genera un nuevo candidato.
- Evidencia remota: [Poseidon Quality #3](https://github.com/matu2424-maker/poseidon-sistema-gestio/actions/runs/30116340060) aprobo `Check and build` y `Release E2E` sobre `release/test` y el commit congelado.
- La modernizacion posterior de Actions se sincronizo en `main` mediante `1151091`; [Poseidon Quality #4](https://github.com/matu2424-maker/poseidon-sistema-gestio/actions/runs/30117602834) aprobo `Check and build` sin anotaciones de Node 20.
- [Poseidon Quality #6](https://github.com/matu2424-maker/poseidon-sistema-gestio/actions/runs/30121806269) aprobo los controles de `main` en `b4ff2944db74de2dedcf7fb245ebbbe18db0cc85`.
- El cambio de CI no mueve `release/test`, la etiqueta ni el candidato ya validado.

## Candidato validado para publicacion

- Version: `0.1.0-beta.3`.
- Estado: validado localmente; la publicacion autorizada debe conservar el modo
  `local` y usar exclusivamente datos demo.
- Evidencia: `264/264` pruebas unitarias/integracion, `30/30` E2E,
  `414/414` aserciones PostgreSQL, build y smoke HTTP aprobados.
- Incluye autorizacion uniforme, control de secretos, E2E completos de maestros,
  preservacion del historial eliminado y base PostgreSQL preparatoria.
- La aplicacion conserva `localStorage`; el backend remoto no se selecciona ni
  recibe datos.
- La autorizacion del 2026-07-28 habilita preparar, pushear y desplegar este
  candidato desde `release/test`.

## Publicacion de prueba

La primera publicacion aplica estas condiciones:

1. usar el proyecto Vercel existente exclusivamente como demo;
2. vincularse con `release/test`, no desplegar cada cambio local;
3. declarar que el dominio de produccion Hobby es publico;
4. usar datos demo;
5. validar Cajero, Encargado y Administrador;
6. registrar URL, version, commit, fecha y resultado;
7. ensayar rollback antes de aceptar la beta.

La configuracion local `vercel.json` compila Vite con lockfile congelado, publica `dist` y conserva el fallback de React Router. `.vercel/` y las variables privadas quedan fuera de Git.

El proyecto Vercel `poseidon-sistema-gestio` ya existia y estaba conectado a GitHub. El 2026-07-24 Central cambio su rama de produccion de `main` a `release/test`; el dominio de produccion del plan Hobby permanece publico y solo debe usar datos demo.

Ese mismo dia, con autorizacion separada, se eliminaron las 16 variables historicas de PostgreSQL/Supabase que el frontend vigente no consume. El inventario de variables del proyecto quedo en cero y la beta se reconstruyo sin cache desde el mismo commit congelado. Esta limpieza no revoca las credenciales en sus proveedores: rotarlas o revocarlas es una operacion externa diferente. El archivo local obsoleto `.env.local` fue eliminado sin leer ni exponer sus valores.

### Evidencia de publicacion 2026-07-24

- URL: `https://poseidon-sistema-gestio.vercel.app`.
- Version: `0.1.0-beta.1`.
- Fuente: `release/test`.
- Commit: `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`.
- Despliegue Vercel vigente: `PHp675DwSQ6Sy3VrC7p6SoBgkSsE`.
- URL generada: `https://poseidon-sistema-gestio-2nro7tskp-mathias13.vercel.app`.
- Estado: `Ready` en 30 segundos.
- Configuracion: 0 variables de entorno del proyecto despues de eliminar las 16 variables historicas de PostgreSQL/Supabase.
- Rutas HTTP `200`: `/`, `/ingresar`, `/panel`, `/caja/abrir` y `/locales`.
- Smoke Chrome: Cajero, Encargado y Administrador ingresaron a sus paneles; Administrador abrio `/locales`.
- Control de rama: el push de `b4ff2944db74de2dedcf7fb245ebbbe18db0cc85` a `main` no creo un despliegue Vercel.
- Despliegue reemplazado: `Cm9tbKqvERgd6bZEYbBZVTzWFHDC`, construido desde el mismo commit antes de limpiar las variables.
- Los despliegues anteriores se conservan como evidencia, no como destino de promocion, porque fueron construidos con la configuracion retirada.

## Rollback

### Codigo local

- Consultar la etiqueta estable anterior.
- Crear una rama de recuperacion desde esa etiqueta.
- No hacer `reset --hard` sobre trabajo no respaldado.
- Aplicar una correccion o `git revert` si se desea conservar la linea actual.

### Frontend desplegado

- Desplegar nuevamente una etiqueta o commit conocido usando la configuracion vigente del proyecto.
- No promover mediante `Instant Rollback` un despliegue construido antes de una limpieza o rotacion de variables.
- Confirmar rutas, login y smoke de los tres roles.
- Registrar el incidente y la version restaurada.
- Punto de restauracion de codigo vigente: `v0.1.0-beta.1`, commit `0bb33965b8ea50b4f1c10b8863f73582b006f8ea`.

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
- Visibilidad declarada; si el dominio es publico, usar exclusivamente datos demo.
- Variables revisadas sin exponer secretos.
- Plan de rollback probado.
- Confirmacion explicita separada para desplegar.
