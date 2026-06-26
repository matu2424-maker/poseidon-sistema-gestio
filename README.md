# Poseidon Sistema de Gestion

Aplicacion web operativa para caja diaria, maquinas, gastos, transferencias, regalos, cierres, reportes, administracion y auditoria del local Poseidon.

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

## Usuarios iniciales

| Usuario | Contrasena |
| --- | --- |
| cajero1 | cajero123 |
| cajero2 | cajero123 |
| encargado | encargado123 |
| admin | admin123 |

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

## Vercel

El proyecto incluye `vercel.json` para publicar como app Vite:

```text
Install Command: pnpm install
Build Command: pnpm run build
Output Directory: dist
```

## Prueba rapida

1. Entrar como `cajero1`.
2. Abrir caja con fecha operativa libre.
3. Cargar algunos contadores.
4. Registrar gasto, transferencia y regalo.
5. Cerrar caja y exportar Excel desde Reportes.
6. Entrar como `admin` y revisar reportes, auditoria y administracion.
7. Ejecutar `pnpm run build`.
