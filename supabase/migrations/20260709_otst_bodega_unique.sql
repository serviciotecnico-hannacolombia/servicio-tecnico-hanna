-- ============================================================
-- Bodega OTST: evitar OTST duplicadas
-- ============================================================

ALTER TABLE otst_bodega
  ADD CONSTRAINT otst_bodega_otst_unique UNIQUE (otst);
