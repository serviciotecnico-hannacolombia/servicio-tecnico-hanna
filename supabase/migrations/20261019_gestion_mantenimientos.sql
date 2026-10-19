-- Gestión de mantenimientos. Preparado para revisión; NO ejecutado contra la base remota.
-- Aplicar antes de publicar el frontend. Solo Servicio Técnico con ambos módulos.
BEGIN;
INSERT INTO public.modules(key) VALUES ('gestion_mantenimientos') ON CONFLICT DO NOTHING;
INSERT INTO public.role_modules(role_id,module_key)
 SELECT r.id,'gestion_mantenimientos' FROM public.roles r
 WHERE translate(lower(trim(r.name)),'é','e')='servicio tecnico'
 AND EXISTS(SELECT 1 FROM public.role_modules rm WHERE rm.role_id=r.id AND rm.module_key='mant_in_situ_regional')
 ON CONFLICT DO NOTHING;

CREATE FUNCTION public.gestion_mantenimientos_permitido() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id=p.role_id
 WHERE p.id=auth.uid() AND p.activo AND translate(lower(trim(r.name)),'é','e')='servicio tecnico')
 AND public.has_module('gestion_mantenimientos') AND public.has_module('mant_in_situ_regional');
$$;
REVOKE ALL ON FUNCTION public.gestion_mantenimientos_permitido() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gestion_mantenimientos_permitido() TO authenticated;

CREATE TABLE public.gestion_mantenimientos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 cliente text NOT NULL CHECK(length(trim(cliente)) BETWEEN 1 AND 200),
 origen text NOT NULL CHECK(length(trim(origen)) BETWEEN 1 AND 300),
 destino text NOT NULL CHECK(length(trim(destino)) BETWEEN 1 AND 300),
 cotizacion text CHECK(cotizacion IS NULL OR length(trim(cotizacion)) BETWEEN 1 AND 100),
 estado text NOT NULL CHECK(estado IN ('pendiente','cotizada','aprobada','rechazada','programada','realizada','cancelada')),
 calculo jsonb NOT NULL CHECK(jsonb_typeof(calculo)='object'),
 historial jsonb NOT NULL CHECK(jsonb_typeof(historial)='array'),
 creado_por uuid NOT NULL REFERENCES public.profiles(id),
 creado_por_nombre text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 CHECK(estado NOT IN ('cotizada','aprobada','rechazada','programada','realizada') OR cotizacion IS NOT NULL)
);
CREATE INDEX gestion_mantenimientos_estado_fecha_idx ON public.gestion_mantenimientos(estado,created_at DESC);
CREATE INDEX gestion_mantenimientos_cotizacion_idx ON public.gestion_mantenimientos(cotizacion);
ALTER TABLE public.gestion_mantenimientos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gestion_mantenimientos FROM anon,authenticated;
GRANT SELECT ON TABLE public.gestion_mantenimientos TO authenticated;
CREATE POLICY gestion_mantenimientos_lectura ON public.gestion_mantenimientos FOR SELECT TO authenticated
 USING(public.gestion_mantenimientos_permitido());
-- No se permiten escrituras directas: las RPC validan importes y mantienen el historial del servidor.

