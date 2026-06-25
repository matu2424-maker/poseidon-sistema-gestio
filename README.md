# Poseidon Sistema de Gestion

Aplicacion web operativa para caja diaria, maquinas, gastos, transferencias, regalos, cierres, reportes, administracion y auditoria del local Poseidon.

## Stack

- Vite
- React
- TypeScript
- CSS global simple
- Supabase Auth + tablas con RLS para estado compartido

## Ejecutar

Forma rapida en Windows:

```text
iniciar-poseidon.bat
```

Luego abrir o refrescar:

```text
http://localhost:5173
```

Forma de desarrollo:

```bash
pnpm install
pnpm run dev
```

Luego abrir la URL local que informa Vite, normalmente:

```text
http://localhost:5173
```

Tambien se puede generar el build:

```bash
pnpm run build
```

## Autenticacion

La app usa Supabase Auth con email y contrasena. No hay usuarios simulados para entrar.

1. En la pantalla de login, usar `Crear usuario con Supabase Auth`.
2. El primer usuario registrado queda como `Administrador`.
3. Los siguientes usuarios registrados quedan como `Cajero`.
4. Si Supabase tiene confirmacion por email activa, primero hay que confirmar el correo y despues iniciar sesion.

## Modulos incluidos

- Pantalla inicial y login.
- Panel por rol.
- Apertura / continuacion de caja diaria.
- Grilla de contadores IN/OUT con autoguardado. La demo inicial queda con 3 maquinas para prueba rapida.
- Gastos, transferencias y regalos.
- Cierre de caja con calculos obligatorios.
- Diferencias de caja por estado.
- Reportes y exportacion Excel-compatible.
- Administracion inicial de usuarios, locales y maquinas.
- Auditoria de cambios sensibles.
- Cierre periodico inicial.

## Supabase

El proyecto esta conectado a Supabase mediante variables de entorno:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

La configuracion local real queda en `.env.local`, que no se sube a Git. La app tambien incluye fallback a la URL y clave publicable del proyecto `pose` para funcionar en Vercel.

Las migraciones versionadas quedan en `supabase/migrations`. La base usa estas tablas principales:

- `poseidon_profiles`: perfil operativo por usuario autenticado.
- `poseidon_app_state`: estado compartido de la aplicacion para el local Poseidon.

Ambas tablas tienen RLS activo. Las politicas permiten acceso solo a usuarios autenticados y activos.

## Vercel

El proyecto incluye `vercel.json` para publicar como app Vite:

```text
Install Command: pnpm install
Build Command: pnpm run build
Output Directory: dist
```

En Vercel hay que configurar estas variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

## Prueba rapida

1. Crear el primer usuario desde el login para obtener rol administrador.
2. Abrir caja con fecha operativa libre.
3. Cargar contadores de las 3 maquinas de prueba.
4. Registrar gasto, transferencia y regalo.
5. Cerrar caja y exportar Excel desde Reportes.
6. Revisar reportes, auditoria y administracion.
7. Ejecutar `pnpm run build`.
