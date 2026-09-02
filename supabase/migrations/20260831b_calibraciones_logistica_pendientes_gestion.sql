-- ============================================================
-- Calibraciones → Logística → Pendientes: gestión de cada pendiente —
-- relacionarlo con un asesor comercial de la base ya existente
-- (calibraciones_asesores, por correo) y anotar observaciones. Estos dos
-- datos son los que arman el mensaje de seguimiento copiable en la UI.
-- ============================================================

ALTER TABLE calibraciones_logistica_pendientes
  ADD COLUMN IF NOT EXISTS correo_asesor  text,
  ADD COLUMN IF NOT EXISTS observaciones  text;

CREATE INDEX IF NOT EXISTS idx_calibraciones_logistica_pendientes_correo_asesor
  ON calibraciones_logistica_pendientes (correo_asesor);
