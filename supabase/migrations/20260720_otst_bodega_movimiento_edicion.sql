-- ============================================================
-- Bodega OTST: nuevo tipo de movimiento "edicion" para correcciones
-- manuales de correo/NIT sin disparar el flujo de contacto
-- ============================================================

ALTER TABLE otst_bodega_movimientos DROP CONSTRAINT IF EXISTS otst_bodega_movimientos_tipo_check;
ALTER TABLE otst_bodega_movimientos ADD CONSTRAINT otst_bodega_movimientos_tipo_check
  CHECK (tipo IN ('ingreso','traslado','contacto','retiro','novedad','edicion'));
