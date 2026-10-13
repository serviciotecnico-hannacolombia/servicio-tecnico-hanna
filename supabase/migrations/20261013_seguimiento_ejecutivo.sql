-- ============================================================
-- Seguimiento del ejecutivo (Control de Llamadas → pestaña solo admin):
-- el admin marca a ciertos usuarios como "ejecutivo" y el reporte cruza
-- lo que hicieron en Llamadas (llamadas_diario/historico, ya legibles con
-- el módulo llamadas) con sus cambios en órdenes de Calibraciones.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS es_ejecutivo boolean NOT NULL DEFAULT false;

-- Igual que role_id/activo: un usuario puede editar su propio perfil
-- (nombre, avatar), pero no auto-marcarse como ejecutivo.
CREATE OR REPLACE FUNCTION protect_profile_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  if not public.is_admin() then
    new.role_id      := old.role_id;
    new.activo       := old.activo;
    new.es_ejecutivo := old.es_ejecutivo;
  end if;
  return new;
end;
$$;

-- Cambios que un usuario hizo en órdenes de calibración dentro de un rango
-- de fechas (hora Colombia). SECURITY DEFINER para que el admin lo lea
-- aunque su rol no tenga calibraciones_editar/ver_todas — sin tocar las
-- políticas RLS de ordenes_calibracion_historial.
CREATE OR REPLACE FUNCTION seguimiento_ejecutivo_calibraciones(_usuario_id uuid, _desde date, _hasta date)
RETURNS TABLE (
  id             uuid,
  orden_id       uuid,
  campo          text,
  valor_anterior text,
  valor_nuevo    text,
  created_at     timestamptz,
  numero_oc      text,
  cliente        text,
  estado_actual  text,
  anulada        boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden ver el seguimiento del ejecutivo'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT h.id, h.orden_id, h.campo, h.valor_anterior, h.valor_nuevo, h.created_at,
         oc.numero_oc, oc.cliente, oc.estado::text, oc.anulada
  FROM ordenes_calibracion_historial h
  JOIN ordenes_calibracion oc ON oc.id = h.orden_id
  WHERE h.usuario_id = _usuario_id
    AND (h.created_at AT TIME ZONE 'America/Bogota')::date BETWEEN _desde AND _hasta
  ORDER BY h.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION seguimiento_ejecutivo_calibraciones(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION seguimiento_ejecutivo_calibraciones(uuid, date, date) TO authenticated;
