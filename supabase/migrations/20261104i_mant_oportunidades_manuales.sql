-- Preparado para revisión. NO ejecutado en Supabase.
-- Aplicar después de actualizar-funciones-y-accesos-gestion.sql (y demás prerrequisitos de oportunidades).
BEGIN;
ALTER TABLE public.intervenciones_oportunidades ALTER COLUMN intervencion_id DROP NOT NULL;
ALTER TABLE public.intervenciones_oportunidades ADD COLUMN IF NOT EXISTS os text CHECK(os IS NULL OR os ~ '^[0-9]{4}$');
ALTER TABLE public.intervenciones_oportunidades ADD COLUMN IF NOT EXISTS numero_oportunidad text CHECK(numero_oportunidad IS NULL OR length(trim(numero_oportunidad)) BETWEEN 1 AND 100);
CREATE UNIQUE INDEX IF NOT EXISTS oportunidades_numero_unico ON public.intervenciones_oportunidades(lower(trim(numero_oportunidad))) WHERE numero_oportunidad IS NOT NULL;
-- Los registros existentes conservan NULL en OS/número hasta que se completen; no se inventan identificadores.
CREATE OR REPLACE FUNCTION public.intervenciones_oportunidad_origen(p_datos jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.mantenimiento_intervenciones;v_id uuid:=nullif(p_datos->>'intervencion_id','')::uuid;cliente text:=trim(p_datos->>'cliente');referencia text:=coalesce(trim(p_datos->>'referencia'),'');serial text:=coalesce(trim(p_datos->>'serial'),'');tipo text:=p_datos->>'tipo_origen';
BEGIN
 IF v_id IS NOT NULL THEN
  SELECT * INTO r FROM public.mantenimiento_intervenciones WHERE id=v_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'La intervención de origen no existe'; END IF;
  RETURN jsonb_build_object('intervencion_id',r.id,'cliente',r.cliente,'referencia',r.referencia,'serial',r.serial,'tipo_origen',r.tipo);
 END IF;
 IF cliente IS NULL OR length(cliente) NOT BETWEEN 1 AND 300 OR length(referencia)>300 OR length(serial)>300 OR tipo IS NULL OR tipo NOT IN ('preventivo','correctivo','atencion') THEN RAISE EXCEPTION 'Indica el cliente y el tipo de servicio de origen (máximo 300 caracteres por campo)'; END IF;
 RETURN jsonb_build_object('intervencion_id',NULL,'cliente',cliente,'referencia',referencia,'serial',serial,'tipo_origen',tipo);
END;
$$;
REVOKE ALL ON FUNCTION public.intervenciones_oportunidad_origen(jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.intervenciones_oportunidad_crear(p_datos jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE origen jsonb;o public.intervenciones_oportunidades;nombre text;v_os text:=p_datos->>'os';numero text:=nullif(trim(p_datos->>'numero_oportunidad'),'');
BEGIN
 IF NOT public.intervenciones_permiso('oportunidades_crear') THEN RAISE EXCEPTION 'Sin permiso para registrar oportunidades' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_datos) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Datos de oportunidad no válidos'; END IF;
 IF v_os IS NULL OR v_os !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'La OS debe tener exactamente cuatro cifras'; END IF;
 IF numero IS NULL OR length(numero)>100 THEN RAISE EXCEPTION 'Registra el número de oportunidad (máximo 100 caracteres)'; END IF;
 origen:=public.intervenciones_oportunidad_origen(p_datos);
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 INSERT INTO public.intervenciones_oportunidades(id,intervencion_id,titulo,necesidad,asesor,cliente,referencia,serial,tipo_origen,historial,creado_por,os,numero_oportunidad)
 VALUES((p_datos->>'id')::uuid,(origen->>'intervencion_id')::uuid,trim(p_datos->>'titulo'),trim(p_datos->>'necesidad'),trim(p_datos->>'asesor'),origen->>'cliente',origen->>'referencia',origen->>'serial',origen->>'tipo_origen',
 jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'estado','pendiente','cotizacion',NULL,'valor',NULL,'nota','Oportunidad registrada: pendiente de cotizar en la intranet principal de HANNA','os',v_os,'numero_oportunidad',numero,'intervencion_id',origen->'intervencion_id')),auth.uid(),v_os,numero)
 ON CONFLICT(id) DO NOTHING RETURNING * INTO o;
 IF NOT FOUND THEN
  SELECT * INTO o FROM public.intervenciones_oportunidades WHERE id=(p_datos->>'id')::uuid AND creado_por=auth.uid();
  IF NOT FOUND OR o.intervencion_id IS DISTINCT FROM (origen->>'intervencion_id')::uuid OR o.titulo IS DISTINCT FROM trim(p_datos->>'titulo') OR o.necesidad IS DISTINCT FROM trim(p_datos->>'necesidad') OR o.asesor IS DISTINCT FROM trim(p_datos->>'asesor') OR o.os IS DISTINCT FROM v_os OR o.numero_oportunidad IS DISTINCT FROM numero OR (o.intervencion_id IS NULL AND (o.cliente IS DISTINCT FROM origen->>'cliente' OR o.referencia IS DISTINCT FROM origen->>'referencia' OR o.serial IS DISTINCT FROM origen->>'serial' OR o.tipo_origen IS DISTINCT FROM origen->>'tipo_origen')) THEN RAISE EXCEPTION 'El identificador corresponde a otra oportunidad'; END IF;
 END IF;
 RETURN to_jsonb(o);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Ya existe una oportunidad con ese número';
