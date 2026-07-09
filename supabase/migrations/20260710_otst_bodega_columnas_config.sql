-- ============================================================
-- Bodega OTST: columnas físicas configurables (ya no fijas A-H)
-- ============================================================

ALTER TABLE otst_bodega_config
  ADD COLUMN IF NOT EXISTS columnas text[] NOT NULL DEFAULT ARRAY['A','B','C','D','E','F','G','H'];

-- La restricción original solo permitía A-H; ahora cualquier letra mayúscula
-- es válida, ya que la lista de columnas vigentes se administra en
-- otst_bodega_config.columnas y puede crecer desde Configuración.
ALTER TABLE otst_bodega DROP CONSTRAINT IF EXISTS otst_bodega_columna_check;
ALTER TABLE otst_bodega ADD CONSTRAINT otst_bodega_columna_check CHECK (columna ~ '^[A-Z]$');
