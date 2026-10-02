-- ============================================================
-- Certificados de Calidad: plantillas tomadas de certificados reales
-- (5857, 5861, 5911, 5916, 5918, 5921, 5924, 5927) — por familia y por
-- equipo específico — y dos columnas nuevas en las plantillas:
--
-- * encabezado_patron: título de la 2.ª columna de la tabla de Mediciones.
--   Los termómetros se verifican contra un termómetro patrón y su tabla dice
--   "Equ. Patrón", no "Sol. Estándar".
-- * patrones: códigos del catálogo de Soluciones Patrón que la plantilla
--   precarga sola en "Soluciones Estándar" al elegirla (con el lote y
--   vencimiento vigentes del catálogo) — p. ej. los 3 buffers de pH.
--   Se comparan sin espacios ni mayúsculas ("HI7004/1L" = "HI 7004/1L").
--
-- Los "valor" de cada fila son lecturas de ejemplo de esos certificados:
-- el técnico las reemplaza por las de su equipo al armar cada certificado.
-- ============================================================

ALTER TABLE certificados_calidad_plantillas
  ADD COLUMN IF NOT EXISTS encabezado_patron text NOT NULL DEFAULT 'Sol. Estándar',
  ADD COLUMN IF NOT EXISTS patrones text[] NOT NULL DEFAULT '{}';

-- ------------------------------------------------------------
-- Soluciones / equipos patrón con los lotes vigentes en los certificados
-- más recientes. Solo se agregan si ese código+lote no existe ya.
-- ------------------------------------------------------------
INSERT INTO certificados_calidad_soluciones_patron (categoria, codigo, lote, fecha_expiracion, descripcion)
SELECT v.categoria, v.codigo, v.lote, v.fecha_expiracion, v.descripcion
FROM (VALUES
  ('pH',            'HI 7004/1L', '2640',      '2030-12', 'Solución estándar de 4.01 pH'),
  ('pH',            'HI 7007/1L', '2215',      '2030-09', 'Solución estándar de 7.01 pH'),
  ('pH',            'HI 7010L/C', '2729',      '2028-01', 'Solución estándar de 10.01 pH'),
  ('Conductividad', 'HI 7030/1G', '1597',      '2030-05', 'Solución Conductividad 12.88 mS/cm'),
  ('Temperatura',   'HI 935005',  'E0038411',  '2026-11', 'Termómetro patrón.'),
  ('Color',         'HI 727-11',  'SC0149/26', '2028-05', 'Estándar de calibración Color de Agua')
) AS v(categoria, codigo, lote, fecha_expiracion, descripcion)
WHERE NOT EXISTS (
  SELECT 1 FROM certificados_calidad_soluciones_patron s
  WHERE replace(upper(s.codigo), ' ', '') = replace(upper(v.codigo), ' ', '') AND s.lote = v.lote
);

-- Los buffers del seed inicial (lotes 0348/0373/0376) ya fueron reemplazados
-- por los de arriba: se desactivan para que no se sugieran por error.
UPDATE certificados_calidad_soluciones_patron
SET activo = false, updated_at = now()
WHERE (codigo, lote) IN (('HI 7007L', '0348'), ('HI 7004L', '0373'), ('HI 7010L', '0376'));

-- ------------------------------------------------------------
-- Familias existentes: ajustes con lo que muestran los certificados reales
-- ------------------------------------------------------------

-- pH: precarga los 3 buffers.
UPDATE certificados_calidad_plantillas
SET patrones = ARRAY['HI 7004/1L', 'HI 7007/1L', 'HI 7010L/C'], updated_at = now()
WHERE codigo = 'pH';

