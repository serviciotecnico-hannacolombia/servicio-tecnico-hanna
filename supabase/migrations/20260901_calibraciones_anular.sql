-- ============================================================
-- Calibraciones: anular en vez de eliminar. Una orden anulada no vuelve
-- atrás en el flujo ni se borra — queda marcada con motivo, sale de las
-- vistas activas y deja de disparar alertas de vencimiento, pero conserva
-- su historial completo (a diferencia de un DELETE, que hoy borra en
-- cascada el historial y los enlaces con pendientes de logística).
--
-- El No. de OC de una orden anulada NO se reutiliza — sugerirNumeroOC ya
-- calcula el siguiente consecutivo como el máximo usado + 1, sin importar
-- si esa orden terminó anulada, así que el número simplemente queda
-- "quemado" en vez de reciclarse.
--
-- El DELETE físico se restringe a Admin — ya no es una acción disponible
-- para Servicio Técnico/Líderes/Logística vía la capacidad
-- calibraciones_editar, solo queda como último recurso desde el rol Admin.
-- ============================================================

ALTER TABLE ordenes_calibracion
  ADD COLUMN IF NOT EXISTS anulada          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text;

CREATE INDEX IF NOT EXISTS idx_ordenes_calibracion_anulada ON ordenes_calibracion (anulada);

-- ── RLS: separar el DELETE del resto de escrituras ──────────────────────────

DROP POLICY IF EXISTS "ordenes_calibracion write" ON ordenes_calibracion;

CREATE POLICY "ordenes_calibracion insert"
  ON ordenes_calibracion FOR INSERT TO authenticated
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));

CREATE POLICY "ordenes_calibracion update"
  ON ordenes_calibracion FOR UPDATE TO authenticated
  USING (has_module('calibraciones') AND has_capability('calibraciones_editar'))
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));

CREATE POLICY "ordenes_calibracion delete"
  ON ordenes_calibracion FOR DELETE TO authenticated
  USING (has_module('admin'));

-- ── Trigger de historial: audita anulada/motivo_anulacion también ─────────

