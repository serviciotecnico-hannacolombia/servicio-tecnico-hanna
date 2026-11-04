-- Aplicar después de instalar-permisos-visitas-in-situ.sql.
-- Permite devolver un aviso a sin leer, sólo dentro del buzón del usuario autenticado.
BEGIN;
CREATE OR REPLACE FUNCTION public.intervenciones_alertas_sin_leer(p_claves text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_permiso('buzon') THEN RAISE EXCEPTION 'Sin acceso al buzón' USING ERRCODE='42501'; END IF;
 IF p_claves IS NULL OR cardinality(p_claves)>1000 THEN RAISE EXCEPTION 'Lista de avisos no válida'; END IF;
 DELETE FROM public.intervenciones_alertas_leidas WHERE usuario_id=auth.uid() AND clave=ANY(p_claves);
END;
$$;
REVOKE ALL ON FUNCTION public.intervenciones_alertas_sin_leer(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_alertas_sin_leer(text[]) TO authenticated;
COMMIT;
