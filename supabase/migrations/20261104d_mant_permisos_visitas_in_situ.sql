-- Permisos individuales de visitas in situ. Ejecutar después de instalar-alertas-in-situ.sql.
-- Preparado para revisión; no ejecutado en Supabase.
BEGIN;
CREATE TABLE public.intervenciones_permisos (
 usuario_id uuid PRIMARY KEY REFERENCES public.profiles(id),
 ver boolean NOT NULL DEFAULT false,registrar boolean NOT NULL DEFAULT false,editar boolean NOT NULL DEFAULT false,
 importar boolean NOT NULL DEFAULT false,exportar boolean NOT NULL DEFAULT false,buzon boolean NOT NULL DEFAULT false,
 actualizado_por uuid REFERENCES public.profiles(id),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ver OR NOT(registrar OR editar OR importar OR exportar OR buzon))
);
INSERT INTO public.intervenciones_permisos(usuario_id,ver,buzon)
 SELECT unnest(destinatarios),true,true FROM public.intervenciones_alertas_config;
CREATE TABLE public.intervenciones_permisos_historial (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,usuario_id uuid NOT NULL REFERENCES public.profiles(id),
 administrador_id uuid NOT NULL REFERENCES public.profiles(id),antes jsonb,despues jsonb NOT NULL,fecha timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.intervenciones_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervenciones_permisos_historial ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intervenciones_permisos,public.intervenciones_permisos_historial FROM anon,authenticated;
CREATE FUNCTION public.intervenciones_es_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.intervenciones_alertas_config c JOIN public.profiles p ON p.id=c.administrador_id WHERE p.id=auth.uid() AND p.activo);
$$;
CREATE FUNCTION public.intervenciones_permiso(p_permiso text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND activo)
 AND p_permiso IN ('ver','registrar','editar','importar','exportar','buzon')
 AND (public.intervenciones_es_admin() OR EXISTS(SELECT 1 FROM public.intervenciones_permisos WHERE usuario_id=auth.uid() AND
 CASE p_permiso WHEN 'ver' THEN ver WHEN 'registrar' THEN registrar WHEN 'editar' THEN editar WHEN 'importar' THEN importar WHEN 'exportar' THEN exportar WHEN 'buzon' THEN buzon ELSE false END));
$$;
CREATE FUNCTION public.intervenciones_mis_permisos() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('administrador',public.intervenciones_es_admin(),'ver',public.intervenciones_permiso('ver'),'registrar',public.intervenciones_permiso('registrar'),'editar',public.intervenciones_permiso('editar'),'importar',public.intervenciones_permiso('importar'),'exportar',public.intervenciones_permiso('exportar'),'buzon',public.intervenciones_permiso('buzon'));
$$;
CREATE FUNCTION public.intervenciones_permisos_listar() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_es_admin() THEN RAISE EXCEPTION 'Sólo Andrés Latorre puede administrar accesos' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_object_agg(usuario_id::text,jsonb_build_object('ver',ver,'registrar',registrar,'editar',editar,'importar',importar,'exportar',exportar,'buzon',buzon)),'{}') FROM public.intervenciones_permisos);
END;
$$;
CREATE FUNCTION public.intervenciones_permisos_guardar(p_usuario uuid,p_permisos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE antes jsonb;despues jsonb;k text;
BEGIN
 IF NOT public.intervenciones_es_admin() THEN RAISE EXCEPTION 'Sólo Andrés Latorre puede administrar accesos' USING ERRCODE='42501'; END IF;
 IF p_usuario=auth.uid() THEN RAISE EXCEPTION 'El propietario conserva el acceso completo y la administración'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_usuario AND activo) THEN RAISE EXCEPTION 'Selecciona un perfil activo'; END IF;
 FOREACH k IN ARRAY ARRAY['ver','registrar','editar','importar','exportar','buzon'] LOOP
  IF jsonb_typeof(p_permisos->k) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Los permisos deben ser booleanos'; END IF;
 END LOOP;
 SELECT to_jsonb(p) INTO antes FROM public.intervenciones_permisos p WHERE usuario_id=p_usuario FOR UPDATE;
 INSERT INTO public.intervenciones_permisos(usuario_id,ver,registrar,editar,importar,exportar,buzon,actualizado_por)
 VALUES(p_usuario,(p_permisos->>'ver')::boolean,(p_permisos->>'registrar')::boolean,(p_permisos->>'editar')::boolean,(p_permisos->>'importar')::boolean,(p_permisos->>'exportar')::boolean,(p_permisos->>'buzon')::boolean,auth.uid())
 ON CONFLICT(usuario_id) DO UPDATE SET ver=excluded.ver,registrar=excluded.registrar,editar=excluded.editar,importar=excluded.importar,exportar=excluded.exportar,buzon=excluded.buzon,actualizado_por=auth.uid(),updated_at=now();
 SELECT to_jsonb(p) INTO despues FROM public.intervenciones_permisos p WHERE usuario_id=p_usuario;
 INSERT INTO public.intervenciones_permisos_historial(usuario_id,administrador_id,antes,despues) VALUES(p_usuario,auth.uid(),antes,despues);
