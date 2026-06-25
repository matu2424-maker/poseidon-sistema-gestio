# Poseidon Sistema de Gestion

Base inicial del sistema. Este repositorio contiene solamente el Modulo 0.

## Stack

- Vite
- React
- TypeScript
- CSS global simple
- Usuarios simulados en frontend

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

## Usuarios simulados

| Usuario | Contrasena |
| --- | --- |
| cajero | cajero123 |
| encargado | encargado123 |
| administrador | admin123 |

## Supabase

El proyecto esta conectado a Supabase mediante variables de entorno:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

La configuracion local real queda en `.env.local`, que no se sube a Git. Para otros entornos, copiar `.env.example` y completar la clave publicable correspondiente.

## Prueba del Modulo 0

1. Entrar desde la pantalla inicial.
2. Iniciar sesion con cada usuario simulado.
3. Verificar que el menu lateral cambia segun el rol.
4. Confirmar que la barra superior muestra local activo `Poseidon`.
5. Probar la vista en ancho desktop y mobile.
6. Ejecutar `pnpm run build`.
