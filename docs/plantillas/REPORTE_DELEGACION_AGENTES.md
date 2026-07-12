# Plantilla - Reporte de delegacion Codex

Usar una copia de esta estructura al registrar cada subagente en `docs/REGISTRO_DELEGACIONES_AGENTES.md`. No inventar tiempos ni consumo: escribir `No disponible` cuando la API no exponga el dato.

## Identificacion

- ID:
- Fecha:
- Objetivo principal:
- Perfil o tipo de agente:
- Permiso: solo lectura / escritura controlada
- Alcance y archivos autorizados:

## Resultado

- Resultado: `UTIL` / `PARCIAL` / `NO_UTIL`
- Resumen entregado:
- Hallazgos nuevos:
- Hallazgos adoptados por el agente principal:
- Decisiones descartadas y motivo:

## Eficiencia

- Duracion:
- Consumo de tokens:
- Duplicacion con el agente principal u otros subagentes: `BAJA` / `MEDIA` / `ALTA`
- Amplio el alcance sin autorizacion: si / no
- Evito lectura o trabajo repetido del agente principal: si / no

## Cierre

- Estado final del subagente: completado / interrumpido / error
- Subagente cerrado: si / no
- Worktree sin cambios para perfiles read-only: si / no / no aplica
- Pruebas o evidencia revisadas por el agente principal:
- Registro aprobado por:

## Criterio de uso util

Una delegacion cuenta como `UTIL` solamente cuando cumple todo lo siguiente:

- entrega al menos un hallazgo, dependencia, riesgo o verificacion relevante no obvia;
- el agente principal adopta al menos un resultado o usa su evidencia para decidir;
- respeta el alcance y el permiso asignados;
- no obliga a repetir toda la investigacion;
- queda cerrada y registrada.
