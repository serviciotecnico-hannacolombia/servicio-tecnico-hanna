-- Accesos por función y delegación limitada a Gestión de mantenimientos.
-- Aplicar después de instalar-oportunidades-in-situ.sql y actualizar-buzon-in-situ.sql.
-- No modifica roles generales, perfiles.role_id ni permisos de otros módulos.
BEGIN;
ALTER TABLE public.intervenciones_permisos ADD COLUMN estadisticas boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN comercial boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN oportunidades_crear boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN oportunidades_editar boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN semaforo boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN catalogo_editar boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN solicitudes_ver boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN solicitudes_crear boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN solicitudes_editar boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN solicitudes_exportar boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN consultas_ver boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN consultas_exportar boolean NOT NULL DEFAULT false;
ALTER TABLE public.intervenciones_permisos ADD COLUMN gestionar_accesos boolean NOT NULL DEFAULT false;
CREATE FUNCTION public.gestion_permisos_base(p_usuario uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE solicitudes boolean;consultas boolean;base jsonb;
BEGIN
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id=p.role_id WHERE p.id=p_usuario AND p.activo AND translate(lower(trim(r.name)),'é','e')='servicio tecnico'
 AND EXISTS(SELECT 1 FROM public.role_modules m WHERE m.role_id=r.id AND m.module_key='gestion_mantenimientos')
 AND EXISTS(SELECT 1 FROM public.role_modules m WHERE m.role_id=r.id AND m.module_key='mant_in_situ_regional')) INTO solicitudes;
 SELECT EXISTS(SELECT 1 FROM public.profiles p JOIN public.roles r ON r.id=p.role_id WHERE p.id=p_usuario AND p.activo AND translate(lower(trim(r.name)),'é','e')='servicio tecnico'
 AND EXISTS(SELECT 1 FROM public.role_capabilities c WHERE c.role_id=r.id AND c.capability_key='mant_consultas_reportes')) INTO consultas;
 base:=jsonb_build_object('ver',false,'registrar',false,'editar',false,'importar',false,'exportar',false,'estadisticas',false,'comercial',false,'oportunidades_crear',false,'oportunidades_editar',false,'buzon',false,'semaforo',false,'catalogo_editar',false,'solicitudes_ver',false,'solicitudes_crear',false,'solicitudes_editar',false,'solicitudes_exportar',false,'consultas_ver',false,'consultas_exportar',false,'gestionar_accesos',false);
 RETURN base||jsonb_build_object('solicitudes_ver',solicitudes,'solicitudes_crear',solicitudes,'solicitudes_editar',solicitudes,'solicitudes_exportar',solicitudes,'consultas_ver',consultas,'consultas_exportar',consultas);
END;
$$;
REVOKE ALL ON FUNCTION public.gestion_permisos_base(uuid) FROM PUBLIC,anon,authenticated;
UPDATE public.intervenciones_permisos p SET estadisticas=ver,comercial=ver,oportunidades_crear=registrar,oportunidades_editar=editar,solicitudes_ver=(public.gestion_permisos_base(usuario_id)->>'solicitudes_ver')::boolean,solicitudes_crear=(public.gestion_permisos_base(usuario_id)->>'solicitudes_crear')::boolean,solicitudes_editar=(public.gestion_permisos_base(usuario_id)->>'solicitudes_editar')::boolean,solicitudes_exportar=(public.gestion_permisos_base(usuario_id)->>'solicitudes_exportar')::boolean,consultas_ver=(public.gestion_permisos_base(usuario_id)->>'consultas_ver')::boolean,consultas_exportar=(public.gestion_permisos_base(usuario_id)->>'consultas_exportar')::boolean;
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_registrar_ver CHECK(NOT registrar OR ver);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_editar_ver CHECK(NOT editar OR ver);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_importar_ver CHECK(NOT importar OR ver);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_exportar_ver CHECK(NOT exportar OR ver);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_estadisticas_ver CHECK(NOT estadisticas OR ver);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_comercial_ver CHECK(NOT comercial OR ver);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_oportunidades_crear_comercial CHECK(NOT oportunidades_crear OR comercial);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_oportunidades_editar_comercial CHECK(NOT oportunidades_editar OR comercial);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_buzon_ver CHECK(NOT buzon OR ver);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_semaforo_buzon CHECK(NOT semaforo OR buzon);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_catalogo_editar_editar CHECK(NOT catalogo_editar OR editar);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_solicitudes_crear_solicitudes_ver CHECK(NOT solicitudes_crear OR solicitudes_ver);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_solicitudes_editar_solicitudes_ver CHECK(NOT solicitudes_editar OR solicitudes_ver);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_solicitudes_exportar_solicitudes_ver CHECK(NOT solicitudes_exportar OR solicitudes_ver);
ALTER TABLE public.intervenciones_permisos ADD CONSTRAINT gestion_permiso_consultas_exportar_consultas_ver CHECK(NOT consultas_exportar OR consultas_ver);
CREATE OR REPLACE FUNCTION public.intervenciones_permiso(p_permiso text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND activo) AND coalesce(p_permiso=ANY(ARRAY['ver','registrar','editar','importar','exportar','estadisticas','comercial','oportunidades_crear','oportunidades_editar','buzon','semaforo','catalogo_editar','solicitudes_ver','solicitudes_crear','solicitudes_editar','solicitudes_exportar','consultas_ver','consultas_exportar','gestionar_accesos']),false)
 AND (public.intervenciones_es_admin() OR coalesce((SELECT (to_jsonb(p)->>p_permiso)::boolean FROM public.intervenciones_permisos p WHERE p.usuario_id=auth.uid()),(public.gestion_permisos_base(auth.uid())->>p_permiso)::boolean,false));
