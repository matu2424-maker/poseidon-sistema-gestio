# Poseidon - Skills de Codex

Ultima actualizacion: 2026-07-12

Fuente canonica para crear, usar y validar habilidades reutilizables del repositorio. Las skills describen procedimientos de trabajo; no forman parte del runtime de Poseidon ni reemplazan reglas funcionales, contables o visuales.

## Ubicacion y descubrimiento

- Skills versionadas del proyecto: `.agents/skills/`.
- Cada skill contiene un `SKILL.md` y metadata de interfaz en `agents/openai.yaml`.
- Una tarea Codex nueva puede ser necesaria para comprobar invocacion implicita despues de crear o modificar una skill.
- No guardar reglas de producto dentro de las skills: deben referenciar la fuente canonica vigente.

## Inventario inicial

| Skill | Usar para | Fuentes principales |
| --- | --- | --- |
| `poseidon-module-change` | Ejecutar un cambio modular autorizado de principio a fin | Indice, contexto y documentos del modulo |
| `poseidon-visual-qa` | Verificar interfaces, responsive, estados y tablas | Reglas y sistema visual |
| `poseidon-accounting-regression` | Construir y ejecutar una matriz de impacto contable | Reglas contables y modulo afectado |
| `poseidon-localhost-diagnostics` | Levantar o diagnosticar localhost con evidencia de navegador | Validacion local |

## Relacion con agentes

- Skill: procedimiento repetible que el agente principal o un subagente puede aplicar.
- Perfil personalizado: rol de revision delimitado por `.codex/agents/`.
- Subagente: ejecucion temporal, regulada por `docs/PROTOCOLO_AGENTES_CODEX.md`.
- No crear un agente permanente para un procedimiento que una skill pueda resolver.
- `poseidon-module-change` decide si una delegacion aporta valor; no crea subagentes por costumbre.

## Flujo de uso

1. Elegir solo la skill que corresponde al pedido.
2. Leer sus fuentes dirigidas; no cargar toda la documentacion.
3. Respetar la autorizacion exigida por `AGENTS.md` o el alcance del objetivo activo.
4. Ejecutar el procedimiento y las validaciones proporcionales.
5. Actualizar la fuente canonica afectada.
6. Cerrar con `pnpm run check:commit` y revisar el diff.

## Validacion automatica

`pnpm run check:skills` controla:

- las cuatro carpetas esperadas;
- frontmatter, nombre, descripcion y ausencia de plantillas `TODO`;
- metadata visible y prompt de invocacion;
- referencias minimas y limite de tamano;
- integracion con `AGENTS.md` y `package.json`.

El validador oficial `quick_validate.py` de Skill Creator requiere PyYAML. El runtime local actual no incluye ese paquete, por lo que Poseidon mantiene un validador Node versionado y probado, sin instalar dependencias solo para esta comprobacion.

## Control previo al commit

- Entrada unica: `pnpm run check:commit`.
- Hook versionado: `.githooks/pre-commit`.
- Configuracion local requerida: `git config core.hooksPath .githooks`.
- Siempre ejecuta el control de whitespace de Git.
- Si cambia codigo o scripts, ejecuta `check` y `build`.
- Si cambia solo infraestructura, selecciona `check:skills`, `check:agents` o `check:design` segun las rutas preparadas.
- Documentacion general pura no dispara toda la suite si no afecta esos contratos.

## Integraciones externas

- GitHub es la primera integracion recomendada cuando se decida trabajar con repositorio remoto, issues o pull requests. No se instala ni conecta mientras el trabajo siga exclusivamente local.
- Supabase y Vercel permanecen fuera del flujo actual. Su preparacion vive en los documentos de arquitectura y migracion online.
- Figma solo se evaluara si el sistema visual deja de mantenerse principalmente en el repositorio.
- Ninguna skill puede publicar, desplegar o conectar servicios sin autorizacion explicita.

## Mantenimiento

1. Crear skills con Skill Creator y nombres en minuscula con guiones.
2. Mantener `SKILL.md` breve y mover la informacion estable a documentos canonicos existentes.
3. No agregar `README`, changelog ni copias de documentacion dentro de una skill.
4. Actualizar metadata si cambia el alcance o el disparador.
5. Ejecutar `pnpm run check:skills`, `pnpm run check` y el piloto correspondiente.
6. Registrar resultados relevantes en `docs/PILOTO_SKILLS_POSEIDON.md`.
