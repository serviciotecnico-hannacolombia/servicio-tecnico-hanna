-- Aplicar después del SQL 12. NULL mantiene la capacidad heredada del rol.
BEGIN;
ALTER TABLE public.intervenciones_permisos ADD COLUMN IF NOT EXISTS personalizado_regional boolean;
CREATE OR REPLACE FUNCTION public.gestion_personalizado_heredado(p_usuario uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.profiles p JOIN public.role_capabilities c ON c.role_id=p.role_id
  WHERE p.id=p_usuario AND p.activo AND c.capability_key='mant_in_situ_personalizado'
 );
$$;
REVOKE ALL ON FUNCTION public.gestion_personalizado_heredado(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.intervenciones_permiso(p_permiso text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND activo) AND coalesce(p_permiso=ANY(ARRAY['ver','registrar','editar','importar','exportar','estadisticas','comercial','oportunidades_crear','oportunidades_editar','buzon','semaforo','catalogo_editar','solicitudes_ver','solicitudes_crear','solicitudes_editar','solicitudes_exportar','consultas_ver','consultas_exportar','gestionar_accesos','administrar_observaciones_st','observaciones_crear','observaciones_ver','personalizado_regional']),false)
 AND (public.intervenciones_es_admin() OR coalesce((SELECT (to_jsonb(p)->>p_permiso)::boolean FROM public.intervenciones_permisos p WHERE p.usuario_id=auth.uid()),CASE WHEN p_permiso='personalizado_regional' THEN public.gestion_personalizado_heredado(auth.uid()) ELSE (public.gestion_permisos_base(auth.uid())->>p_permiso)::boolean END,false));
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_mis_permisos() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_object_agg(k,public.intervenciones_permiso(k))||jsonb_build_object('administrador',public.intervenciones_es_admin(),'configurado',public.intervenciones_es_admin() OR EXISTS(SELECT 1 FROM public.intervenciones_permisos WHERE usuario_id=auth.uid())) FROM unnest(ARRAY['ver','registrar','editar','importar','exportar','estadisticas','comercial','oportunidades_crear','oportunidades_editar','buzon','semaforo','catalogo_editar','solicitudes_ver','solicitudes_crear','solicitudes_editar','solicitudes_exportar','consultas_ver','consultas_exportar','gestionar_accesos','administrar_observaciones_st','observaciones_crear','observaciones_ver','personalizado_regional']) k;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_permisos_guardar(p_usuario uuid,p_permisos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE antes jsonb;despues jsonb;k text;
BEGIN
 IF NOT public.intervenciones_puede_administrar() THEN RAISE EXCEPTION 'No tienes permiso para administrar accesos de Gestión' USING ERRCODE='42501'; END IF;
 IF p_usuario=auth.uid() OR EXISTS(SELECT 1 FROM public.intervenciones_alertas_config WHERE administrador_id=p_usuario) THEN RAISE EXCEPTION 'El propietario y tu propio perfil están protegidos'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_usuario AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Selecciona un perfil activo'; END IF;
 FOREACH k IN ARRAY ARRAY['ver','registrar','editar','importar','exportar','estadisticas','comercial','oportunidades_crear','oportunidades_editar','buzon','semaforo','catalogo_editar','solicitudes_ver','solicitudes_crear','solicitudes_editar','solicitudes_exportar','consultas_ver','consultas_exportar','gestionar_accesos','administrar_observaciones_st','observaciones_crear','observaciones_ver','personalizado_regional'] LOOP IF jsonb_typeof(p_permisos->k) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Los permisos deben ser booleanos'; END IF;END LOOP;
 IF (p_permisos->>'administrar_observaciones_st')::boolean AND NOT (p_permisos->>'observaciones_ver')::boolean THEN RAISE EXCEPTION 'Eliminar observaciones requiere verlas'; END IF;
 SELECT to_jsonb(p) INTO antes FROM public.intervenciones_permisos p WHERE usuario_id=p_usuario FOR UPDATE;
 IF NOT public.intervenciones_es_admin() AND ((p_permisos->>'gestionar_accesos')::boolean OR coalesce((antes->>'gestionar_accesos')::boolean,false)) THEN RAISE EXCEPTION 'Sólo el propietario puede delegar o modificar administradores de accesos' USING ERRCODE='42501'; END IF;
 INSERT INTO public.intervenciones_permisos(usuario_id,ver,registrar,editar,importar,exportar,estadisticas,comercial,oportunidades_crear,oportunidades_editar,buzon,semaforo,catalogo_editar,solicitudes_ver,solicitudes_crear,solicitudes_editar,solicitudes_exportar,consultas_ver,consultas_exportar,gestionar_accesos,administrar_observaciones_st,observaciones_crear,observaciones_ver,personalizado_regional,actualizado_por) VALUES(p_usuario,(p_permisos->>'ver')::boolean,(p_permisos->>'registrar')::boolean,(p_permisos->>'editar')::boolean,(p_permisos->>'importar')::boolean,(p_permisos->>'exportar')::boolean,(p_permisos->>'estadisticas')::boolean,(p_permisos->>'comercial')::boolean,(p_permisos->>'oportunidades_crear')::boolean,(p_permisos->>'oportunidades_editar')::boolean,(p_permisos->>'buzon')::boolean,(p_permisos->>'semaforo')::boolean,(p_permisos->>'catalogo_editar')::boolean,(p_permisos->>'solicitudes_ver')::boolean,(p_permisos->>'solicitudes_crear')::boolean,(p_permisos->>'solicitudes_editar')::boolean,(p_permisos->>'solicitudes_exportar')::boolean,(p_permisos->>'consultas_ver')::boolean,(p_permisos->>'consultas_exportar')::boolean,(p_permisos->>'gestionar_accesos')::boolean,(p_permisos->>'administrar_observaciones_st')::boolean,(p_permisos->>'observaciones_crear')::boolean,(p_permisos->>'observaciones_ver')::boolean,(p_permisos->>'personalizado_regional')::boolean,auth.uid())
 ON CONFLICT(usuario_id) DO UPDATE SET ver=excluded.ver,registrar=excluded.registrar,editar=excluded.editar,importar=excluded.importar,exportar=excluded.exportar,estadisticas=excluded.estadisticas,comercial=excluded.comercial,oportunidades_crear=excluded.oportunidades_crear,oportunidades_editar=excluded.oportunidades_editar,buzon=excluded.buzon,semaforo=excluded.semaforo,catalogo_editar=excluded.catalogo_editar,solicitudes_ver=excluded.solicitudes_ver,solicitudes_crear=excluded.solicitudes_crear,solicitudes_editar=excluded.solicitudes_editar,solicitudes_exportar=excluded.solicitudes_exportar,consultas_ver=excluded.consultas_ver,consultas_exportar=excluded.consultas_exportar,gestionar_accesos=excluded.gestionar_accesos,administrar_observaciones_st=excluded.administrar_observaciones_st,observaciones_crear=excluded.observaciones_crear,observaciones_ver=excluded.observaciones_ver,personalizado_regional=excluded.personalizado_regional,actualizado_por=auth.uid(),updated_at=now();
 SELECT to_jsonb(p) INTO despues FROM public.intervenciones_permisos p WHERE usuario_id=p_usuario;
 INSERT INTO public.intervenciones_permisos_historial(usuario_id,administrador_id,antes,despues) VALUES(p_usuario,auth.uid(),coalesce(antes,public.gestion_permisos_base(p_usuario)),despues);
END;
$$;

CREATE OR REPLACE FUNCTION public.intervenciones_permisos_listar() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_puede_administrar() THEN RAISE EXCEPTION 'No tienes permiso para administrar accesos de Gestión' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_object_agg(p.id::text,CASE WHEN p.id=(SELECT administrador_id FROM public.intervenciones_alertas_config WHERE id) THEN jsonb_build_object('ver',true,'registrar',true,'editar',true,'importar',true,'exportar',true,'estadisticas',true,'comercial',true,'oportunidades_crear',true,'oportunidades_editar',true,'buzon',true,'semaforo',true,'catalogo_editar',true,'solicitudes_ver',true,'solicitudes_crear',true,'solicitudes_editar',true,'solicitudes_exportar',true,'consultas_ver',true,'consultas_exportar',true,'gestionar_accesos',true) ELSE coalesce(to_jsonb(a)-ARRAY['usuario_id','actualizado_por','updated_at'],public.gestion_permisos_base(p.id)) END || jsonb_build_object('personalizado_regional',p.id=(SELECT administrador_id FROM public.intervenciones_alertas_config WHERE id) OR coalesce(a.personalizado_regional,public.gestion_personalizado_heredado(p.id)))),'{}') FROM public.profiles p LEFT JOIN public.intervenciones_permisos a ON a.usuario_id=p.id);
END;
$$;
COMMIT;
