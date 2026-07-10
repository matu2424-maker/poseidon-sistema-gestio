# Liquidacion de salarios - contexto local

Antes de tocar esta carpeta, leer:

- `docs/CONTEXTO_RAPIDO_CODEX.md`
- `docs/REGLAS_CONTABLES.md`
- `docs/REGLAS_VISUALES.md`
- `docs/contextos/CODEX_SALARIOS.md`
- `docs/contextos/CODEX_CLIENTES_PERSONAL.md`
- `docs/modulos/10_clientes_personal_sueldos.md`
- `docs/modulos/11_cuentas_corrientes.md`
- `docs/modulos/12_auditoria.md`

Reglas locales:

- Usar "salario", no "sueldo", en interfaz y conceptos nuevos.
- Salario pagado + adelantos no puede superar salario base del periodo.
- Premio/gratificacion no debe confundirse con regalos de clientes.
- Cambios de salario base son prospectivos por fecha efectiva y no alteran periodos cerrados.
- Toda tabla operativa debe ordenar por cada columna visible de datos. Las columnas de acciones son la excepcion.
