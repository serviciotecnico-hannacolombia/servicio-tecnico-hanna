-- Ejecutar ANTES del frontend de la rama permisos-roles.
-- Habilita Personalizado para TODOS los perfiles que usan el rol Servicio Técnico.
-- No modifica perfiles individuales ni concede edición de precios/configuración.
BEGIN;
INSERT INTO public.capabilities(key) VALUES ('mant_in_situ_personalizado') ON CONFLICT DO NOTHING;
INSERT INTO public.role_capabilities(role_id,capability_key)
 SELECT id,'mant_in_situ_personalizado' FROM public.roles
 WHERE regexp_replace(translate(lower(trim(name)),'é','e'),'\s+',' ','g')='servicio tecnico'
 ON CONFLICT DO NOTHING;
-- Personalizado usa el módulo regional y el catálogo de valores base de Bogotá.
INSERT INTO public.role_modules(role_id,module_key)
 SELECT r.id,m.key FROM public.roles r CROSS JOIN public.modules m
 WHERE regexp_replace(translate(lower(trim(r.name)),'é','e'),'\s+',' ','g')='servicio tecnico'
 AND m.key IN ('mant_in_situ','mant_in_situ_regional')
 ON CONFLICT DO NOTHING;
COMMIT;

-- Verificación: debe aparecer una fila por cada rol Servicio Técnico, con ambos módulos y el permiso en true.
SELECT r.id,r.name,
 EXISTS(SELECT 1 FROM public.role_capabilities rc WHERE rc.role_id=r.id AND rc.capability_key='mant_in_situ_personalizado') AS personalizado,
 EXISTS(SELECT 1 FROM public.role_modules rm WHERE rm.role_id=r.id AND rm.module_key='mant_in_situ_regional') AS acceso_regional,
 EXISTS(SELECT 1 FROM public.role_modules rm WHERE rm.role_id=r.id AND rm.module_key='mant_in_situ') AS catalogo_bogota
FROM public.roles r
WHERE regexp_replace(translate(lower(trim(r.name)),'é','e'),'\s+',' ','g')='servicio tecnico';
