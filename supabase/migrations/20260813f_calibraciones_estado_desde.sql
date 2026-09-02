-- ============================================================
-- Calibraciones: registra desde cuándo una orden está en su estado
-- actual, para que el semáforo pueda alertar sobre órdenes estancadas
-- en etapas que todavía no tienen una fecha objetivo propia (OC creada,
-- en mantenimiento, en programación de visita antes de fijar fecha…).
-- Se maneja con un trigger BEFORE (no el AFTER de auditoría existente
-- en log_ordenes_calibracion, que ya no puede modificar la fila).
-- ============================================================

ALTER TABLE ordenes_calibracion ADD COLUMN IF NOT EXISTS estado_desde timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION set_estado_desde_ordenes_calibracion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.estado_desde := now();
  ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
    NEW.estado_desde := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_estado_desde_ordenes_calibracion ON ordenes_calibracion;
CREATE TRIGGER trg_set_estado_desde_ordenes_calibracion
  BEFORE INSERT OR UPDATE ON ordenes_calibracion
  FOR EACH ROW EXECUTE FUNCTION set_estado_desde_ordenes_calibracion();
