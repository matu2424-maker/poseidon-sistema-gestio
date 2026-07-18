---
name: poseidon-localhost-diagnostics
description: Levanta, verifica y diagnostica el servidor local de Poseidon en Windows. Usar cuando el usuario pida iniciar localhost, cuando 127.0.0.1:5173 rechace la conexion, cuando los cambios no aparezcan o antes de una validacion visual que requiera la aplicacion activa.
---

# Poseidon Localhost Diagnostics

Aplicar un unico procedimiento reproducible y confirmar el resultado en el navegador.

## Fuente canonica

Leer `docs/VALIDACION_LOCAL.md`, incluido el contrato de `iniciar-poseidon.bat`, y respetar `AGENTS.md`. No improvisar servidores alternativos.

## Flujo

1. Ejecutar `iniciar-poseidon.bat --check` para comprobar runtime y puerto sin iniciar otro proceso.
2. Si el puerto esta ocupado, ejecutar `pnpm run smoke:localhost` y comprobar el navegador antes de concluir que es Poseidon.
3. Si el puerto esta libre, iniciar con `iniciar-poseidon.bat` en una ventana separada y esperar el arranque.
4. Abrir o reclamar `http://127.0.0.1:5173/` en el perfil habitual de Chrome del usuario y comprobar titulo, DOM principal y ausencia de pantalla de error.
5. Si Chrome no esta disponible o no puede controlarse, informar la limitacion. No usar el navegador integrado como reemplazo para una validacion manual dependiente de datos locales.

## Limites

- Aplicar la matriz de diagnostico y las prohibiciones de `docs/VALIDACION_LOCAL.md`.
- No cambiar servidor, puerto o configuracion por inferencia.
- No considerar exitoso un arranque sin evidencia del navegador.
- Los contextos aislados de Playwright validan comportamiento, pero no sustituyen la comprobacion del estado operativo en Chrome.

## Resultado

Informar URL comprobada, estado del smoke y evidencia del navegador. Si falla, indicar el primer punto exacto del flujo que no se completo.
