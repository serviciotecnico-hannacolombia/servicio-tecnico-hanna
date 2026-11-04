-- Ejecutar después de instalar-reporte-in-situ.sql. No envía correos.
BEGIN;
CREATE TABLE public.intervenciones_alertas_config (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),administrador_id uuid NOT NULL REFERENCES public.profiles(id),anticipado integer NOT NULL DEFAULT 90,
 proximo integer NOT NULL DEFAULT 30,urgente integer NOT NULL DEFAULT 7,
 destinatarios uuid[] NOT NULL DEFAULT '{}',actualizado_por uuid REFERENCES public.profiles(id),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(urgente>=0 AND urgente<proximo AND proximo<anticipado AND anticipado<=365)
);
-- Resolver una sola vez al propietario; después se autoriza por UUID, nunca por nombre mutable.
DO $$
DECLARE propietario uuid; coincidencias integer;
BEGIN
 SELECT count(*) INTO coincidencias FROM public.profiles WHERE activo AND translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mandres\M' AND translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mlatorre\M';
 IF coincidencias<>1 THEN RAISE EXCEPTION 'Se requiere un único perfil activo de Andrés Latorre. El administrador debe verificar su UUID antes de instalar.'; END IF;
 SELECT id INTO propietario FROM public.profiles WHERE activo AND translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mandres\M' AND translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mlatorre\M';
 INSERT INTO public.intervenciones_alertas_config(id,administrador_id,destinatarios)
 SELECT true,propietario,coalesce(array_agg(id),'{}') FROM public.profiles WHERE activo AND (
 translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mandres\M' AND translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mlatorre\M'
 OR translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mbrayan\M' AND translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mgaleano\M'
 OR translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mjuan\M' AND translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mcamilo\M' AND translate(lower(full_name),'áéíóúñ','aeioun') ~ '\mpenuela\M');
END;
$$;
ALTER TABLE public.intervenciones_alertas_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intervenciones_alertas_config FROM anon,authenticated;
GRANT SELECT ON public.intervenciones_alertas_config TO authenticated;
CREATE POLICY alertas_config_lectura ON public.intervenciones_alertas_config FOR SELECT TO authenticated USING(public.gestion_mantenimientos_permitido());
CREATE TABLE public.intervenciones_alertas_leidas (
 usuario_id uuid NOT NULL REFERENCES public.profiles(id),clave text NOT NULL CHECK(length(clave) BETWEEN 1 AND 200),
 leida_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(usuario_id,clave)
);
ALTER TABLE public.intervenciones_alertas_leidas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intervenciones_alertas_leidas FROM anon,authenticated;
GRANT SELECT ON public.intervenciones_alertas_leidas TO authenticated;
CREATE POLICY alertas_leidas_lectura ON public.intervenciones_alertas_leidas FOR SELECT TO authenticated USING(usuario_id=auth.uid() AND public.gestion_mantenimientos_permitido());

CREATE FUNCTION public.intervenciones_alertas_configuracion() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.intervenciones_alertas_config;destinos jsonb;
BEGIN
 IF NOT public.gestion_mantenimientos_permitido() THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT c FROM public.intervenciones_alertas_config WHERE id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nombre',coalesce(nullif(trim(p.full_name),''),p.email,p.id::text)) ORDER BY p.full_name),'[]') INTO destinos FROM public.profiles p WHERE p.id=ANY(c.destinatarios) AND p.activo;
 RETURN jsonb_build_object('administrador_id',c.administrador_id,'anticipado',c.anticipado,'proximo',c.proximo,'urgente',c.urgente,'destinatarios',destinos);
END;
$$;
CREATE FUNCTION public.intervenciones_alertas_perfiles() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.gestion_mantenimientos_permitido() OR NOT EXISTS(SELECT 1 FROM public.intervenciones_alertas_config WHERE administrador_id=auth.uid()) THEN RAISE EXCEPTION 'Sólo Andrés Latorre puede administrar perfiles y alertas' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'activo',activo,'nombre',coalesce(nullif(trim(full_name),''),email,id::text)) ORDER BY full_name),'[]') FROM public.profiles);
END;
$$;
CREATE FUNCTION public.intervenciones_alertas_configurar(p_config jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE ids uuid[];a integer;p integer;u integer;
BEGIN
 IF NOT public.gestion_mantenimientos_permitido() OR NOT EXISTS(SELECT 1 FROM public.intervenciones_alertas_config WHERE administrador_id=auth.uid()) THEN RAISE EXCEPTION 'Sólo Andrés Latorre puede administrar perfiles y alertas' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_config->'destinatarios') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Destinatarios no válidos'; END IF;
 IF jsonb_array_length(p_config->'destinatarios')>50 THEN RAISE EXCEPTION 'Máximo 50 destinatarios'; END IF;
 IF jsonb_typeof(p_config->'anticipado') IS DISTINCT FROM 'number' OR jsonb_typeof(p_config->'proximo') IS DISTINCT FROM 'number' OR jsonb_typeof(p_config->'urgente') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Plazos no válidos'; END IF;
 a:=(p_config->>'anticipado')::integer;p:=(p_config->>'proximo')::integer;u:=(p_config->>'urgente')::integer;
 SELECT coalesce(array_agg(DISTINCT (x->>'id')::uuid),'{}') INTO ids FROM jsonb_array_elements(p_config->'destinatarios') x;
 IF EXISTS(SELECT 1 FROM unnest(ids) AS t(id) WHERE id IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=t.id AND p.activo)) THEN RAISE EXCEPTION 'Selecciona perfiles activos'; END IF;
 IF NOT auth.uid()=ANY(ids) THEN RAISE EXCEPTION 'El administrador debe conservar su acceso al buzón'; END IF;
 UPDATE public.intervenciones_alertas_config SET anticipado=a,proximo=p,urgente=u,destinatarios=ids,actualizado_por=auth.uid(),updated_at=now() WHERE id;
END;
$$;
CREATE FUNCTION public.intervenciones_alertas_marcar(p_claves text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.gestion_mantenimientos_permitido() OR NOT EXISTS(SELECT 1 FROM public.intervenciones_alertas_config WHERE auth.uid()=ANY(destinatarios)) THEN RAISE EXCEPTION 'Sin acceso al buzón' USING ERRCODE='42501'; END IF;
 IF p_claves IS NULL OR cardinality(p_claves)>1000 THEN RAISE EXCEPTION 'Lista de avisos no válida'; END IF;
 INSERT INTO public.intervenciones_alertas_leidas(usuario_id,clave) SELECT auth.uid(),k FROM unnest(p_claves) k ON CONFLICT DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.intervenciones_alertas_configuracion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.intervenciones_alertas_perfiles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.intervenciones_alertas_configurar(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.intervenciones_alertas_marcar(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_alertas_configuracion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.intervenciones_alertas_perfiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.intervenciones_alertas_configurar(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.intervenciones_alertas_marcar(text[]) TO authenticated;
COMMIT;
