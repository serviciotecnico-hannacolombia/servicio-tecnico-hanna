-- ============================================================
-- Bodega OTST: nuevo tipo de movimiento "reingreso" — para volver a
-- ingresar a bodega un OTST que ya fue despachado (retirado), desde el
-- historial de completados. Mismo criterio de permisos que "ingreso": lo
-- exige la capability bodega_registrar_ingreso.
-- ============================================================

ALTER TABLE otst_bodega_movimientos DROP CONSTRAINT IF EXISTS otst_bodega_movimientos_tipo_check;
ALTER TABLE otst_bodega_movimientos ADD CONSTRAINT otst_bodega_movimientos_tipo_check
  CHECK (tipo IN ('ingreso','traslado','contacto','retiro','novedad','edicion','reingreso'));

DROP POLICY IF EXISTS "movimientos insert" ON otst_bodega_movimientos;
CREATE POLICY "movimientos insert" ON otst_bodega_movimientos
  FOR INSERT TO authenticated
  WITH CHECK (
    has_module('bodega')
    AND (tipo NOT IN ('ingreso','reingreso') OR has_capability('bodega_registrar_ingreso'))
  );
