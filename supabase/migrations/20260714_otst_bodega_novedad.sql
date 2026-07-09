-- ============================================================
-- Bodega OTST: estado "novedad" (no se encontró físicamente)
-- con responsable asignado para investigar
-- ============================================================

ALTER TABLE otst_bodega ADD COLUMN IF NOT EXISTS responsable_novedad text;

ALTER TABLE otst_bodega DROP CONSTRAINT IF EXISTS otst_bodega_estado_check;
ALTER TABLE otst_bodega ADD CONSTRAINT otst_bodega_estado_check
  CHECK (estado IN ('en_bodega','contactado','retirado','novedad'));

ALTER TABLE otst_bodega_movimientos DROP CONSTRAINT IF EXISTS otst_bodega_movimientos_tipo_check;
ALTER TABLE otst_bodega_movimientos ADD CONSTRAINT otst_bodega_movimientos_tipo_check
  CHECK (tipo IN ('ingreso','traslado','contacto','retiro','novedad'));
