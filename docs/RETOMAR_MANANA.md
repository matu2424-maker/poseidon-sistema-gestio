# Poseidon - Retomar trabajo

Fecha de cierre: 2026-06-26

## Antes de tocar codigo

1. Leer `AGENTS.md`.
2. Leer `docs/POSEIDON_FUNCIONAMIENTO.md`.
3. Revisar este archivo.
4. Correr `git status --short` para ver cambios pendientes.

## Estado actual

- App React + Vite + TypeScript.
- Persistencia actual en `localStorage`, clave `poseidon-sistema-gestion-v2`.
- No hay Supabase/Auth real activo. Login de prueba local.
- No hay storage real de archivos: comprobantes e imagenes guardan metadatos para evitar romper `localStorage`.
- No publicar en Vercel hasta que el usuario lo pida explicitamente.

## Usuarios de prueba

| Usuario | Contrasena | Rol |
| --- | --- | --- |
| `admin` | `admin123` | Administrador |
| `cajero1` | `cajero123` | Cajero |
| `cajero2` | `cajero123` | Cajero |
| `encargado` | `encargado123` | Encargado |

El login queda precargado con `cajero1 / cajero123` para probar rapido el panel del cajero.

## Comandos

```bash
pnpm run dev
```

URL local habitual:

```text
http://localhost:5173/
```

Validacion:

```bash
pnpm run build
```

## Archivos principales

- `src/App.tsx`: estado, datos, pantallas y reglas principales.
- `src/styles/global.css`: estilos globales.
- `src/components/WelcomeScreen.tsx`: pantalla inicial.
- `docs/POSEIDON_FUNCIONAMIENTO.md`: reglas funcionales vivas.
- `AGENTS.md`: reglas de trabajo para Codex.
- `README.md`: instrucciones generales del proyecto.

## Modulos ya trabajados

- Login local y roles.
- Panel administrador.
- Locales con tabla, editor, maquinas asociadas, historial y cierre de local.
- Maquinas con taller, desuso, reset, historial y auditoria.
- Panel cajero sin barra lateral.
- Apertura de caja con saldos iniciales de efectivo/banco.
- Contadores con guardado manual y validacion visual de errores.
- Gastos, transferencias, regalos, sueldos y clientes desde cajero.
- Retiros y aportes de capital.
- Cierre de caja con resultado economico separado de movimientos financieros.
- Cuentas corrientes internas para local efectivo, local banco, personal y transferencias.
- Auditoria general.

## Reglas delicadas

- Resultado final de cierre es economico: resultado de maquinas - gastos - sueldos - regalos.
- Transferencias, aportes, retiros, efectivo inicial y banco inicial son movimientos financieros o de caja, no cambian el resultado economico.
- Si el retiro final efectivo o banco es `0`, el selector de quien retira queda gris y dice `Sin retiros finales`.
- IN/OUT actual no puede ser menor al anterior; si falla, la fila queda en rojo.
- Las maquinas con recaudaciones no se eliminan directamente.
- Las maquinas en `DESUSO` solo viven en Taller y no aparecen en Maquinas.
- Personal y clientes pasan por papelera antes de eliminar definitivamente.
- Todo cambio sensible debe quedar auditado con fecha/hora y usuario.

## Validacion hecha al cierre

- `pnpm run build`: correcto.
- `http://localhost:5173/`: responde `200`.
- Navegador integrado: pantalla inicial, login y entrada al flujo de cajero cargan sin errores de consola.

## Pendientes naturales

- Seguir refinando cierre de caja con datos reales de prueba.
- Revisar reportes/exportacion cuando el flujo de caja quede estable.
- Reimplementar Supabase/Auth real cuando el modelo local este confirmado.
- Implementar storage real para comprobantes e imagenes cuando se reactive Supabase u otro proveedor.
