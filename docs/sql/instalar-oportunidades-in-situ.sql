-- Motivos de atención y seguimiento comercial. Ejecutar después de instalar-permisos-visitas-in-situ.sql.
-- Preparado para revisión; no ejecutado en Supabase. No crea cotizaciones en sistemas externos.
BEGIN;
ALTER TABLE public.mantenimiento_intervenciones ADD COLUMN motivo_atencion text CHECK(motivo_atencion IN ('funcionamiento','orientacion','otro'));
ALTER TABLE public.mantenimiento_intervenciones ADD CONSTRAINT motivo_solo_atencion CHECK(tipo='atencion' OR motivo_atencion IS NULL);
CREATE OR REPLACE FUNCTION public.intervenciones_importar_interno(p_registros jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j jsonb; r public.mantenimiento_intervenciones; identidad_registro text; nombre text; n integer:=0; insertados integer;
BEGIN
 IF NOT (public.intervenciones_permiso('importar') OR public.intervenciones_permiso('registrar')) THEN RAISE EXCEPTION 'Sin permiso para Gestión de mantenimientos' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_registros) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Se requiere una lista de registros'; END IF;
 IF jsonb_array_length(p_registros)<1 OR jsonb_array_length(p_registros)>10000 THEN RAISE EXCEPTION 'Importa entre 1 y 10000 registros por archivo'; END IF;
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 FOR j IN SELECT value FROM jsonb_array_elements(p_registros) LOOP
  r:=jsonb_populate_record(NULL::public.mantenimiento_intervenciones,j);
  IF r.id IS NULL OR r.fecha IS NULL THEN RAISE EXCEPTION 'Falta identificador o fecha'; END IF;
  -- Independiente del tipo: reclasificar conserva la identidad del registro.
  SELECT string_agg(translate(lower(trim(v)), 'áéíóúüñ','aeiouun'),'|' ORDER BY posicion)
   INTO identidad_registro FROM unnest(ARRAY[r.fecha::text,r.referencia,r.serial,r.cliente,r.ciudad,r.informe,r.documento]) WITH ORDINALITY AS t(v,posicion);
  INSERT INTO public.mantenimiento_intervenciones(id,referencia,serial,cliente,nit,asesor,contacto,telefono,fecha,departamento,ciudad,ubicacion,documento,periodicidad,informe,observaciones,zona,tipo,historial,identidad,creado_por,motivo_atencion)
  VALUES(r.id,r.referencia,r.serial,r.cliente,r.nit,r.asesor,r.contacto,r.telefono,r.fecha,r.departamento,r.ciudad,r.ubicacion,r.documento,r.periodicidad,r.informe,r.observaciones,r.zona,r.tipo,
   jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'tipo',r.tipo,'nota','Registro incorporado')),identidad_registro,auth.uid(),CASE WHEN r.tipo='atencion' THEN r.motivo_atencion ELSE NULL END)
  ON CONFLICT(identidad) DO NOTHING;
  GET DIAGNOSTICS insertados=ROW_COUNT;n:=n+insertados;
 END LOOP;
 RETURN n;
