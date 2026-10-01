-- ============================================================
-- Calibraciones (flujo de sitio: in situ / sede Hanna Dorado): al salir
-- de "En calibración" se registran los códigos de calibración de
-- referencia (texto libre, varios separados por coma — igual que
-- codigos_certificados) y el nombre del metrólogo(a) que calibró.
--
-- Auditoría: en vez de recrear log_ordenes_calibracion() completo
-- (última versión en 20260901_calibraciones_anular.sql), un trigger
-- aparte registra solo estas dos columnas en el mismo historial.
-- ============================================================

ALTER TABLE ordenes_calibracion
  ADD COLUMN IF NOT EXISTS codigos_referencia text,
  ADD COLUMN IF NOT EXISTS nombre_metrologo   text;

CREATE OR REPLACE FUNCTION log_ordenes_calibracion_codigos_referencia() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.codigos_referencia IS DISTINCT FROM OLD.codigos_referencia THEN
    INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'codigos_referencia', OLD.codigos_referencia, NEW.codigos_referencia);
  END IF;
  IF NEW.nombre_metrologo IS DISTINCT FROM OLD.nombre_metrologo THEN
    INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'nombre_metrologo', OLD.nombre_metrologo, NEW.nombre_metrologo);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ordenes_calibracion_codigos_referencia ON ordenes_calibracion;
CREATE TRIGGER trg_log_ordenes_calibracion_codigos_referencia
  AFTER UPDATE ON ordenes_calibracion
  FOR EACH ROW EXECUTE FUNCTION log_ordenes_calibracion_codigos_referencia();