END;
$$;
DROP POLICY intervenciones_lectura ON public.mantenimiento_intervenciones;
CREATE POLICY intervenciones_lectura ON public.mantenimiento_intervenciones FOR SELECT TO authenticated USING(public.intervenciones_permiso('ver'));
DROP POLICY alertas_config_lectura ON public.intervenciones_alertas_config;
CREATE POLICY alertas_config_lectura ON public.intervenciones_alertas_config FOR SELECT TO authenticated USING(public.intervenciones_permiso('ver'));
DROP POLICY alertas_leidas_lectura ON public.intervenciones_alertas_leidas;
CREATE POLICY alertas_leidas_lectura ON public.intervenciones_alertas_leidas FOR SELECT TO authenticated USING(usuario_id=auth.uid() AND public.intervenciones_permiso('buzon'));

CREATE FUNCTION public.intervenciones_importar_interno(p_registros jsonb) RETURNS integer
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
  INSERT INTO public.mantenimiento_intervenciones(id,referencia,serial,cliente,nit,asesor,contacto,telefono,fecha,departamento,ciudad,ubicacion,documento,periodicidad,informe,observaciones,zona,tipo,historial,identidad,creado_por)
  VALUES(r.id,r.referencia,r.serial,r.cliente,r.nit,r.asesor,r.contacto,r.telefono,r.fecha,r.departamento,r.ciudad,r.ubicacion,r.documento,r.periodicidad,r.informe,r.observaciones,r.zona,r.tipo,
   jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'tipo',r.tipo,'nota','Registro incorporado')),identidad_registro,auth.uid())
  ON CONFLICT(identidad) DO NOTHING;
  GET DIAGNOSTICS insertados=ROW_COUNT;n:=n+insertados;
 END LOOP;
 RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.intervenciones_importar_interno(jsonb) FROM PUBLIC,authenticated,anon;
CREATE OR REPLACE FUNCTION public.intervenciones_importar(p_registros jsonb) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_permiso('importar') THEN RAISE EXCEPTION 'Sin permiso para importar' USING ERRCODE='42501'; END IF;
 RETURN public.intervenciones_importar_interno(p_registros);
END;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_crear(p_registros jsonb) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_permiso('registrar') THEN RAISE EXCEPTION 'Sin permiso para registrar' USING ERRCODE='42501'; END IF;
 IF jsonb_array_length(p_registros) IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Registra una intervención por solicitud'; END IF;
 RETURN public.intervenciones_importar_interno(p_registros);
END;
$$;

CREATE OR REPLACE FUNCTION public.intervenciones_reclasificar(p_id uuid,p_revision integer,p_tipo text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE nombre text;
BEGIN
 IF NOT public.intervenciones_permiso('editar') THEN RAISE EXCEPTION 'Sin permiso para Gestión de mantenimientos' USING ERRCODE='42501'; END IF;
 IF p_tipo IS NULL OR p_tipo NOT IN ('preventivo','correctivo','atencion') THEN RAISE EXCEPTION 'Tipo no válido'; END IF;
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 UPDATE public.mantenimiento_intervenciones SET tipo=p_tipo,revision=revision+1,
 historial=historial||jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'tipo',p_tipo,'nota','Tipo de intervención actualizado'))
 WHERE id=p_id AND revision=p_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'El registro cambió. Recarga antes de continuar.'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.intervenciones_alertas_configuracion() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.intervenciones_alertas_config;destinos jsonb;
BEGIN
 IF NOT public.intervenciones_permiso('ver') THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT c FROM public.intervenciones_alertas_config WHERE id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nombre',coalesce(nullif(trim(p.full_name),''),p.email,p.id::text)) ORDER BY p.full_name),'[]') INTO destinos FROM public.profiles p WHERE (EXISTS(SELECT 1 FROM public.intervenciones_permisos ip WHERE ip.usuario_id=p.id AND ip.buzon) OR p.id=c.administrador_id) AND p.activo;
 RETURN jsonb_build_object('administrador_id',c.administrador_id,'anticipado',c.anticipado,'proximo',c.proximo,'urgente',c.urgente,'destinatarios',destinos);
