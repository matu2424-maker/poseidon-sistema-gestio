# Poseidon - Seguridad de credenciales

Ultima actualizacion: 2026-07-26

Este documento registra estado y procedimiento sin copiar claves, contrasenas,
tokens, URLs con credenciales ni valores de variables.

## Estado confirmado

- Vercel quedo sin variables historicas de PostgreSQL/Supabase.
- El archivo local ignorado `.env.local` fue revisado por nombres, sin mostrar
  valores, y eliminado porque pertenecia a la integracion obsoleta.
- Git no versiona `.env.local`; `.env.example` contiene solo nombres y ejemplos
  publicos.
- El historial Git conserva commits de la integracion Supabase de junio. No se
  reescribe ese historial porque ya fue compartido y los secretos se invalidan
  en origen.
- `pnpm run release:check` inspecciona los archivos de texto versionados y
  rechaza claves privadas, claves Supabase secretas/personales (`sb_secret_` y
  `sbp_`), URLs PostgreSQL con credenciales y asignaciones reales de secretos
  de servidor o JWT. El error informa rutas, nunca valores.

## Pendiente externo

Las credenciales historicas deben rotarse o revocarse en Supabase aunque ya no
esten en Vercel ni en el checkout. Esta operacion queda pendiente hasta recuperar
la conexion controlada con Chrome. No se debe volver a pegar una credencial en
el chat, documentacion, terminal compartida o codigo.

## Procedimiento de cierre

1. Abrir el proyecto correcto en Supabase desde el perfil habitual de Chrome.
2. Revocar claves secretas o de servicio historicas.
3. Rotar la contrasena de base de datos si alguna vez se compartio.
4. Revisar integraciones y tokens personales relacionados.
5. Confirmar que no existen consumidores vigentes antes de invalidar una clave.
6. Registrar solamente fecha, proveedor, tipo de credencial y resultado; nunca
   el valor nuevo ni el anterior.
7. Ejecutar `pnpm run release:check` con el arbol limpio.

## Reglas permanentes

- El frontend puede recibir URL y clave publicable solamente cuando el ambiente
  remoto sea aprobado.
- `service_role`, contrasena de base, connection strings y secretos viven solo
  en un entorno seguro de servidor.
- Una clave publicable no reemplaza RLS.
- El modo local debe seguir funcionando sin variables.
- Toda sospecha de exposicion se resuelve revocando o rotando en origen; borrar
  una copia no invalida la credencial.
