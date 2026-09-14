-- ============================================================
-- Dos nuevos servicios en el catálogo RV CALIBR (Calibraciones):
-- Color de agua (PCU) y Grados Brix, ambos solo laboratorio externo.
-- ============================================================

INSERT INTO rv_calibr_catalogo (codigo, magnitud, descripcion, modalidades_permitidas, proveedores_permitidos, solo_laboratorio_externo, envio_exclusivo_tcc, activo)
VALUES
  ('RV CALIBR.16', 'Color de agua PCU', 'Servicio de Calibración (NO Acreditado) Colorímetro en Pt-Co', ARRAY['laboratorio_externo'], NULL, true, false, true),
  ('RV CALIBR.17', 'Grados Brix', 'Servicio de Calibración Acreditado Magnitud Refractometría 0 °Bx a 60 °Bx (5 puntos)', ARRAY['laboratorio_externo'], NULL, true, false, true)
ON CONFLICT (codigo) DO NOTHING;