END;
$$;

CREATE OR REPLACE FUNCTION public.intervenciones_alertas_perfiles() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_es_admin() THEN RAISE EXCEPTION 'Sólo Andrés Latorre puede administrar perfiles y alertas' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'activo',activo,'nombre',coalesce(nullif(trim(full_name),''),email,id::text)) ORDER BY full_name),'[]') FROM public.profiles);
END;
$$;

CREATE OR REPLACE FUNCTION public.intervenciones_alertas_configurar(p_config jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE ids uuid[];a integer;p integer;u integer;
BEGIN
 IF NOT public.intervenciones_es_admin() THEN RAISE EXCEPTION 'Sólo Andrés Latorre puede administrar perfiles y alertas' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_config->'anticipado') IS DISTINCT FROM 'number' OR jsonb_typeof(p_config->'proximo') IS DISTINCT FROM 'number' OR jsonb_typeof(p_config->'urgente') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Plazos no válidos'; END IF;
 a:=(p_config->>'anticipado')::integer;p:=(p_config->>'proximo')::integer;u:=(p_config->>'urgente')::integer;
 UPDATE public.intervenciones_alertas_config SET anticipado=a,proximo=p,urgente=u,actualizado_por=auth.uid(),updated_at=now() WHERE id;
END;
$$;

CREATE OR REPLACE FUNCTION public.intervenciones_alertas_marcar(p_claves text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_permiso('buzon') THEN RAISE EXCEPTION 'Sin acceso al buzón' USING ERRCODE='42501'; END IF;
 IF p_claves IS NULL OR cardinality(p_claves)>1000 THEN RAISE EXCEPTION 'Lista de avisos no válida'; END IF;
 INSERT INTO public.intervenciones_alertas_leidas(usuario_id,clave) SELECT auth.uid(),k FROM unnest(p_claves) k ON CONFLICT DO NOTHING;
END;
$$;

CREATE FUNCTION public.intervenciones_actualizar(p_id uuid,p_revision integer,p_datos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
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
 FROM unnest(ARRAY['referencia','serial','cliente','nit','asesor','contacto','telefono','fecha','departamento','ciudad','ubicacion','documento','periodicidad','informe','observaciones','zona','tipo']) k WHERE to_jsonb(actual)->k IS DISTINCT FROM p_datos->k;
 UPDATE public.mantenimiento_intervenciones SET referencia=r.referencia,serial=r.serial,cliente=r.cliente,nit=r.nit,asesor=r.asesor,contacto=r.contacto,telefono=r.telefono,fecha=r.fecha,departamento=r.departamento,ciudad=r.ciudad,ubicacion=r.ubicacion,documento=r.documento,periodicidad=r.periodicidad,informe=r.informe,observaciones=r.observaciones,zona=r.zona,tipo=r.tipo,identidad=identidad_registro,revision=actual.revision+1,
 historial=actual.historial||jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'tipo',r.tipo,'nota','Datos de la intervención actualizados','cambios',cambios)) WHERE id=p_id;
END;
$$;
CREATE FUNCTION public.intervenciones_exportar(p_ids uuid[]) RETURNS SETOF public.mantenimiento_intervenciones LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_permiso('exportar') THEN RAISE EXCEPTION 'Sin permiso para exportar' USING ERRCODE='42501'; END IF;
 IF p_ids IS NULL OR cardinality(p_ids)>10000 THEN RAISE EXCEPTION 'Exporta hasta 10000 registros por archivo'; END IF;
 RETURN QUERY SELECT * FROM public.mantenimiento_intervenciones WHERE id=ANY(p_ids) ORDER BY fecha,id;
END;
$$;
REVOKE ALL ON FUNCTION public.intervenciones_es_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_es_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.intervenciones_permiso(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_permiso(text) TO authenticated;
REVOKE ALL ON FUNCTION public.intervenciones_mis_permisos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_mis_permisos() TO authenticated;
REVOKE ALL ON FUNCTION public.intervenciones_permisos_listar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_permisos_listar() TO authenticated;
REVOKE ALL ON FUNCTION public.intervenciones_permisos_guardar(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_permisos_guardar(uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.intervenciones_crear(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_crear(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.intervenciones_actualizar(uuid,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_actualizar(uuid,integer,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.intervenciones_exportar(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_exportar(uuid[]) TO authenticated;
COMMIT;