END;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_actualizar(p_id uuid,p_revision integer,p_datos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actual public.mantenimiento_intervenciones;r public.mantenimiento_intervenciones;nombre text;identidad_registro text;cambios jsonb;
BEGIN
 IF NOT public.intervenciones_permiso('editar') THEN RAISE EXCEPTION 'Sin permiso para editar' USING ERRCODE='42501'; END IF;
 SELECT * INTO actual FROM public.mantenimiento_intervenciones WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR actual.revision<>p_revision THEN RAISE EXCEPTION 'El registro cambió. Recarga antes de continuar.'; END IF;
 r:=jsonb_populate_record(NULL::public.mantenimiento_intervenciones,p_datos);
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 SELECT string_agg(translate(lower(trim(v)), 'áéíóúüñ','aeiouun'),'|' ORDER BY posicion)
 INTO identidad_registro FROM unnest(ARRAY[r.fecha::text,r.referencia,r.serial,r.cliente,r.ciudad,r.informe,r.documento]) WITH ORDINALITY AS t(v,posicion);
 SELECT coalesce(jsonb_agg(jsonb_build_object('campo',k,'antes',to_jsonb(actual)->k,'despues',p_datos->k)),'[]') INTO cambios
 FROM unnest(ARRAY['referencia','serial','cliente','nit','asesor','contacto','telefono','fecha','departamento','ciudad','ubicacion','documento','periodicidad','informe','observaciones','zona','tipo','motivo_atencion']) k WHERE to_jsonb(actual)->k IS DISTINCT FROM p_datos->k;
 UPDATE public.mantenimiento_intervenciones SET referencia=r.referencia,serial=r.serial,cliente=r.cliente,nit=r.nit,asesor=r.asesor,contacto=r.contacto,telefono=r.telefono,fecha=r.fecha,departamento=r.departamento,ciudad=r.ciudad,ubicacion=r.ubicacion,documento=r.documento,periodicidad=r.periodicidad,informe=r.informe,observaciones=r.observaciones,zona=r.zona,tipo=r.tipo,motivo_atencion=CASE WHEN r.tipo='atencion' THEN r.motivo_atencion ELSE NULL END,identidad=identidad_registro,revision=actual.revision+1,
 historial=actual.historial||jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'tipo',r.tipo,'nota','Datos de la intervención actualizados','cambios',cambios)) WHERE id=p_id;
END;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_reclasificar(p_id uuid,p_revision integer,p_tipo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE nombre text;
BEGIN
 IF NOT public.intervenciones_permiso('editar') THEN RAISE EXCEPTION 'Sin permiso para Gestión de mantenimientos' USING ERRCODE='42501'; END IF;
 IF p_tipo IS NULL OR p_tipo NOT IN ('preventivo','correctivo','atencion') THEN RAISE EXCEPTION 'Tipo no válido'; END IF;
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 UPDATE public.mantenimiento_intervenciones SET tipo=p_tipo,motivo_atencion=CASE WHEN p_tipo='atencion' THEN motivo_atencion ELSE NULL END,revision=revision+1,
 historial=historial||jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'tipo',p_tipo,'nota','Tipo de intervención actualizado'))
 WHERE id=p_id AND revision=p_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'El registro cambió. Recarga antes de continuar.'; END IF;
END;
$$;

