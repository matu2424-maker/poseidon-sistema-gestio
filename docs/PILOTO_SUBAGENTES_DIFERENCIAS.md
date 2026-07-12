# Poseidon - Piloto de subagentes en Diferencias de caja

Fecha: 2026-07-11

Informe de una revision tecnica de solo lectura y su cierre posterior. Los hallazgos fueron validados e implementados en un objetivo autorizado, sin cambiar la regla de resultado economico.

## Objetivo

Evaluar si dos subagentes con responsabilidades distintas aportan evidencia util sobre un modulo contable conectado, sin contaminar el contexto principal ni modificar el sistema.

## Ejecucion

- Mapeador de alcance: aplico el contrato de `poseidon_scope_mapper`.
- Revisor contable: aplico el contrato de `poseidon_accounting_reviewer`.
- La tarea actual no recargo los nombres personalizados creados durante su ejecucion; ambos pilotos usaron el agente integrado `explorer` con las mismas instrucciones.
- No se ejecutaron pruebas, servidores ni comandos mutables.
- No se modifico ningun archivo funcional de `src/`.

## Confirmaciones compartidas

- El resultado economico no incluye diferencias de caja.
- Efectivo y banco conservan calculos y movimientos separados.
- Verificar conserva impacto, corregir aplica delta y anular deja impacto neto cero mediante contramovimientos.
- El comando valida rol, alcance local, caja cerrada, observacion y montos corregidos.
- Auditoria, libro contable y balance se relacionan por referencias, aunque el evento de auditoria no es autosuficiente para reconstruir todos los asientos.
- La cobertura actual ya prueba gestion basica, signos, idempotencia, alcance por rol y ciclo financiero integrado.

## Riesgos priorizados detectados

### Alto

- Gestionar una diferencia historica no define que ocurre si ya existe una caja posterior o abierta del mismo local. El libro actual puede cambiar sin actualizar la base inicial ya utilizada por cajas posteriores.
- No existe una matriz explicita de transiciones. Una caja cerrada puede volver a gestionarse desde estados como `ANULADA` sin una regla terminal documentada.

### Medio

- Los IDs de ajustes usan `differenceReviewedAt`; dos gestiones con la misma marca temporal podrian reutilizar un ID y reemplazar historial mediante upsert.
- El cierre rechaza montos negativos, pero no valida expresamente `NaN` o `Infinity` antes de crear diferencias y movimientos.
- La entrada monetaria de UI puede convertir vacio o texto no numerico en cero antes de llegar al comando, perdiendo la diferencia entre ausencia y cero legitimo.
- El periodo de la pantalla usa la fecha UTC de `closedAt`; cerca del cambio de dia o mes puede diferir de la fecha operativa de Uruguay.
- La auditoria general del encargado requiere revisar su alcance por local; el componente recibe la bitacora completa.
- Los eventos de gestion no incluyen saldos antes/despues ni IDs de cada movimiento, por lo que la trazabilidad exige cruzar balance, libro y auditoria.

## Cobertura faltante sugerida

- Transiciones repetidas y acciones posteriores a `ANULADA`.
- Gestion de una caja sin diferencia real.
- Correccion o anulacion cuando existe una caja posterior o abierta.
- Dos gestiones distintas con el mismo timestamp.
- `NaN`, `Infinity`, vacio y texto no numerico.
- Cambio de signo o correccion parcial por efectivo y banco.
- Limites de dia/mes en zona `America/Montevideo`.
- Persistencia y trazabilidad completa de asientos de diferencias.

## Decisiones de producto pendientes

- Si `ANULADA` es terminal y que transiciones admite cada estado.
- Como impacta una correccion historica cuando ya existen cajas posteriores.
- Si el delta se imputa a la fecha del cierre o a la fecha de gestion.
- Si el periodo se filtra por `operatingDate` o por fecha local de cierre.
- Si auditoria debe contener saldos e IDs de asientos o si alcanza el cruce por referencias.

## Evaluacion del metodo

- Utilidad: alta. El mapeador encontro conexiones temporales, permisos y persistencia; el revisor encontro colisiones de ID, validaciones numericas y huecos contables.
- Duplicacion: moderada y aceptable en transiciones y trazabilidad de auditoria.
- Consumo: no existe medicion confiable por subagente en este piloto. La espera del mapeador fue demasiado larga para una revision de alcance.
- Ajuste aplicado: limites de archivos, palabras, riesgos y pruebas en los tres perfiles personalizados.
- Conclusion original del piloto: mantener dos subagentes. Esta recomendacion numerica quedo reemplazada el 2026-07-12 por la decision de no fijar limites propios; se conserva como evidencia historica.

## Cierre del piloto

- Una tarea nueva reconocio los tres perfiles nominales y la configuracion limitada vigente durante aquel piloto. Esos valores fueron retirados el 2026-07-12.
- Se ejecutaron pruebas de solo lectura con `poseidon_scope_mapper` y `poseidon_accounting_reviewer`; ambos finalizaron sin cambios en Git.
- Limitacion de la API: no expone un selector nativo `agent_type`; se comprobo presencia, lectura y obediencia del contrato TOML nominal.
- Los riesgos alto/medio de este informe quedaron cubiertos por reglas, codigo y pruebas: transiciones, caja abierta, historico inmutable, IDs/cadena, finitud, importes vacios, zona operativa, alcance local y detalle contable de auditoria.
- El protocolo queda habilitado para futuros objetivos, manteniendo perfiles de solo lectura y delegacion no superpuesta; ya no impone una cantidad simultanea fija.
- `pnpm run check:agents` valida automaticamente la infraestructura y sus referencias.
- Las delegaciones del piloto y la validacion nominal quedaron consolidadas en `docs/REGISTRO_DELEGACIONES_AGENTES.md`.