$$;
CREATE FUNCTION public.intervenciones_puede_administrar() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.intervenciones_es_admin() OR public.intervenciones_permiso('gestionar_accesos');
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_mis_permisos() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_object_agg(k,public.intervenciones_permiso(k))||jsonb_build_object('administrador',public.intervenciones_es_admin(),'configurado',public.intervenciones_es_admin() OR EXISTS(SELECT 1 FROM public.intervenciones_permisos WHERE usuario_id=auth.uid())) FROM unnest(ARRAY['ver','registrar','editar','importar','exportar','estadisticas','comercial','oportunidades_crear','oportunidades_editar','buzon','semaforo','catalogo_editar','solicitudes_ver','solicitudes_crear','solicitudes_editar','solicitudes_exportar','consultas_ver','consultas_exportar','gestionar_accesos']) k;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_permisos_listar() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_puede_administrar() THEN RAISE EXCEPTION 'No tienes permiso para administrar accesos de Gestión' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_object_agg(p.id::text,CASE WHEN p.id=(SELECT administrador_id FROM public.intervenciones_alertas_config WHERE id) THEN jsonb_build_object('ver',true,'registrar',true,'editar',true,'importar',true,'exportar',true,'estadisticas',true,'comercial',true,'oportunidades_crear',true,'oportunidades_editar',true,'buzon',true,'semaforo',true,'catalogo_editar',true,'solicitudes_ver',true,'solicitudes_crear',true,'solicitudes_editar',true,'solicitudes_exportar',true,'consultas_ver',true,'consultas_exportar',true,'gestionar_accesos',true) ELSE coalesce(to_jsonb(a)-ARRAY['usuario_id','actualizado_por','updated_at'],public.gestion_permisos_base(p.id)) END),'{}') FROM public.profiles p LEFT JOIN public.intervenciones_permisos a ON a.usuario_id=p.id);
END;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_permisos_guardar(p_usuario uuid,p_permisos jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE antes jsonb;despues jsonb;k text;
BEGIN
 IF NOT public.intervenciones_puede_administrar() THEN RAISE EXCEPTION 'No tienes permiso para administrar accesos de Gestión' USING ERRCODE='42501'; END IF;
 IF p_usuario=auth.uid() OR EXISTS(SELECT 1 FROM public.intervenciones_alertas_config WHERE administrador_id=p_usuario) THEN RAISE EXCEPTION 'El propietario y tu propio perfil están protegidos'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=p_usuario AND activo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Selecciona un perfil activo'; END IF;
 FOREACH k IN ARRAY ARRAY['ver','registrar','editar','importar','exportar','estadisticas','comercial','oportunidades_crear','oportunidades_editar','buzon','semaforo','catalogo_editar','solicitudes_ver','solicitudes_crear','solicitudes_editar','solicitudes_exportar','consultas_ver','consultas_exportar','gestionar_accesos'] LOOP IF jsonb_typeof(p_permisos->k) IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Los permisos deben ser booleanos'; END IF;END LOOP;
 SELECT to_jsonb(p) INTO antes FROM public.intervenciones_permisos p WHERE usuario_id=p_usuario FOR UPDATE;
 IF NOT public.intervenciones_es_admin() AND ((p_permisos->>'gestionar_accesos')::boolean OR coalesce((antes->>'gestionar_accesos')::boolean,false)) THEN RAISE EXCEPTION 'Sólo el propietario puede delegar o modificar administradores de accesos' USING ERRCODE='42501'; END IF;
 INSERT INTO public.intervenciones_permisos(usuario_id,ver,registrar,editar,importar,exportar,estadisticas,comercial,oportunidades_crear,oportunidades_editar,buzon,semaforo,catalogo_editar,solicitudes_ver,solicitudes_crear,solicitudes_editar,solicitudes_exportar,consultas_ver,consultas_exportar,gestionar_accesos,actualizado_por) VALUES(p_usuario,(p_permisos->>'ver')::boolean,(p_permisos->>'registrar')::boolean,(p_permisos->>'editar')::boolean,(p_permisos->>'importar')::boolean,(p_permisos->>'exportar')::boolean,(p_permisos->>'estadisticas')::boolean,(p_permisos->>'comercial')::boolean,(p_permisos->>'oportunidades_crear')::boolean,(p_permisos->>'oportunidades_editar')::boolean,(p_permisos->>'buzon')::boolean,(p_permisos->>'semaforo')::boolean,(p_permisos->>'catalogo_editar')::boolean,(p_permisos->>'solicitudes_ver')::boolean,(p_permisos->>'solicitudes_crear')::boolean,(p_permisos->>'solicitudes_editar')::boolean,(p_permisos->>'solicitudes_exportar')::boolean,(p_permisos->>'consultas_ver')::boolean,(p_permisos->>'consultas_exportar')::boolean,(p_permisos->>'gestionar_accesos')::boolean,auth.uid())
 ON CONFLICT(usuario_id) DO UPDATE SET ver=excluded.ver,registrar=excluded.registrar,editar=excluded.editar,importar=excluded.importar,exportar=excluded.exportar,estadisticas=excluded.estadisticas,comercial=excluded.comercial,oportunidades_crear=excluded.oportunidades_crear,oportunidades_editar=excluded.oportunidades_editar,buzon=excluded.buzon,semaforo=excluded.semaforo,catalogo_editar=excluded.catalogo_editar,solicitudes_ver=excluded.solicitudes_ver,solicitudes_crear=excluded.solicitudes_crear,solicitudes_editar=excluded.solicitudes_editar,solicitudes_exportar=excluded.solicitudes_exportar,consultas_ver=excluded.consultas_ver,consultas_exportar=excluded.consultas_exportar,gestionar_accesos=excluded.gestionar_accesos,actualizado_por=auth.uid(),updated_at=now();
 SELECT to_jsonb(p) INTO despues FROM public.intervenciones_permisos p WHERE usuario_id=p_usuario;
 INSERT INTO public.intervenciones_permisos_historial(usuario_id,administrador_id,antes,despues) VALUES(p_usuario,auth.uid(),coalesce(antes,public.gestion_permisos_base(p_usuario)),despues);
END;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_alertas_configuracion() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.intervenciones_alertas_config;destinos jsonb;
BEGIN
 IF NOT (public.intervenciones_permiso('ver') OR public.intervenciones_puede_administrar()) THEN RAISE EXCEPTION 'Sin permiso' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT c FROM public.intervenciones_alertas_config WHERE id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nombre',coalesce(nullif(trim(p.full_name),''),p.email,p.id::text)) ORDER BY p.full_name),'[]') INTO destinos FROM public.profiles p WHERE (EXISTS(SELECT 1 FROM public.intervenciones_permisos ip WHERE ip.usuario_id=p.id AND ip.buzon) OR p.id=c.administrador_id) AND p.activo;
 RETURN jsonb_build_object('administrador_id',c.administrador_id,'anticipado',c.anticipado,'proximo',c.proximo,'urgente',c.urgente,'destinatarios',destinos);
END;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_alertas_perfiles() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_puede_administrar() THEN RAISE EXCEPTION 'Sólo Andrés Latorre puede administrar perfiles y alertas' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'activo',activo,'nombre',coalesce(nullif(trim(full_name),''),email,id::text)) ORDER BY full_name),'[]') FROM public.profiles);
END;
$$;
CREATE OR REPLACE FUNCTION public.intervenciones_alertas_configurar(p_config jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE ids uuid[];a integer;p integer;u integer;
BEGIN
 IF NOT public.intervenciones_permiso('semaforo') THEN RAISE EXCEPTION 'Sólo Andrés Latorre puede administrar perfiles y alertas' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_config->'anticipado') IS DISTINCT FROM 'number' OR jsonb_typeof(p_config->'proximo') IS DISTINCT FROM 'number' OR jsonb_typeof(p_config->'urgente') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Plazos no válidos'; END IF;
 a:=(p_config->>'anticipado')::integer;p:=(p_config->>'proximo')::integer;u:=(p_config->>'urgente')::integer;
 UPDATE public.intervenciones_alertas_config SET anticipado=a,proximo=p,urgente=u,actualizado_por=auth.uid(),updated_at=now() WHERE id;
