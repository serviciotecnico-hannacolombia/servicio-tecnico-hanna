-- ============================================================
-- Contexto adicional por equipo en Mantenimiento Programado:
-- ubicación física en el cliente, proceso en el que se usa, e
-- ID interno del cliente (distinto del serial de fábrica).
-- ============================================================

ALTER TABLE equipos_mantenimiento
  ADD COLUMN IF NOT EXISTS ubicacion text,
  ADD COLUMN IF NOT EXISTS proceso text,
  ADD COLUMN IF NOT EXISTS id_interno text;
