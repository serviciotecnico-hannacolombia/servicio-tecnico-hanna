-- ============================================================
-- Calibraciones → Logística → Pendientes: enlace con una o varias órdenes
-- de calibración existentes. Un pendiente deja de aparecer en "Pendientes
-- por procesar" en cuanto queda enlazado a al menos una orden — el enlace
-- es la señal de que ya se identificó/procesó, sin necesidad de borrar el
-- registro (queda como referencia y se puede desenlazar si fue un error).
-- ============================================================

CREATE TABLE IF NOT EXISTS calibraciones_logistica_pendientes_ordenes (
  pendiente_id  uuid NOT NULL REFERENCES calibraciones_logistica_pendientes(id) ON DELETE CASCADE,
  orden_id      uuid NOT NULL REFERENCES ordenes_calibracion(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pendiente_id, orden_id)
);

CREATE INDEX IF NOT EXISTS idx_calibraciones_logistica_pendientes_ordenes_orden
  ON calibraciones_logistica_pendientes_ordenes (orden_id);

ALTER TABLE calibraciones_logistica_pendientes_ordenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calibraciones_logistica_pendientes_ordenes select"
  ON calibraciones_logistica_pendientes_ordenes FOR SELECT TO authenticated
  USING (has_module('calibraciones'));

CREATE POLICY "calibraciones_logistica_pendientes_ordenes write"
  ON calibraciones_logistica_pendientes_ordenes FOR ALL TO authenticated
  USING (has_module('calibraciones') AND has_capability('calibraciones_editar'))
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));