END;
$$;
CREATE OR REPLACE FUNCTION public.gestion_mantenimiento_crear(p_cliente text,p_origen text,p_destino text,p_cotizacion text,p_calculo jsonb,p_nota text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.gestion_mantenimientos; nombre text; estado_inicial text; cot text:=nullif(trim(p_cotizacion),''); nota text:=coalesce(trim(p_nota),'');
BEGIN
 IF NOT public.intervenciones_permiso('solicitudes_crear') THEN RAISE EXCEPTION 'Sin permiso para Gestión de mantenimientos' USING ERRCODE='42501'; END IF;
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
CREATE OR REPLACE FUNCTION public.gestion_mantenimiento_actualizar(p_id uuid,p_revision integer,p_estado text,p_cotizacion text,p_nota text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.gestion_mantenimientos; nombre text; cot text:=nullif(trim(p_cotizacion),''); nota text:=coalesce(trim(p_nota),'');
BEGIN
 IF NOT public.intervenciones_permiso('solicitudes_editar') THEN RAISE EXCEPTION 'Sin permiso para Gestión de mantenimientos' USING ERRCODE='42501'; END IF;
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
CREATE OR REPLACE FUNCTION public.intervenciones_oportunidad_crear(p_datos jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE origen public.mantenimiento_intervenciones;o public.intervenciones_oportunidades;nombre text;
BEGIN
 IF NOT public.intervenciones_permiso('oportunidades_crear') THEN RAISE EXCEPTION 'Sin permiso para registrar oportunidades' USING ERRCODE='42501'; END IF;
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
CREATE OR REPLACE FUNCTION public.intervenciones_oportunidad_actualizar(p_id uuid,p_revision integer,p_estado text,p_cotizacion text,p_nota text,p_valor numeric) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actual public.intervenciones_oportunidades;nombre text;
BEGIN
 IF NOT public.intervenciones_permiso('oportunidades_editar') THEN RAISE EXCEPTION 'Sin permiso para dar seguimiento comercial' USING ERRCODE='42501'; END IF;
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
DROP POLICY gestion_mantenimientos_lectura ON public.gestion_mantenimientos;
CREATE POLICY gestion_mantenimientos_lectura ON public.gestion_mantenimientos FOR SELECT TO authenticated USING(public.intervenciones_permiso('solicitudes_ver'));
DROP POLICY mantenimiento_consultas_lectura ON public.mantenimiento_consultas;
CREATE POLICY mantenimiento_consultas_lectura ON public.mantenimiento_consultas FOR SELECT TO authenticated USING(public.intervenciones_permiso('consultas_ver'));
DROP POLICY oportunidades_lectura ON public.intervenciones_oportunidades;
CREATE POLICY oportunidades_lectura ON public.intervenciones_oportunidades FOR SELECT TO authenticated USING(public.intervenciones_permiso('comercial'));
DROP POLICY alertas_config_lectura ON public.intervenciones_alertas_config;
CREATE POLICY alertas_config_lectura ON public.intervenciones_alertas_config FOR SELECT TO authenticated USING(public.intervenciones_permiso('ver') OR public.intervenciones_puede_administrar());
CREATE FUNCTION public.gestion_validar_exportacion(p_apartado text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_apartado IS NULL OR p_apartado NOT IN ('solicitudes','consultas') OR NOT public.intervenciones_permiso(p_apartado||'_exportar') THEN RAISE EXCEPTION 'No tienes permiso para exportar este apartado' USING ERRCODE='42501'; END IF;
END;
$$;
CREATE FUNCTION public.gestion_asignar_codigo_in_situ(p_referencias text[],p_codigo text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.intervenciones_permiso('catalogo_editar') THEN RAISE EXCEPTION 'No tienes permiso para asignar códigos desde Gestión' USING ERRCODE='42501'; END IF;
 RETURN public.mant_in_situ_asignar_codigo(p_referencias,p_codigo);
END;
$$;
REVOKE ALL ON FUNCTION public.intervenciones_puede_administrar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.intervenciones_puede_administrar() TO authenticated;
REVOKE ALL ON FUNCTION public.gestion_validar_exportacion(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gestion_validar_exportacion(text) TO authenticated;
REVOKE ALL ON FUNCTION public.gestion_asignar_codigo_in_situ(text[],text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gestion_asignar_codigo_in_situ(text[],text) TO authenticated;
COMMIT;
