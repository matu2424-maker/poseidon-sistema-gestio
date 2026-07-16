# Poseidon - Contratos compartidos entre chats

Ultima actualizacion: 2026-07-16

## Regla principal

Un contrato compartido tiene un unico propietario temporal. Los chats de rol pueden consumirlo y proponer cambios, pero no editarlo sin asignacion del chat central.

## Contratos reservados

| Contrato | Rutas principales | Consumidores |
| --- | --- | --- |
| Tipos de dominio | `src/types.ts` | Todos |
| Estado y composicion | `src/App.tsx` | Todos los paneles y pantallas |
| Rutas y permisos | `src/navigation/` | Cajero, Encargado, Administrador |
| Persistencia | `src/data/`, `src/infrastructure/` | Todos los comandos |
| Nucleo financiero | `src/application/cash/`, `src/application/movements/`, `src/application/differences/` | Cajero, Encargado, Administrador, reportes |
| Reglas compartidas | `src/lib/` | Todos los dominios |
| UI transversal | `src/components/`, estilos globales | Todas las pantallas |
| Auditoria | `src/lib/audit.ts` y comandos sensibles | Todos los roles |
| Documentacion canonica | `docs/REGLAS_*`, `docs/MAPA_TECNICO.md` | Todos los chats |

## Solicitud de cambio de contrato

El chat solicitante entrega al central:

1. comportamiento requerido;
2. contrato actual y limitacion encontrada;
3. archivos candidatos;
4. consumidores afectados;
5. compatibilidad esperada;
6. pruebas unitarias y por rol necesarias.

Central decide si asigna un especialista, conserva la implementacion o divide el cambio en dos commits. Hasta esa decision, el chat de rol puede avanzar solo en trabajo no dependiente.

## Ejemplos

- Cajero necesita un nuevo concepto salarial: Salarios define la regla; Cajero conecta el formulario.
- Encargado necesita corregir una diferencia: Nucleo financiero modifica el comando; Encargado modifica la vista.
- Administrador necesita resetear una maquina con caja abierta: Locales/Maquinas define la validacion y Nucleo financiero confirma la restriccion de caja.

## Integracion

- Primero se integra el contrato compartido con sus pruebas.
- Luego cada chat de rol actualiza su consumidor.
- Si los consumidores requieren simultaneidad, central reserva los archivos y define el orden de commits.
- No se modifica una formula en una pantalla para evitar cambiar el comando propietario.
