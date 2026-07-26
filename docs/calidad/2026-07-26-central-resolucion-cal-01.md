# Resolucion Central de CAL-01

- ID: `2026-07-26-CAL-01-RESOLUCION`
- Informe original: `docs/calidad/2026-07-26-cal-01-lifecycle-maestros.md`
- Commit de Calidad integrado: `294d2e4e2e3e158564b4d63239e065db7e2857dd`
- Commit de integracion en `main`: `4b809ce`
- Fecha: 2026-07-26
- Responsable: Poseidon Central

## Resultado

Los tres fallos funcionales reproducibles de Locales y Maquinas quedaron
corregidos sin borrar historial:

1. La auditoria admite el identificador virtual `taller` como alcance historico.
2. La auditoria conserva el ID de un local quitado aunque ya no exista en el
   maestro vigente.
3. La baja definitiva de una maquina conserva toda su cadena de historial. El
   evento `QUITADA` actua como tombstone de esa entidad.

Los tres casos dejaron de usar `test.fail` y ahora completan normalmente.

## Personal

La eliminacion fisica de personal con historial salarial permanece bloqueada.
La creacion de personal genera un historial salarial inicial, por lo que el
flujo publico termina en Papelera y conserva la trazabilidad. No se infirio una
excepcion para borrar ese historial.

Cambiar esta politica requiere una decision de producto separada. No bloquea
CAL-01 porque el escenario E2E verifica expresamente el bloqueo vigente.

## Evidencia

- Pruebas unitarias dirigidas de validacion y comandos: `14/14`.
- E2E dirigido de Locales y Maquinas: `5/5`.
- E2E completo de los cuatro maestros asignados: `10/10`.
- No quedan fallos esperados en los recorridos de CAL-01.
- Los escenarios usan datos descartables de Playwright y no modifican los datos
  operativos de Chrome.

## Limites

- La evidencia no modifica la politica de eliminacion definitiva de personal.
- La validacion manual en Chrome se reserva para el cierre transversal de la
  beta; CAL-01 certifica el comportamiento reproducible aislado.
