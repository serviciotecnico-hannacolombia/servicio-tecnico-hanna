-- ============================================================
-- Calibraciones: actualiza las descripciones del catálogo RV CALIBR
-- para incluir los puntos/rangos MRC seleccionables de cada servicio
-- (antes solo decían "N puntos" sin el detalle de los valores), y
-- agrega RV CALIBR.13 (ORP, no acreditado) que faltaba en el catálogo.
-- ============================================================

UPDATE rv_calibr_catalogo SET descripcion =
  'Buretas de tituladores, 0,5 mL a 100 mL, en 3 puntos. Envío ida y regreso exclusivo TCC, junto con la bomba dosificadora'
  WHERE codigo = 'RV CALIBR.2';

UPDATE rv_calibr_catalogo SET descripcion =
  'Potencial de Hidrógeno (pH), 1 o 3 puntos MRC (2 / 4 / 7 / 10 / 12 pH)'
  WHERE codigo = 'RV CALIBR.5';

UPDATE rv_calibr_catalogo SET descripcion =
  'Potencial de Hidrógeno (pH), 4 o 5 puntos MRC (2 / 4 / 7 / 10 / 12 pH)'
  WHERE codigo = 'RV CALIBR.6';

UPDATE rv_calibr_catalogo SET descripcion =
  'Conductividad, 1 o 3 puntos MRC (1 / 5 / 10 / 84 / 100 / 1413 / 10000 µs/cm)'
  WHERE codigo = 'RV CALIBR.7';

UPDATE rv_calibr_catalogo SET descripcion =
  'Conductividad, 4 o 6 puntos MRC (1 / 5 / 10 / 84 / 100 / 1413 / 10000 µs/cm)'
  WHERE codigo = 'RV CALIBR.8';

UPDATE rv_calibr_catalogo SET descripcion =
  'Concentración de sustancia — Medidores de Cloro, 5 puntos MRC según el rango del equipo (0,20 / 0,50 / 1,00 / 1,50 / 2,00 / 3,00 / 4,00 mg/L Cl₂). El cliente debe suministrar el reactivo de desarrollo de color y las celdas de su equipo'
  WHERE codigo = 'RV CALIBR.9';

UPDATE rv_calibr_catalogo SET descripcion =
  'Concentración de sustancia — Medidor de Oxígeno Disuelto (OD), 3 puntos a 20°C (0 mg/L O₂ / 100% saturación local / 1 punto MRC disponible). El cliente debe suministrar la solución electrolítica'
  WHERE codigo = 'RV CALIBR.10';

UPDATE rv_calibr_catalogo SET descripcion =
  'Turbidímetros, 5 puntos MRC según el rango del equipo (0,5 / 1 / 10 / 20 / 50 / 100 / 500 / 1000 / 4000 NTU). El cliente debe informar marca y modelo de su equipo'
  WHERE codigo = 'RV CALIBR.11';

UPDATE rv_calibr_catalogo SET descripcion =
  'Paquete Multiparámetro: pH (1 o 3 puntos MRC), Conductividad (1 o 3 puntos MRC, 1 / 5 / 10 / 84 / 100 / 1413 / 10000 µs/cm) y Temperatura'
  WHERE codigo = 'RV CALIBR.12';

UPDATE rv_calibr_catalogo SET descripcion =
  'Caracterización de medios — Bloques termoreactores, 3 puntos'
  WHERE codigo = 'RV CALIBR.15';

-- ── Nuevo: RV CALIBR.13 — ORP (no acreditado), faltaba en el catálogo ──────

INSERT INTO rv_calibr_catalogo (codigo, magnitud, descripcion, modalidades_permitidas, solo_laboratorio_externo, envio_exclusivo_tcc) VALUES
  ('RV CALIBR.13', 'ORP (No acreditado)', 'Calibración por trazabilidad (no acreditada) en 1 punto, según la composición del electrodo — preparación del MRC con sales primarias', ARRAY['laboratorio_externo'], true, false)
ON CONFLICT (codigo) DO NOTHING;
