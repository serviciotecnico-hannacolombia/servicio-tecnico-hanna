-- Ejecutar después de actualizar-funciones-y-accesos-gestion.sql. Preparado; no aplicado remotamente.
BEGIN;
ALTER TABLE public.gestion_mantenimientos ADD COLUMN IF NOT EXISTS es_prueba boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.gestion_mantenimiento_clasificar(p_id uuid,p_revision integer,p_prueba boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.gestion_mantenimientos;nombre text;
BEGIN
 IF NOT public.intervenciones_permiso('solicitudes_editar') THEN RAISE EXCEPTION 'Sin permiso para clasificar solicitudes' USING ERRCODE='42501'; END IF;
 IF p_prueba IS NULL THEN RAISE EXCEPTION 'Indica si la solicitud es de prueba'; END IF;
 SELECT * INTO r FROM public.gestion_mantenimientos WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
 IF p_revision IS DISTINCT FROM r.revision THEN RAISE EXCEPTION 'La solicitud cambió. Recarga antes de continuar.' USING ERRCODE='40001'; END IF;
 IF r.es_prueba=p_prueba THEN RETURN to_jsonb(r); END IF;
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 UPDATE public.gestion_mantenimientos SET es_prueba=p_prueba,revision=revision+1,updated_at=now(),
 historial=historial||jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'estado',r.estado,'cotizacion',r.cotizacion,'nota',CASE WHEN p_prueba THEN 'Clasificada como solicitud de prueba' ELSE 'Clasificada como solicitud real' END,'es_prueba',p_prueba))
 WHERE id=p_id RETURNING * INTO r;
 RETURN to_jsonb(r);
END;
$$;
REVOKE ALL ON FUNCTION public.gestion_mantenimiento_clasificar(uuid,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gestion_mantenimiento_clasificar(uuid,integer,boolean) TO authenticated;
COMMIT;
