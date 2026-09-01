-- ============================================================
-- Calibraciones → Logística: remisiones/facturas que llegaron pero
-- todavía no se han procesado en el sistema. Se registran a mano (no
-- vienen de una orden de calibración existente) y se eliminan una vez
-- quedan procesadas — no es un historial permanente, es una bandeja de
-- pendientes.
-- ============================================================

CREATE TABLE IF NOT EXISTS calibraciones_logistica_pendientes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente     text NOT NULL,
  factura     text,
  remision    text,
  otst        text,
  creado_por  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calibraciones_logistica_pendientes_factura_o_remision
    CHECK (factura IS NOT NULL OR remision IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_calibraciones_logistica_pendientes_created
  ON calibraciones_logistica_pendientes (created_at DESC);

ALTER TABLE calibraciones_logistica_pendientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calibraciones_logistica_pendientes select"
  ON calibraciones_logistica_pendientes FOR SELECT TO authenticated
  USING (has_module('calibraciones'));

CREATE POLICY "calibraciones_logistica_pendientes write"
  ON calibraciones_logistica_pendientes FOR ALL TO authenticated
  USING (has_module('calibraciones') AND has_capability('calibraciones_editar'))
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));
