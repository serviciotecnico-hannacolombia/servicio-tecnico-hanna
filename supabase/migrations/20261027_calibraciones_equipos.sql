-- ============================================================
-- Calibraciones: equipos de cada orden (referencia, serial e ID) para
-- trazabilidad por equipo.
--
-- Hasta ahora la orden solo guardaba cantidad_equipos y los códigos de
-- referencia / certificados como texto libre de toda la orden. Desde aquí:
--   - Cada orden registra sus equipos (se pueden pegar desde Excel).
--   - En "En calibración" (flujo de sitio) cada equipo recibe sus códigos
--     de referencia; en "Carga al sistema" sus códigos de certificado, que
--     deben coincidir con los de referencia (validado en la app).
-- ordenes_calibracion.codigos_referencia / codigos_certificados se siguen
-- llenando (unión de los de cada equipo) para correos y reportes.
-- Las órdenes anteriores no se tocan.
-- ============================================================

CREATE TABLE IF NOT EXISTS ordenes_calibracion_equipos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id             uuid NOT NULL REFERENCES ordenes_calibracion(id) ON DELETE CASCADE,
  referencia           text NOT NULL,
  serial               text NOT NULL CHECK (btrim(serial) <> ''),
  id_equipo            text, -- "ID" del cliente; texto para conservar ceros a la izquierda
  codigos_referencia   text[] NOT NULL DEFAULT '{}',
  codigos_certificado  text[] NOT NULL DEFAULT '{}',
  posicion             int NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ordenes_calibracion_equipos_serial_unico
  ON ordenes_calibracion_equipos (orden_id, upper(btrim(serial)));
CREATE INDEX IF NOT EXISTS ordenes_calibracion_equipos_serial_idx
  ON ordenes_calibracion_equipos (upper(btrim(serial)));

ALTER TABLE ordenes_calibracion_equipos ENABLE ROW LEVEL SECURITY;

-- ── RLS (mismo criterio que ordenes_calibracion_parametros) ─────────────────

CREATE POLICY "ordenes_calibracion_equipos select" ON ordenes_calibracion_equipos FOR SELECT TO authenticated
  USING (has_module('calibraciones') AND (
    has_capability('calibraciones_editar')
    OR has_capability('calibraciones_ver_todas')
    OR EXISTS (
      SELECT 1 FROM ordenes_calibracion oc
      JOIN profiles p ON p.id = auth.uid()
      WHERE oc.id = ordenes_calibracion_equipos.orden_id AND p.email = oc.correo_asesor
    )
  ));

CREATE POLICY "ordenes_calibracion_equipos write" ON ordenes_calibracion_equipos FOR ALL TO authenticated
  USING (has_module('calibraciones') AND has_capability('calibraciones_editar'))
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));

-- ── Historial ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION log_ordenes_calibracion_equipos() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_equipo text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Si se está borrando la orden completa (cascada) no hay historial que escribir.
    IF NOT EXISTS (SELECT 1 FROM ordenes_calibracion WHERE id = OLD.orden_id) THEN
      RETURN OLD;
    END IF;
    INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior)
    VALUES (OLD.orden_id, auth.uid(), 'equipo_eliminado',
            concat_ws(' · ', OLD.referencia, OLD.serial, OLD.id_equipo));
    RETURN OLD;
  END IF;

  v_equipo := concat_ws(' · ', NEW.referencia, NEW.serial, NEW.id_equipo);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_nuevo)
    VALUES (NEW.orden_id, auth.uid(), 'equipo_agregado', v_equipo);
    RETURN NEW;
  END IF;

  IF NEW.referencia IS DISTINCT FROM OLD.referencia
     OR NEW.serial IS DISTINCT FROM OLD.serial
     OR NEW.id_equipo IS DISTINCT FROM OLD.id_equipo THEN
    INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.orden_id, auth.uid(), 'equipo_editado',
            concat_ws(' · ', OLD.referencia, OLD.serial, OLD.id_equipo), v_equipo);
  END IF;
  IF NEW.codigos_referencia IS DISTINCT FROM OLD.codigos_referencia THEN
    INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.orden_id, auth.uid(), 'equipo_codigos_referencia',
            NULLIF(NEW.serial || ': ' || array_to_string(OLD.codigos_referencia, ', '), NEW.serial || ': '),
            NEW.serial || ': ' || array_to_string(NEW.codigos_referencia, ', '));
  END IF;
  IF NEW.codigos_certificado IS DISTINCT FROM OLD.codigos_certificado THEN
    INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.orden_id, auth.uid(), 'equipo_codigos_certificado',
            NULLIF(NEW.serial || ': ' || array_to_string(OLD.codigos_certificado, ', '), NEW.serial || ': '),
            NEW.serial || ': ' || array_to_string(NEW.codigos_certificado, ', '));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ordenes_calibracion_equipos ON ordenes_calibracion_equipos;
CREATE TRIGGER trg_log_ordenes_calibracion_equipos
  AFTER INSERT OR UPDATE OR DELETE ON ordenes_calibracion_equipos
  FOR EACH ROW EXECUTE FUNCTION log_ordenes_calibracion_equipos();
