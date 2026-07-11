# Comandos de aplicacion - contexto local

Antes de tocar esta carpeta, leer:

- `docs/REGLAS_GENERALES.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/MODULARIZACION_REFERENCIAS.md`
- el contexto y modulo de la operacion afectada

Reglas locales:

- Un comando coordina todas las entidades, cuentas, historiales y auditoria de una accion.
- Debe recibir actor, funcion, reloj e IDs explicitamente para poder probarse.
- Devuelve resultado tipado; no muestra mensajes ni usa APIs del navegador.
- Un error no devuelve datos parcialmente modificados.
- Toda regla contable nueva necesita pruebas de saldo antes/despues.