-- Temperatura: se verifica contra el termómetro patrón en 4 puntos
-- (certificados 5916 y 5927); la exactitud cambia por equipo.
UPDATE certificados_calidad_plantillas
SET encabezado_patron = 'Equ. Patrón',
    filas = '[
      {"valor": "0.0 °C ✔",   "estandar": "0.0 °C",   "tolerancia": "±0.7 °C + 1.5 error sonda"},
      {"valor": "19.2 °C ✔",  "estandar": "19.2 °C",  "tolerancia": "±0.7 °C + 1.5 error sonda"},
      {"valor": "50.2 °C ✔",  "estandar": "50.2 °C",  "tolerancia": "±0.7 °C + 1.5 error sonda"},
      {"valor": "150.0 °C ✔", "estandar": "150.0 °C", "tolerancia": "±0.7 °C + 1.5 error sonda"}
    ]'::jsonb,
    test_funcional_items = ARRAY['Interruptor ON/OFF','LCD','Medición','Batería'],
    embalaje_items = ARRAY['Instrumento','Caja','Manual de Instrucciones'],
    control_estetico_items = ARRAY['Estética del instrumento'],
    patrones = ARRAY['HI 935005'],
    updated_at = now()
WHERE codigo = 'Temperatura';

-- Conductividad: precarga el estándar de 12.88 mS/cm en uso.
UPDATE certificados_calidad_plantillas
SET patrones = ARRAY['HI 7030/1G'], updated_at = now()
WHERE codigo = 'Conductividad';

-- Oxígeno Disuelto: la tolerancia del seed quedó escrita como entidad HTML
-- ("&lt;10 % OD"); ahora el texto se escapa solo al copiar.
UPDATE certificados_calidad_plantillas
SET filas = replace(filas::text, '&lt;', '<')::jsonb, updated_at = now()
WHERE filas::text LIKE '%&lt;%';

-- Reactivos (certificados 5911 y 5918): solo Control Estético, con el ítem
-- "Reactivo." además de la estética.
UPDATE certificados_calidad_plantillas
SET test_funcional_items = '{}',
    embalaje_items = '{}',
    control_estetico_items = ARRAY['Estética del instrumento', 'Reactivo.'],
    updated_at = now()
WHERE codigo = 'Reactivo';

-- ------------------------------------------------------------
-- Equipos específicos (uno por certificado de ejemplo)
-- ------------------------------------------------------------
INSERT INTO certificados_calidad_plantillas
  (codigo, nombre, categoria, encabezado_patron, filas, test_funcional_items, embalaje_items, control_estetico_items, patrones)
