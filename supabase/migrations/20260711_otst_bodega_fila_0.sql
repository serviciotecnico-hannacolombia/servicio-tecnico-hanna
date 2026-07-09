-- ============================================================
-- Bodega OTST: la fila pasa de 1-4 a 0-3
-- ============================================================

ALTER TABLE otst_bodega DROP CONSTRAINT IF EXISTS otst_bodega_fila_check;
ALTER TABLE otst_bodega ADD CONSTRAINT otst_bodega_fila_check CHECK (fila BETWEEN 0 AND 3);
