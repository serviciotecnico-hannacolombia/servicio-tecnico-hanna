-- Aplicar después de actualizar-funciones-y-accesos-gestion.sql.
-- No se ejecuta automáticamente. Sólo afecta Gestión de mantenimientos.
BEGIN;
ALTER TABLE public.intervenciones_permisos ADD COLUMN IF NOT EXISTS administrar_observaciones_st boolean NOT NULL DEFAULT false;
-- Conserva los accesos previos al separar las casillas por primera vez.
ALTER TABLE public.intervenciones_permisos
 ADD COLUMN IF NOT EXISTS observaciones_ver boolean,
 ADD COLUMN IF NOT EXISTS observaciones_crear boolean;
UPDATE public.intervenciones_permisos
 SET observaciones_ver=coalesce(observaciones_ver, ver OR administrar_observaciones_st),
     observaciones_crear=coalesce(observaciones_crear, registrar)
 WHERE observaciones_ver IS NULL OR observaciones_crear IS NULL;
ALTER TABLE public.intervenciones_permisos
 ALTER COLUMN observaciones_ver SET DEFAULT false, ALTER COLUMN observaciones_ver SET NOT NULL,
 ALTER COLUMN observaciones_crear SET DEFAULT false, ALTER COLUMN observaciones_crear SET NOT NULL;
