-- ============================================================
-- Módulo: Bodega OTST — registrar NIT del cliente (nuevo formato de QR)
-- ============================================================

ALTER TABLE otst_bodega ADD COLUMN IF NOT EXISTS nit_cliente text;

CREATE INDEX IF NOT EXISTS idx_otst_bodega_nit ON otst_bodega (nit_cliente);
