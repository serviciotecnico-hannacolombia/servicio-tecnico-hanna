-- ============================================================
-- Bodega OTST: pendientes de despacho por número de OTST directo
-- (ya no requiere que la OTST exista/esté seleccionada en bodega
--  al momento de agregarla a la lista)
-- ============================================================

ALTER TABLE otst_bodega_pendientes ADD COLUMN IF NOT EXISTS otst text;

UPDATE otst_bodega_pendientes p
SET otst = b.otst
FROM otst_bodega b
WHERE p.otst_id = b.id AND p.otst IS NULL;

ALTER TABLE otst_bodega_pendientes ALTER COLUMN otst_id DROP NOT NULL;
ALTER TABLE otst_bodega_pendientes ALTER COLUMN otst SET NOT NULL;