CREATE FUNCTION public.gestion_mantenimiento_validar_calculo(c jsonb) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE k text; v numeric; suma numeric:=0; base numeric:=0; i jsonb; cantidad numeric; precio numeric;
BEGIN
 IF c IS NULL OR jsonb_typeof(c) IS DISTINCT FROM 'object' OR c->>'version' IS DISTINCT FROM '1'
 OR jsonb_typeof(c->'desglose') IS DISTINCT FROM 'object' OR jsonb_typeof(c->'items') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'Cálculo incompleto'; END IF;
 IF jsonb_array_length(c->'items')=0 OR c#>>'{transporte,viaje}' NOT IN ('aereo','terrestre')
 OR c#>>'{transporte,viaje}' IS NULL THEN RAISE EXCEPTION 'Selecciona equipos y transporte'; END IF;
 FOREACH k IN ARRAY ARRAY['dias','subtotal','margen_pct','margen','total'] LOOP
  IF jsonb_typeof(c->k) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Importe no válido: %',k; END IF;
 END LOOP;
 IF (c->>'dias')::numeric<1 OR trunc((c->>'dias')::numeric)<>(c->>'dias')::numeric THEN RAISE EXCEPTION 'Días no válidos'; END IF;
 FOREACH k IN ARRAY ARRAY['base','tiquetes','depreciacion','gasolina','peajes','desplazamiento','hospedaje','alimentacion','otros'] LOOP
  IF jsonb_typeof(c->'desglose'->k) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Desglose incompleto: %',k; END IF;
  v:=(c->'desglose'->>k)::numeric;
  IF v<0 OR v>9007199254740991 THEN RAISE EXCEPTION 'Importe fuera de rango: %',k; END IF;
  suma:=suma+v;
 END LOOP;
 FOR i IN SELECT value FROM jsonb_array_elements(c->'items') LOOP
  IF coalesce(length(trim(i->>'referencia')),0)=0 OR i->>'precio' IS NULL OR i->>'cantidad' IS NULL THEN RAISE EXCEPTION 'Equipo incompleto'; END IF;
  cantidad:=(i->>'cantidad')::numeric;precio:=(i->>'precio')::numeric;
  IF cantidad<1 OR cantidad<>trunc(cantidad) OR precio<=0 OR cantidad>9007199254740991 OR precio>9007199254740991 THEN RAISE EXCEPTION 'Cantidad o precio no válido'; END IF;
  base:=base+cantidad*precio;
 END LOOP;
 IF abs(base-(c#>>'{desglose,base}')::numeric)>.01
 OR (c#>>'{desglose,otros}')::numeric<>(c->>'dias')::numeric*300000
 OR (c#>>'{desglose,alimentacion}')::numeric<>(c->>'dias')::numeric*60000
 OR round(suma)<>(c->>'subtotal')::numeric OR (c->>'margen_pct')::numeric<>5
 OR round((c->>'subtotal')::numeric*.05)<>(c->>'margen')::numeric
 OR (c->>'total')::numeric<>(c->>'subtotal')::numeric+(c->>'margen')::numeric
 OR (c->>'total')::numeric<=0 OR (c->>'total')::numeric>9007199254740991 THEN
  RAISE EXCEPTION 'El cálculo o el margen del 5 %% no coincide'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.gestion_mantenimiento_validar_calculo(jsonb) FROM PUBLIC;

CREATE FUNCTION public.gestion_mantenimiento_crear(p_cliente text,p_origen text,p_destino text,p_cotizacion text,p_calculo jsonb,p_nota text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.gestion_mantenimientos; nombre text; estado_inicial text; cot text:=nullif(trim(p_cotizacion),''); nota text:=coalesce(trim(p_nota),'');
BEGIN
 IF NOT public.gestion_mantenimientos_permitido() THEN RAISE EXCEPTION 'Sin permiso para Gestión de mantenimientos' USING ERRCODE='42501'; END IF;
 IF length(nota)>2000 THEN RAISE EXCEPTION 'La observación excede 2000 caracteres'; END IF;
 PERFORM public.gestion_mantenimiento_validar_calculo(p_calculo);
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 estado_inicial:=CASE WHEN cot IS NULL THEN 'pendiente' ELSE 'cotizada' END;
 INSERT INTO public.gestion_mantenimientos(cliente,origen,destino,cotizacion,estado,calculo,historial,creado_por,creado_por_nombre)
 VALUES(trim(p_cliente),trim(p_origen),trim(p_destino),cot,estado_inicial,p_calculo,
 jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'estado',estado_inicial,'cotizacion',cot,'nota',coalesce(nullif(nota,''),'Solicitud creada'))),auth.uid(),nombre)
 RETURNING * INTO r;
 RETURN to_jsonb(r);
END;
$$;
REVOKE ALL ON FUNCTION public.gestion_mantenimiento_crear(text,text,text,text,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gestion_mantenimiento_crear(text,text,text,text,jsonb,text) TO authenticated;

CREATE FUNCTION public.gestion_mantenimiento_actualizar(p_id uuid,p_revision integer,p_estado text,p_cotizacion text,p_nota text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.gestion_mantenimientos; nombre text; cot text:=nullif(trim(p_cotizacion),''); nota text:=coalesce(trim(p_nota),'');
BEGIN
 IF NOT public.gestion_mantenimientos_permitido() THEN RAISE EXCEPTION 'Sin permiso para Gestión de mantenimientos' USING ERRCODE='42501'; END IF;
 IF p_estado IS NULL OR p_estado NOT IN ('pendiente','cotizada','aprobada','rechazada','programada','realizada','cancelada') THEN RAISE EXCEPTION 'Estado no válido'; END IF;
 IF p_estado IN ('cotizada','aprobada','rechazada','programada','realizada') AND cot IS NULL THEN RAISE EXCEPTION 'Asigna primero el número de cotización asociado'; END IF;
 IF p_estado IN ('rechazada','cancelada') AND nota='' THEN RAISE EXCEPTION 'Registra el motivo del rechazo o cancelación'; END IF;
 IF length(nota)>2000 THEN RAISE EXCEPTION 'La observación excede 2000 caracteres'; END IF;
 SELECT * INTO r FROM public.gestion_mantenimientos WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
 IF p_revision IS DISTINCT FROM r.revision THEN RAISE EXCEPTION 'La solicitud cambió. Recarga antes de actualizar.' USING ERRCODE='40001'; END IF;
 SELECT coalesce(nullif(trim(full_name),''),email,id::text) INTO nombre FROM public.profiles WHERE id=auth.uid();
 UPDATE public.gestion_mantenimientos SET estado=p_estado,cotizacion=cot,updated_at=now(),revision=revision+1,
 historial=historial||jsonb_build_array(jsonb_build_object('fecha',now(),'usuario',nombre,'estado',p_estado,'cotizacion',cot,'nota',coalesce(nullif(nota,''),'Seguimiento actualizado')))
 WHERE id=p_id RETURNING * INTO r;
 RETURN to_jsonb(r);
END;
$$;
REVOKE ALL ON FUNCTION public.gestion_mantenimiento_actualizar(uuid,integer,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gestion_mantenimiento_actualizar(uuid,integer,text,text,text) TO authenticated;
COMMIT;
