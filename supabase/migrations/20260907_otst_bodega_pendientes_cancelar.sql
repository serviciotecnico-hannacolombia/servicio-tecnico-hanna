-- ============================================================
-- Hoy la única forma de cerrar un pendiente de despacho sin
-- completarlo es borrarlo (requiere bodega_eliminar, Líderes/Admin).
-- Para una OTST "no encontrada en bodega" no hay match con
-- otst_bodega, así que tampoco se puede usar "Completar" — Servicio
-- Técnico queda sin ninguna forma de cerrarla. Se agrega un tercer
-- estado 'cancelado', simétrico a 'completado' (mismo patrón
-- completado_por/completado_at), que se llega vía UPDATE — la
-- política "bodega_pendientes update" ya solo exige has_module
-- ('bodega'), sin necesitar bodega_eliminar.
-- ============================================================

ALTER TABLE otst_bodega_pendientes DROP CONSTRAINT IF EXISTS otst_bodega_pendientes_estado_check;
ALTER TABLE otst_bodega_pendientes
  ADD CONSTRAINT otst_bodega_pendientes_estado_check CHECK (estado IN ('pendiente', 'completado', 'cancelado'));

ALTER TABLE otst_bodega_pendientes
  ADD COLUMN IF NOT EXISTS cancelado_por text,
  ADD COLUMN IF NOT EXISTS cancelado_at timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion text;