CREATE OR REPLACE FUNCTION public.intervenciones_permiso(p_permiso text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND activo) AND coalesce(p_permiso=ANY(ARRAY['ver','registrar','editar','importar','exportar','estadisticas','comercial','oportunidades_crear','oportunidades_editar','buzon','semaforo','catalogo_editar','solicitudes_ver','solicitudes_crear','solicitudes_editar','solicitudes_exportar','consultas_ver','consultas_exportar','gestionar_accesos','administrar_observaciones_st','observaciones_crear','observaciones_ver']),false)
 AND (public.intervenciones_es_admin() OR coalesce((SELECT (to_jsonb(p)->>p_permiso)::boolean FROM public.intervenciones_permisos p WHERE p.usuario_id=auth.uid()),(public.gestion_permisos_base(auth.uid())->>p_permiso)::boolean,false));
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_mis_permisos() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_object_agg(k,public.intervenciones_permiso(k))||jsonb_build_object('administrador',public.intervenciones_es_admin(),'configurado',public.intervenciones_es_admin() OR EXISTS(SELECT 1 FROM public.intervenciones_permisos WHERE usuario_id=auth.uid())) FROM unnest(ARRAY['ver','registrar','editar','importar','exportar','estadisticas','comercial','oportunidades_crear','oportunidades_editar','buzon','semaforo','catalogo_editar','solicitudes_ver','solicitudes_crear','solicitudes_editar','solicitudes_exportar','consultas_ver','consultas_exportar','gestionar_accesos','administrar_observaciones_st','observaciones_crear','observaciones_ver']) k;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_permisos_guardar(p_usuario uuid,p_permisos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE antes jsonb;despues jsonb;k text;
BEGIN
 IF NOT public.intervenciones_puede_administrar() THEN RAISE EXCEPTION 'No tienes permiso para administrar accesos de Gestión' USING ERRCODE='42501'; END IF;
 IF p_usuario=auth.uid() OR EXISTS(SELECT 1 FROM public.intervenciones_alertas_config WHERE administrador_id=p_usuario) THEN RAISE EXCEPTION 'El propietario y tu propio perfil están protegidos'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_usuario AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Selecciona un perfil activo'; END IF;
 FOREACH k IN ARRAY ARRAY['ver','registrar','editar','importar','exportar','estadisticas','comercial','oportunidades_crear','oportunidades_editar','buzon','semaforo','catalogo_editar','solicitudes_ver','solicitudes_crear','solicitudes_editar','solicitudes_exportar','consultas_ver','consultas_exportar','gestionar_accesos','administrar_observaciones_st','observaciones_crear','observaciones_ver'] LOOP IF jsonb_typeof(p_permisos->k) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Los permisos deben ser booleanos'; END IF;END LOOP;
 IF (p_permisos->>'administrar_observaciones_st')::boolean AND NOT (p_permisos->>'observaciones_ver')::boolean THEN RAISE EXCEPTION 'Eliminar observaciones requiere verlas'; END IF;
 SELECT to_jsonb(p) INTO antes FROM public.intervenciones_permisos p WHERE usuario_id=p_usuario FOR UPDATE;
 IF NOT public.intervenciones_es_admin() AND ((p_permisos->>'gestionar_accesos')::boolean OR coalesce((antes->>'gestionar_accesos')::boolean,false)) THEN RAISE EXCEPTION 'Sólo el propietario puede delegar o modificar administradores de accesos' USING ERRCODE='42501'; END IF;
 INSERT INTO public.intervenciones_permisos(usuario_id,ver,registrar,editar,importar,exportar,estadisticas,comercial,oportunidades_crear,oportunidades_editar,buzon,semaforo,catalogo_editar,solicitudes_ver,solicitudes_crear,solicitudes_editar,solicitudes_exportar,consultas_ver,consultas_exportar,gestionar_accesos,administrar_observaciones_st,observaciones_crear,observaciones_ver,actualizado_por) VALUES(p_usuario,(p_permisos->>'ver')::boolean,(p_permisos->>'registrar')::boolean,(p_permisos->>'editar')::boolean,(p_permisos->>'importar')::boolean,(p_permisos->>'exportar')::boolean,(p_permisos->>'estadisticas')::boolean,(p_permisos->>'comercial')::boolean,(p_permisos->>'oportunidades_crear')::boolean,(p_permisos->>'oportunidades_editar')::boolean,(p_permisos->>'buzon')::boolean,(p_permisos->>'semaforo')::boolean,(p_permisos->>'catalogo_editar')::boolean,(p_permisos->>'solicitudes_ver')::boolean,(p_permisos->>'solicitudes_crear')::boolean,(p_permisos->>'solicitudes_editar')::boolean,(p_permisos->>'solicitudes_exportar')::boolean,(p_permisos->>'consultas_ver')::boolean,(p_permisos->>'consultas_exportar')::boolean,(p_permisos->>'gestionar_accesos')::boolean,(p_permisos->>'administrar_observaciones_st')::boolean,(p_permisos->>'observaciones_crear')::boolean,(p_permisos->>'observaciones_ver')::boolean,auth.uid())
 ON CONFLICT(usuario_id) DO UPDATE SET ver=excluded.ver,registrar=excluded.registrar,editar=excluded.editar,importar=excluded.importar,exportar=excluded.exportar,estadisticas=excluded.estadisticas,comercial=excluded.comercial,oportunidades_crear=excluded.oportunidades_crear,oportunidades_editar=excluded.oportunidades_editar,buzon=excluded.buzon,semaforo=excluded.semaforo,catalogo_editar=excluded.catalogo_editar,solicitudes_ver=excluded.solicitudes_ver,solicitudes_crear=excluded.solicitudes_crear,solicitudes_editar=excluded.solicitudes_editar,solicitudes_exportar=excluded.solicitudes_exportar,consultas_ver=excluded.consultas_ver,consultas_exportar=excluded.consultas_exportar,gestionar_accesos=excluded.gestionar_accesos,administrar_observaciones_st=excluded.administrar_observaciones_st,observaciones_crear=excluded.observaciones_crear,observaciones_ver=excluded.observaciones_ver,actualizado_por=auth.uid(),updated_at=now();
 SELECT to_jsonb(p) INTO despues FROM public.intervenciones_permisos p WHERE usuario_id=p_usuario;
 INSERT INTO public.intervenciones_permisos_historial(usuario_id,administrador_id,antes,despues) VALUES(p_usuario,auth.uid(),coalesce(antes,public.gestion_permisos_base(p_usuario)),despues);
END;
$$;

CREATE TABLE IF NOT EXISTS public.gestion_observaciones_st (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 otst text NOT NULL CHECK (otst ~ '^[0-9]{1,20}$'),
 tecnico text NOT NULL CHECK (length(trim(tecnico)) BETWEEN 1 AND 160),
 observaciones text NOT NULL CHECK (length(trim(observaciones)) BETWEEN 1 AND 5000),
 created_at timestamptz NOT NULL DEFAULT now(),
 creado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id)
);
ALTER TABLE public.gestion_observaciones_st ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gestion_observaciones_st FROM anon,authenticated;
GRANT SELECT,DELETE ON public.gestion_observaciones_st TO authenticated;
GRANT INSERT(id,otst,tecnico,observaciones) ON public.gestion_observaciones_st TO authenticated;
DROP POLICY IF EXISTS observaciones_st_ver ON public.gestion_observaciones_st;
CREATE POLICY observaciones_st_ver ON public.gestion_observaciones_st FOR SELECT TO authenticated USING (public.intervenciones_permiso('observaciones_ver'));
DROP POLICY IF EXISTS observaciones_st_crear ON public.gestion_observaciones_st;
CREATE POLICY observaciones_st_crear ON public.gestion_observaciones_st FOR INSERT TO authenticated WITH CHECK (creado_por=auth.uid() AND public.intervenciones_permiso('observaciones_crear'));
DROP POLICY IF EXISTS observaciones_st_eliminar ON public.gestion_observaciones_st;
CREATE POLICY observaciones_st_eliminar ON public.gestion_observaciones_st FOR DELETE TO authenticated USING (public.intervenciones_permiso('administrar_observaciones_st'));
COMMIT;
