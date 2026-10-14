-- Habilitar Regional a los roles con In Situ Bogotá y a asesores de Ventas.
-- Aplicar después de b/c/d/e. Puede repetirse sin duplicar permisos.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.mant_regional_sedes') IS NULL
    OR to_regclass('public.mant_regional_servicios') IS NULL THEN
    RAISE EXCEPTION 'Primero aplicar las migraciones regionales b, c, d y e; luego habilitar los permisos';
  END IF;
END $$;

INSERT INTO public.modules(key) VALUES('mant_in_situ_regional') ON CONFLICT DO NOTHING;
INSERT INTO public.capabilities(key) VALUES('mant_in_situ_regional_editar') ON CONFLICT DO NOTHING;

INSERT INTO public.role_modules(role_id,module_key)
SELECT r.id,'mant_in_situ_regional' FROM public.roles r
WHERE EXISTS(SELECT 1 FROM public.role_modules rm WHERE rm.role_id=r.id AND rm.module_key='mant_in_situ')
   OR lower(trim(r.name)) IN ('ventas','jefe de ventas','asesor','asesores')
ON CONFLICT DO NOTHING;

-- No añadir edición a asesores por su nombre de rol. Heredar únicamente
-- permisos de configuración ya existentes en el módulo original.
INSERT INTO public.role_capabilities(role_id,capability_key)
SELECT rc.role_id,'mant_in_situ_regional_editar' FROM public.role_capabilities rc
WHERE rc.capability_key='mant_in_situ_editar'
  AND EXISTS(SELECT 1 FROM public.role_modules rm WHERE rm.role_id=rc.role_id AND rm.module_key='mant_in_situ_regional')
ON CONFLICT DO NOTHING;
COMMIT;

-- Verificación: lista de roles autorizados y si pueden configurar.
SELECT r.name AS rol,
  EXISTS(SELECT 1 FROM public.role_capabilities rc WHERE rc.role_id=r.id
    AND rc.capability_key='mant_in_situ_regional_editar') AS puede_configurar
FROM public.roles r JOIN public.role_modules rm ON rm.role_id=r.id
WHERE rm.module_key='mant_in_situ_regional'
ORDER BY r.name;