VALUES
(
  -- Certificado 5857
  'HI 6221-01', 'Medidor de sobremesa serie 6000 para pH/ORP', 'pH', 'Sol. Estándar',
  '[
    {"valor": "7.00 pH (5.1mV) ✔",     "estandar": "7.01 pH @25°C (0 mV)",         "tolerancia": "±0.05 pH (±25mV)"},
    {"valor": "4.01 pH (172.1mV) ✔",   "estandar": "4.01 pH @25°C (177.48 mV)",    "tolerancia": "±0.05 pH (±25mV)"},
    {"valor": "10.00 pH (-170.9mV) ✔", "estandar": "10.01 pH @25°C (-177.48 mV)",  "tolerancia": "±0.05 pH (±25mV)"},
    {"valor": "18.4 °C ✔",             "estandar": "18.2 °C",                      "tolerancia": "±0.7 °C"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Sonido','Hora/reloj','Memoria','Medición','USB','Batería'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Cable USB','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  ARRAY['HI 7004/1L','HI 7007/1L','HI 7010L/C']
),
(
  -- Certificado 5861
  'HI 98130', 'Combo, medidor de pH/CE/TDS/ºC/ºF', 'Multiparámetro', 'Sol. Estándar',
  '[
    {"valor": "7.0 pH ✔",      "estandar": "7.01 ± 0.1 pH @25°C",    "tolerancia": "±0.2 pH"},
    {"valor": "4.1 pH ✔",      "estandar": "4.01 ± 0.1 pH @25°C",    "tolerancia": "±0.2 pH"},
    {"valor": "10.0 pH ✔",     "estandar": "10.01 ± 0.1 pH @25°C",   "tolerancia": "±0.2 pH"},
    {"valor": "12.88 mS/cm ✔", "estandar": "12880±5 uS/cm @25°C",    "tolerancia": "±2.0% F.S"},
    {"valor": "18.3 °C ✔",     "estandar": "18.2 °C",                "tolerancia": "±0.7 °C"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Memoria','Medición','Batería'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento'],
  ARRAY['HI 7004/1L','HI 7007/1L','HI 7010L/C','HI 7030/1G']
),
(
  -- Certificado 5916
  'HI 98501', 'Termómetro digital Checktemp C -50 a 150°C', 'Temperatura', 'Equ. Patrón',
  '[
    {"valor": "0.1 °C ✔",   "estandar": "0.0 °C",   "tolerancia": "±0.7 °C + 1.5 error sonda"},
    {"valor": "19.1 °C ✔",  "estandar": "19.2 °C",  "tolerancia": "±0.7 °C + 1.5 error sonda"},
    {"valor": "50.3 °C ✔",  "estandar": "50.2 °C",  "tolerancia": "±0.7 °C + 1.5 error sonda"},
    {"valor": "150.0 °C ✔", "estandar": "150.0 °C", "tolerancia": "±0.7 °C + 1.5 error sonda"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Medición','Batería'],
  ARRAY['Instrumento','Caja','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  ARRAY['HI 935005']
),
(
  -- Certificado 5927
  'HI 151', 'Termómetro plegable para lácteos', 'Temperatura', 'Equ. Patrón',
  '[
    {"valor": "0.0 °C ✔",   "estandar": "0.0 °C",   "tolerancia": "±0.2 °C + 1.5 error sonda"},
    {"valor": "19.2 °C ✔",  "estandar": "19.2 °C",  "tolerancia": "±0.2 °C + 1.5 error sonda"},
    {"valor": "50.1 °C ✔",  "estandar": "50.2 °C",  "tolerancia": "±0.2 °C + 1.5 error sonda"},
    {"valor": "149.9 °C ✔", "estandar": "150.0 °C", "tolerancia": "±0.2 °C + 1.5 error sonda"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Medición','Batería'],
  ARRAY['Instrumento','Caja','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  ARRAY['HI 935005']
),
(
  -- Certificado 5921
  'HI 727', 'Checker Color del Agua (0 a 500 PCU)', 'Color', 'Sol. Estándar',
  '[
    {"valor": "0.0 PCU ✔", "estandar": "0.0 PCU @25°C",       "tolerancia": "±10 PCU ±5% de lectura"},
    {"valor": "145 PCU ✔", "estandar": "150 ±15 PCU @25°C",   "tolerancia": "±10 PCU ±5% de lectura"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Medición','Batería'],
  ARRAY['Instrumento','Caja','Manual de Instrucciones','Dos cubetas.'],
  ARRAY['Estética del instrumento'],
  ARRAY['HI 727-11']
),
(
  -- Certificado 5924. Sus CalCheck (HI 97701-11 / HI 97710-11) no se cargan
  -- al catálogo porque los lotes de ese certificado ya vencieron: al
  -- registrar los lotes vigentes en Soluciones Patrón se precargan solos.
  'HI 97710C', 'Kit Fotóm. Cloro Libre, Cloro Total y pH', 'Cloro Libre', 'Sol. Estándar',
  '[
    {"valor": "7.0 pH ✔",    "estandar": "7.0 pH @25°C",                    "tolerancia": "±0.2 pH"},
    {"valor": "1.00 mg/L ✔", "estandar": "1.00 ± 0.03mg/L CL2 F @25°C",     "tolerancia": "±0.03 mg/L ±3% de lectura"},
    {"valor": "1.00 mg/L ✔", "estandar": "1.00 ± 0.03mg/L CL2 T @25°C",     "tolerancia": "±0.03 mg/L ±3% de lectura"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Sonido','Hora/reloj','Teclado','Memoria','Medición','Batería'],
  ARRAY['Instrumento','Caja','Manual de Instrucciones','Estándares de verificación.','Pañuelo.','Cubetas (2).'],
  ARRAY['Estética del instrumento'],
  ARRAY['HI 97701-11','HI 97710-11']
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  categoria = EXCLUDED.categoria,
  encabezado_patron = EXCLUDED.encabezado_patron,
  filas = EXCLUDED.filas,
  test_funcional_items = EXCLUDED.test_funcional_items,
  embalaje_items = EXCLUDED.embalaje_items,
  control_estetico_items = EXCLUDED.control_estetico_items,
  patrones = EXCLUDED.patrones,
  updated_at = now();
