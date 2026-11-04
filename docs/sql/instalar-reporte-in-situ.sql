-- Reporte in situ: ejecutar después de instalar-gestion-mantenimientos.sql.
-- Preparado para revisión; no ejecutado en Supabase.
BEGIN;
CREATE TABLE public.mantenimiento_intervenciones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 referencia text NOT NULL CHECK(length(trim(referencia)) BETWEEN 1 AND 300),
 serial text NOT NULL DEFAULT '', cliente text NOT NULL CHECK(length(trim(cliente)) BETWEEN 1 AND 300),
 nit text NOT NULL DEFAULT '', asesor text NOT NULL DEFAULT '', contacto text NOT NULL DEFAULT '', telefono text NOT NULL DEFAULT '',
 fecha date NOT NULL, departamento text NOT NULL DEFAULT '', ciudad text NOT NULL CHECK(length(trim(ciudad)) BETWEEN 1 AND 300),
 ubicacion text NOT NULL DEFAULT '', documento text NOT NULL DEFAULT '', periodicidad integer CHECK(periodicidad BETWEEN 1 AND 3650),
 informe text NOT NULL DEFAULT '', observaciones text NOT NULL DEFAULT '', zona text NOT NULL DEFAULT '',
 tipo text NOT NULL CHECK(tipo IN ('preventivo','correctivo','atencion')),
 historial jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(historial)='array'),
 revision integer NOT NULL DEFAULT 1,
 identidad text NOT NULL UNIQUE,
 creado_por uuid NOT NULL REFERENCES public.profiles(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mantenimiento_intervenciones_fecha ON public.mantenimiento_intervenciones(fecha DESC,id);
CREATE INDEX mantenimiento_intervenciones_serial ON public.mantenimiento_intervenciones(serial,referencia);
ALTER TABLE public.mantenimiento_intervenciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mantenimiento_intervenciones FROM anon,authenticated;
GRANT SELECT ON public.mantenimiento_intervenciones TO authenticated;
CREATE POLICY intervenciones_lectura ON public.mantenimiento_intervenciones FOR SELECT TO authenticated USING(public.gestion_mantenimientos_permitido());

CREATE FUNCTION public.intervenciones_importar(p_registros jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE j jsonb; r public.mantenimiento_intervenciones; identidad_registro text; nombre text; n integer:=0; insertados integer;
BEGIN
 IF NOT public.gestion_mantenimientos_permitido() THEN RAISE EXCEPTION 'Sin permiso para Gestión de mantenimientos' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_registros) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Se requiere una lista de registros'; END IF;
 IF jsonb_array_length(p_registros)<1 OR jsonb_array_length(p_registros)>10000 THEN RAISE EXCEPTION 'Importa entre 1 y 10000 registros por archivo'; END IF;
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 FOR j IN SELECT value FROM jsonb_array_elements(p_registros) LOOP
  r:=jsonb_populate_record(NULL::public.mantenimiento_intervenciones,j);
  IF r.id IS NULL OR r.fecha IS NULL THEN RAISE EXCEPTION 'Falta identificador o fecha'; END IF;
  -- Independiente del tipo: reclasificar conserva la identidad del registro.
  SELECT string_agg(translate(lower(trim(v)), 'áéíóúüñ','aeiouun'),'|' ORDER BY posicion)
   INTO identidad_registro FROM unnest(ARRAY[r.fecha::text,r.referencia,r.serial,r.cliente,r.ciudad,r.informe,r.documento]) WITH ORDINALITY AS t(v,posicion);
  INSERT INTO public.mantenimiento_intervenciones(id,referencia,serial,cliente,nit,asesor,contacto,telefono,fecha,departamento,ciudad,ubicacion,documento,periodicidad,informe,observaciones,zona,tipo,historial,identidad,creado_por)
  VALUES(r.id,r.referencia,r.serial,r.cliente,r.nit,r.asesor,r.contacto,r.telefono,r.fecha,r.departamento,r.ciudad,r.ubicacion,r.documento,r.periodicidad,r.informe,r.observaciones,r.zona,r.tipo,
   jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'tipo',r.tipo,'nota','Registro incorporado')),identidad_registro,auth.uid())
  ON CONFLICT(identidad) DO NOTHING;
  GET DIAGNOSTICS insertados=ROW_COUNT;n:=n+insertados;
 END LOOP;
 RETURN n;
END;
$$;
CREATE FUNCTION public.intervenciones_reclasificar(p_id uuid,p_revision integer,p_tipo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE nombre text;
BEGIN
 IF NOT public.gestion_mantenimientos_permitido() THEN RAISE EXCEPTION 'Sin permiso para Gestión de mantenimientos' USING ERRCODE='42501'; END IF;
 IF p_tipo IS NULL OR p_tipo NOT IN ('preventivo','correctivo','atencion') THEN RAISE EXCEPTION 'Tipo no válido'; END IF;
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 UPDATE public.mantenimiento_intervenciones SET tipo=p_tipo,revision=revision+1,
 historial=historial||jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'tipo',p_tipo,'nota','Tipo de intervención actualizado'))
 WHERE id=p_id AND revision=p_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'El registro cambió. Recarga antes de continuar.'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.intervenciones_importar(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.intervenciones_reclasificar(uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_importar(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intervenciones_reclasificar(uuid,integer,text) TO authenticated;
COMMIT;