CREATE OR REPLACE FUNCTION log_ordenes_calibracion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'creacion', 'Orden creada');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.numero_oc IS DISTINCT FROM OLD.numero_oc THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'numero_oc', OLD.numero_oc, NEW.numero_oc);
    END IF;
    IF NEW.cliente IS DISTINCT FROM OLD.cliente THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'cliente', OLD.cliente, NEW.cliente);
    END IF;
    IF NEW.correo_cliente IS DISTINCT FROM OLD.correo_cliente THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'correo_cliente', OLD.correo_cliente, NEW.correo_cliente);
    END IF;
    IF NEW.asesor_id IS DISTINCT FROM OLD.asesor_id THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'asesor_id', OLD.asesor_id::text, NEW.asesor_id::text);
    END IF;
    IF NEW.correo_asesor IS DISTINCT FROM OLD.correo_asesor THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'correo_asesor', OLD.correo_asesor, NEW.correo_asesor);
    END IF;
    IF NEW.saci IS DISTINCT FROM OLD.saci THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'saci', OLD.saci, NEW.saci);
    END IF;
    IF NEW.link_solicitud IS DISTINCT FROM OLD.link_solicitud THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'link_solicitud', OLD.link_solicitud, NEW.link_solicitud);
    END IF;
    IF NEW.otst IS DISTINCT FROM OLD.otst THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'otst', OLD.otst, NEW.otst);
    END IF;
    IF NEW.link_otst IS DISTINCT FROM OLD.link_otst THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'link_otst', OLD.link_otst, NEW.link_otst);
    END IF;
    IF NEW.codigo_recepcion IS DISTINCT FROM OLD.codigo_recepcion THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'codigo_recepcion', OLD.codigo_recepcion, NEW.codigo_recepcion);
    END IF;
    IF NEW.rmv_fv IS DISTINCT FROM OLD.rmv_fv THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'rmv_fv', OLD.rmv_fv, NEW.rmv_fv);
    END IF;
    IF NEW.modalidad IS DISTINCT FROM OLD.modalidad THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'modalidad', OLD.modalidad, NEW.modalidad);
    END IF;
    IF NEW.lugar_ejecucion IS DISTINCT FROM OLD.lugar_ejecucion THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'lugar_ejecucion', OLD.lugar_ejecucion, NEW.lugar_ejecucion);
    END IF;
    IF NEW.proveedor IS DISTINCT FROM OLD.proveedor THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'proveedor', OLD.proveedor, NEW.proveedor);
    END IF;
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'estado', OLD.estado, NEW.estado);
    END IF;
    IF NEW.novedad_detalle IS DISTINCT FROM OLD.novedad_detalle THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'novedad_detalle', OLD.novedad_detalle, NEW.novedad_detalle);
    END IF;
    IF NEW.enviado_cliente_final IS DISTINCT FROM OLD.enviado_cliente_final THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'enviado_cliente_final', OLD.enviado_cliente_final::text, NEW.enviado_cliente_final::text);
    END IF;
    IF NEW.cantidad_equipos IS DISTINCT FROM OLD.cantidad_equipos THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'cantidad_equipos', OLD.cantidad_equipos::text, NEW.cantidad_equipos::text);
    END IF;
    IF NEW.fecha_salida_mantenimiento IS DISTINCT FROM OLD.fecha_salida_mantenimiento THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_salida_mantenimiento', OLD.fecha_salida_mantenimiento::text, NEW.fecha_salida_mantenimiento::text);
    END IF;
    IF NEW.fecha_salida_mantenimiento_real IS DISTINCT FROM OLD.fecha_salida_mantenimiento_real THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_salida_mantenimiento_real', OLD.fecha_salida_mantenimiento_real::text, NEW.fecha_salida_mantenimiento_real::text);
    END IF;
    IF NEW.nota_mantenimiento IS DISTINCT FROM OLD.nota_mantenimiento THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'nota_mantenimiento', OLD.nota_mantenimiento, NEW.nota_mantenimiento);
    END IF;
    IF NEW.fecha_programada_envio IS DISTINCT FROM OLD.fecha_programada_envio THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_programada_envio', OLD.fecha_programada_envio::text, NEW.fecha_programada_envio::text);
    END IF;
    IF NEW.fecha_envio IS DISTINCT FROM OLD.fecha_envio THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_envio', OLD.fecha_envio::text, NEW.fecha_envio::text);
    END IF;
    IF NEW.nota_envio IS DISTINCT FROM OLD.nota_envio THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'nota_envio', OLD.nota_envio, NEW.nota_envio);
    END IF;
    IF NEW.fecha_llegada_metrologo IS DISTINCT FROM OLD.fecha_llegada_metrologo THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_llegada_metrologo', OLD.fecha_llegada_metrologo::text, NEW.fecha_llegada_metrologo::text);
    END IF;
    IF NEW.codigos_certificados IS DISTINCT FROM OLD.codigos_certificados THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'codigos_certificados', OLD.codigos_certificados, NEW.codigos_certificados);
    END IF;
    IF NEW.certificado_fecha_inicio IS DISTINCT FROM OLD.certificado_fecha_inicio THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'certificado_fecha_inicio', OLD.certificado_fecha_inicio::text, NEW.certificado_fecha_inicio::text);
    END IF;
    IF NEW.certificado_fecha_fin IS DISTINCT FROM OLD.certificado_fecha_fin THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'certificado_fecha_fin', OLD.certificado_fecha_fin::text, NEW.certificado_fecha_fin::text);
    END IF;
    IF NEW.fecha_salida_lab IS DISTINCT FROM OLD.fecha_salida_lab THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_salida_lab', OLD.fecha_salida_lab::text, NEW.fecha_salida_lab::text);
    END IF;
    IF NEW.fecha_retorno IS DISTINCT FROM OLD.fecha_retorno THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_retorno', OLD.fecha_retorno::text, NEW.fecha_retorno::text);
    END IF;
    IF NEW.nota_retorno IS DISTINCT FROM OLD.nota_retorno THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'nota_retorno', OLD.nota_retorno, NEW.nota_retorno);
    END IF;
    IF NEW.fecha_llegada_hanna IS DISTINCT FROM OLD.fecha_llegada_hanna THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_llegada_hanna', OLD.fecha_llegada_hanna::text, NEW.fecha_llegada_hanna::text);
    END IF;
    IF NEW.fecha_entrega_certificado IS DISTINCT FROM OLD.fecha_entrega_certificado THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_entrega_certificado', OLD.fecha_entrega_certificado::text, NEW.fecha_entrega_certificado::text);
    END IF;
    IF NEW.carta_entrega IS DISTINCT FROM OLD.carta_entrega THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'carta_entrega', OLD.carta_entrega, NEW.carta_entrega);
    END IF;
    IF NEW.carta_certificado IS DISTINCT FROM OLD.carta_certificado THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'carta_certificado', OLD.carta_certificado, NEW.carta_certificado);
    END IF;
    IF NEW.fecha_control_calidad IS DISTINCT FROM OLD.fecha_control_calidad THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_control_calidad', OLD.fecha_control_calidad::text, NEW.fecha_control_calidad::text);
    END IF;
    IF NEW.notas_control_calidad IS DISTINCT FROM OLD.notas_control_calidad THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'notas_control_calidad', OLD.notas_control_calidad, NEW.notas_control_calidad);
    END IF;
    IF NEW.parametros_nota IS DISTINCT FROM OLD.parametros_nota THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'parametros_nota', OLD.parametros_nota, NEW.parametros_nota);
    END IF;
    IF NEW.valor_oc_antes_iva IS DISTINCT FROM OLD.valor_oc_antes_iva THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'valor_oc_antes_iva', OLD.valor_oc_antes_iva::text, NEW.valor_oc_antes_iva::text);
    END IF;
    IF NEW.ubicacion_equipo IS DISTINCT FROM OLD.ubicacion_equipo THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'ubicacion_equipo', OLD.ubicacion_equipo, NEW.ubicacion_equipo);
    END IF;
    IF NEW.anulada IS DISTINCT FROM OLD.anulada THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'anulada', OLD.anulada::text, NEW.anulada::text);
    END IF;
    IF NEW.motivo_anulacion IS DISTINCT FROM OLD.motivo_anulacion THEN
      INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'motivo_anulacion', OLD.motivo_anulacion, NEW.motivo_anulacion);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;