END;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_oportunidad_seguir(p_id uuid,p_revision integer,p_datos jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actual public.intervenciones_oportunidades;antes jsonb;origen jsonb;nombre text;v_os text:=p_datos->>'os';numero text:=nullif(trim(p_datos->>'numero_oportunidad'),'');v_estado text:=p_datos->>'estado';cot text:=nullif(trim(p_datos->>'cotizacion'),'');nota text:=coalesce(trim(p_datos->>'nota'),'');v_valor numeric:=(p_datos->>'valor')::numeric;
BEGIN
 IF NOT public.intervenciones_permiso('oportunidades_editar') THEN RAISE EXCEPTION 'Sin permiso para dar seguimiento comercial' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_datos) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Datos de oportunidad no válidos'; END IF;
 IF v_os IS NULL OR v_os !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'La OS debe tener exactamente cuatro cifras'; END IF;
 IF numero IS NULL OR length(numero)>100 THEN RAISE EXCEPTION 'Registra el número de oportunidad (máximo 100 caracteres)'; END IF;
 IF v_estado IS NULL OR v_estado NOT IN ('pendiente','cotizada','seguimiento','ganada','perdida') THEN RAISE EXCEPTION 'Estado no válido'; END IF;
 IF v_estado IN ('cotizada','seguimiento','ganada') AND cot IS NULL THEN RAISE EXCEPTION 'Registra el número de cotización de HANNA'; END IF;
 IF length(cot)>100 OR length(nota)>3000 THEN RAISE EXCEPTION 'La cotización u observación supera la longitud permitida'; END IF;
 IF v_estado IN ('ganada','perdida') AND nota='' THEN RAISE EXCEPTION 'Indica el resultado o motivo del cierre'; END IF;
 IF v_valor IS NOT NULL AND NOT(v_valor>=0 AND v_valor<=9007199254740991) THEN RAISE EXCEPTION 'El valor debe ser positivo o quedar vacío'; END IF;
 SELECT * INTO actual FROM public.intervenciones_oportunidades WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR p_revision IS DISTINCT FROM actual.revision THEN RAISE EXCEPTION 'La oportunidad cambió. Recarga antes de continuar.' USING ERRCODE='40001'; END IF;
 IF actual.cotizacion IS NOT NULL AND cot IS NULL THEN RAISE EXCEPTION 'Conserva el número de cotización ya asociado para no perder la trazabilidad'; END IF;
 origen:=public.intervenciones_oportunidad_origen(p_datos);
 antes:=jsonb_build_object('os',actual.os,'numero_oportunidad',actual.numero_oportunidad,'intervencion_id',actual.intervencion_id,'cliente',actual.cliente,'referencia',actual.referencia,'serial',actual.serial,'tipo_origen',actual.tipo_origen);
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 UPDATE public.intervenciones_oportunidades SET os=v_os,numero_oportunidad=numero,intervencion_id=(origen->>'intervencion_id')::uuid,cliente=origen->>'cliente',referencia=origen->>'referencia',serial=origen->>'serial',tipo_origen=origen->>'tipo_origen',estado=v_estado,cotizacion=cot,valor=v_valor,revision=actual.revision+1,
 historial=actual.historial||jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'estado',v_estado,'cotizacion',cot,'valor',v_valor,'nota',coalesce(nullif(nota,''),'Seguimiento actualizado'),'cambios',jsonb_build_object('antes',antes,'despues',origen||jsonb_build_object('os',v_os,'numero_oportunidad',numero))))
 WHERE id=p_id RETURNING * INTO actual;
 RETURN to_jsonb(actual);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Ya existe una oportunidad con ese número';
END;
$$;
-- Compatibilidad con llamadas antiguas: no permite eludir la identificación ni la validación nueva.
CREATE OR REPLACE FUNCTION public.intervenciones_oportunidad_actualizar(p_id uuid,p_revision integer,p_estado text,p_cotizacion text,p_nota text,p_valor numeric) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.intervenciones_oportunidades;
BEGIN
 IF NOT public.intervenciones_permiso('oportunidades_editar') THEN RAISE EXCEPTION 'Sin permiso para dar seguimiento comercial' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.intervenciones_oportunidades WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Oportunidad no encontrada'; END IF;
 RETURN public.intervenciones_oportunidad_seguir(p_id,p_revision,to_jsonb(r)||jsonb_build_object('estado',p_estado,'cotizacion',p_cotizacion,'nota',p_nota,'valor',p_valor));
END;
$$;
REVOKE ALL ON FUNCTION public.intervenciones_oportunidad_crear(jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.intervenciones_oportunidad_seguir(uuid,integer,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.intervenciones_oportunidad_actualizar(uuid,integer,text,text,text,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.intervenciones_oportunidad_crear(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intervenciones_oportunidad_seguir(uuid,integer,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intervenciones_oportunidad_actualizar(uuid,integer,text,text,text,numeric) TO authenticated;
COMMIT;
