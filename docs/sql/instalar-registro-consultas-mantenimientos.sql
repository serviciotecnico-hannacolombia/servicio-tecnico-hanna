-- Registro de consultas de calculadoras normal y regional.
-- Aplicar después de 20261019_gestion_mantenimientos.sql. Preparado, no aplicado a producción.
BEGIN;
INSERT INTO public.capabilities(key) VALUES('mant_consultas_reportes') ON CONFLICT DO NOTHING;
INSERT INTO public.role_capabilities(role_id,capability_key)
 SELECT id,'mant_consultas_reportes' FROM public.roles WHERE translate(lower(trim(name)),'é','e')='servicio tecnico'
 ON CONFLICT DO NOTHING;
INSERT INTO public.role_modules(role_id,module_key)
 SELECT id,'gestion_mantenimientos' FROM public.roles WHERE translate(lower(trim(name)),'é','e')='servicio tecnico'
 ON CONFLICT DO NOTHING;

CREATE FUNCTION public.mantenimiento_consultas_lectura_permitida() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id=p.role_id WHERE p.id=auth.uid() AND p.activo AND translate(lower(trim(r.name)),'é','e')='servicio tecnico')
 AND public.has_capability('mant_consultas_reportes');
$$;
REVOKE ALL ON FUNCTION public.mantenimiento_consultas_lectura_permitida() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mantenimiento_consultas_lectura_permitida() TO authenticated;
CREATE TABLE public.mantenimiento_consultas (
 id uuid PRIMARY KEY,
 modulo text NOT NULL CHECK(modulo IN ('normal','regional')),
 razon_social text NOT NULL CHECK(length(trim(razon_social)) BETWEEN 2 AND 200),
 zona text NOT NULL CHECK(length(trim(zona)) BETWEEN 2 AND 300),
 origen text NOT NULL CHECK(length(trim(origen)) BETWEEN 1 AND 300),
 destino_codigo text NOT NULL CHECK(destino_codigo ~ '^[0-9]{5}$'),
 departamento text NOT NULL CHECK(length(trim(departamento)) BETWEEN 1 AND 100),
 municipio text NOT NULL CHECK(length(trim(municipio)) BETWEEN 1 AND 150),
 equipos jsonb NOT NULL CHECK(jsonb_typeof(equipos)='array' AND jsonb_array_length(equipos)>0),
 total numeric NOT NULL CHECK(total>0 AND total<=9007199254740991),
 dias integer NOT NULL CHECK(dias>0),
 usuario_id uuid NOT NULL REFERENCES public.profiles(id),
 usuario_nombre text NOT NULL,usuario_email text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mantenimiento_consultas_fecha_idx ON public.mantenimiento_consultas(created_at DESC);
CREATE INDEX mantenimiento_consultas_usuario_fecha_idx ON public.mantenimiento_consultas(usuario_id,created_at DESC);
CREATE INDEX mantenimiento_consultas_zona_idx ON public.mantenimiento_consultas(modulo,departamento,municipio);
ALTER TABLE public.mantenimiento_consultas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.mantenimiento_consultas FROM anon,authenticated;
GRANT SELECT ON TABLE public.mantenimiento_consultas TO authenticated;
CREATE POLICY mantenimiento_consultas_lectura ON public.mantenimiento_consultas FOR SELECT TO authenticated
 USING(public.mantenimiento_consultas_lectura_permitida());

CREATE FUNCTION public.mantenimiento_registrar_consulta(p_id uuid,p_consulta jsonb,p_razon_social text,p_zona text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.mantenimiento_consultas; nombre text; correo text; modulo_consulta text:=p_consulta->>'modulo'; i jsonb; n numeric;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND activo) THEN RAISE EXCEPTION 'Usuario no autorizado' USING ERRCODE='42501'; END IF;
 IF modulo_consulta IS NULL OR modulo_consulta NOT IN ('normal','regional') THEN RAISE EXCEPTION 'Calculadora no válida'; END IF;
 IF NOT public.has_module(CASE WHEN modulo_consulta='normal' THEN 'mant_in_situ' ELSE 'mant_in_situ_regional' END) THEN RAISE EXCEPTION 'Sin acceso a la calculadora' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_consulta IS NULL OR jsonb_typeof(p_consulta) IS DISTINCT FROM 'object'
 OR jsonb_typeof(p_consulta->'equipos') IS DISTINCT FROM 'array'
 OR jsonb_typeof(p_consulta->'total') IS DISTINCT FROM 'number'
 OR jsonb_typeof(p_consulta->'dias') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Consulta incompleta'; END IF;
 IF jsonb_array_length(p_consulta->'equipos')=0 THEN RAISE EXCEPTION 'Selecciona al menos un equipo'; END IF;
 FOR i IN SELECT value FROM jsonb_array_elements(p_consulta->'equipos') LOOP
   IF coalesce(length(trim(i->>'referencia')),0)=0 OR jsonb_typeof(i->'cantidad') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Equipo incompleto'; END IF;
   n:=(i->>'cantidad')::numeric;
   IF n<1 OR n<>trunc(n) OR n>9999 THEN RAISE EXCEPTION 'Cantidad no válida'; END IF;
 END LOOP;
 n:=(p_consulta->>'dias')::numeric;
 IF n<>trunc(n) OR n<1 OR n>2147483647 THEN RAISE EXCEPTION 'Días no válidos'; END IF;
 SELECT coalesce(nullif(trim(full_name),''),email,id::text),coalesce(email,'') INTO nombre,correo FROM public.profiles WHERE id=auth.uid();
 INSERT INTO public.mantenimiento_consultas(id,modulo,razon_social,zona,origen,destino_codigo,departamento,municipio,equipos,total,dias,usuario_id,usuario_nombre,usuario_email)
 VALUES(p_id,modulo_consulta,trim(p_razon_social),trim(p_zona),p_consulta->>'origen',p_consulta->>'destino_codigo',p_consulta->>'departamento',p_consulta->>'municipio',p_consulta->'equipos',(p_consulta->>'total')::numeric,(p_consulta->>'dias')::integer,auth.uid(),nombre,correo)
 ON CONFLICT(id) DO NOTHING RETURNING * INTO r;
 IF NOT FOUND THEN
   SELECT * INTO r FROM public.mantenimiento_consultas WHERE id=p_id AND usuario_id=auth.uid();
   IF NOT FOUND THEN RAISE EXCEPTION 'Identificador de consulta no válido'; END IF;
   IF r.razon_social IS DISTINCT FROM trim(p_razon_social) OR r.zona IS DISTINCT FROM trim(p_zona)
   OR r.modulo IS DISTINCT FROM modulo_consulta OR r.origen IS DISTINCT FROM p_consulta->>'origen'
   OR r.destino_codigo IS DISTINCT FROM p_consulta->>'destino_codigo' OR r.departamento IS DISTINCT FROM p_consulta->>'departamento'
   OR r.municipio IS DISTINCT FROM p_consulta->>'municipio' OR r.equipos IS DISTINCT FROM p_consulta->'equipos'
   OR r.total IS DISTINCT FROM (p_consulta->>'total')::numeric OR r.dias IS DISTINCT FROM (p_consulta->>'dias')::integer THEN
     RAISE EXCEPTION 'El identificador corresponde a otra consulta';
   END IF;
 END IF;
 RETURN to_jsonb(r);
END;
$$;
REVOKE ALL ON FUNCTION public.mantenimiento_registrar_consulta(uuid,jsonb,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mantenimiento_registrar_consulta(uuid,jsonb,text,text) TO authenticated;
COMMIT;