CREATE TABLE public.intervenciones_oportunidades (
 id uuid PRIMARY KEY,intervencion_id uuid NOT NULL REFERENCES public.mantenimiento_intervenciones(id),
 titulo text NOT NULL CHECK(length(trim(titulo)) BETWEEN 3 AND 200),necesidad text NOT NULL CHECK(length(trim(necesidad)) BETWEEN 10 AND 3000),asesor text NOT NULL CHECK(length(trim(asesor)) BETWEEN 1 AND 200),
 cliente text NOT NULL,referencia text NOT NULL,serial text NOT NULL,tipo_origen text NOT NULL CHECK(tipo_origen IN ('preventivo','correctivo','atencion')),
 estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','cotizada','seguimiento','ganada','perdida')),
 cotizacion text CHECK(length(trim(cotizacion)) BETWEEN 1 AND 100),valor numeric CHECK(valor>=0 AND valor<=9007199254740991),
 revision integer NOT NULL DEFAULT 1,historial jsonb NOT NULL CHECK(jsonb_typeof(historial)='array'),
 creado_por uuid NOT NULL REFERENCES public.profiles(id),created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(estado NOT IN ('cotizada','seguimiento','ganada') OR cotizacion IS NOT NULL)
);
CREATE INDEX oportunidades_intervencion ON public.intervenciones_oportunidades(intervencion_id);
CREATE INDEX oportunidades_estado ON public.intervenciones_oportunidades(estado,created_at DESC);
ALTER TABLE public.intervenciones_oportunidades ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intervenciones_oportunidades FROM anon,authenticated;
GRANT SELECT ON public.intervenciones_oportunidades TO authenticated;
CREATE POLICY oportunidades_lectura ON public.intervenciones_oportunidades FOR SELECT TO authenticated USING(public.intervenciones_permiso('ver'));
CREATE FUNCTION public.intervenciones_oportunidad_crear(p_datos jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE origen public.mantenimiento_intervenciones;o public.intervenciones_oportunidades;nombre text;
BEGIN
 IF NOT public.intervenciones_permiso('registrar') THEN RAISE EXCEPTION 'Sin permiso para registrar oportunidades' USING ERRCODE='42501'; END IF;
 SELECT * INTO origen FROM public.mantenimiento_intervenciones WHERE id=(p_datos->>'intervencion_id')::uuid;
 IF NOT FOUND THEN RAISE EXCEPTION 'La intervención de origen no existe'; END IF;
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 INSERT INTO public.intervenciones_oportunidades(id,intervencion_id,titulo,necesidad,asesor,cliente,referencia,serial,tipo_origen,historial,creado_por)
 VALUES((p_datos->>'id')::uuid,origen.id,trim(p_datos->>'titulo'),trim(p_datos->>'necesidad'),trim(p_datos->>'asesor'),origen.cliente,origen.referencia,origen.serial,origen.tipo,
 jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'estado','pendiente','cotizacion',NULL,'valor',NULL,'nota','Oportunidad detectada: pendiente de cotizar en la intranet principal de HANNA')),auth.uid())
 ON CONFLICT(id) DO NOTHING RETURNING * INTO o;
 IF NOT FOUND THEN
  SELECT * INTO o FROM public.intervenciones_oportunidades WHERE id=(p_datos->>'id')::uuid AND creado_por=auth.uid();
  IF NOT FOUND OR o.intervencion_id IS DISTINCT FROM origen.id OR o.titulo IS DISTINCT FROM trim(p_datos->>'titulo') OR o.necesidad IS DISTINCT FROM trim(p_datos->>'necesidad') OR o.asesor IS DISTINCT FROM trim(p_datos->>'asesor') THEN RAISE EXCEPTION 'El identificador corresponde a otra oportunidad'; END IF;
 END IF;
 RETURN to_jsonb(o);
END;
$$;
CREATE FUNCTION public.intervenciones_oportunidad_actualizar(p_id uuid,p_revision integer,p_estado text,p_cotizacion text,p_nota text,p_valor numeric) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actual public.intervenciones_oportunidades;nombre text;
BEGIN
 IF NOT public.intervenciones_permiso('editar') THEN RAISE EXCEPTION 'Sin permiso para dar seguimiento comercial' USING ERRCODE='42501'; END IF;
 IF p_estado IN ('ganada','perdida') AND coalesce(length(trim(p_nota)),0)=0 THEN RAISE EXCEPTION 'Indica el motivo o resultado del cierre'; END IF;
 IF length(p_nota)>3000 THEN RAISE EXCEPTION 'La observación supera 3000 caracteres'; END IF;
 SELECT * INTO actual FROM public.intervenciones_oportunidades WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR actual.revision<>p_revision THEN RAISE EXCEPTION 'La oportunidad cambió. Recarga antes de continuar.'; END IF;
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 UPDATE public.intervenciones_oportunidades SET estado=p_estado,cotizacion=nullif(trim(p_cotizacion),''),valor=p_valor,revision=revision+1,
 historial=historial||jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'estado',p_estado,'cotizacion',nullif(trim(p_cotizacion),''),'valor',p_valor,'nota',coalesce(nullif(trim(p_nota),''),'Seguimiento actualizado')))
 WHERE id=p_id RETURNING * INTO actual;
 RETURN to_jsonb(actual);
END;
$$;
REVOKE ALL ON FUNCTION public.intervenciones_oportunidad_crear(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.intervenciones_oportunidad_actualizar(uuid,integer,text,text,text,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_oportunidad_crear(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intervenciones_oportunidad_actualizar(uuid,integer,text,text,text,numeric) TO authenticated;
COMMIT;
