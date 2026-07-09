-- ============================================================
-- Bodega OTST: to-do de despachos/salidas solicitadas por cliente
-- ============================================================

CREATE TABLE IF NOT EXISTS otst_bodega_pendientes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otst_id        uuid NOT NULL REFERENCES otst_bodega(id) ON DELETE CASCADE,
  nota           text,
  estado         text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completado')),
  solicitado_por text,
  completado_por text,
  completado_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otst_bodega_pendientes_estado  ON otst_bodega_pendientes (estado);
CREATE INDEX IF NOT EXISTS idx_otst_bodega_pendientes_otst_id ON otst_bodega_pendientes (otst_id);

ALTER TABLE otst_bodega_pendientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read otst_bodega_pendientes"
  ON otst_bodega_pendientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all otst_bodega_pendientes"
  ON otst_bodega_pendientes FOR ALL TO authenticated USING (true);
