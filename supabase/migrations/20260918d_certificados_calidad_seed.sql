-- ============================================================
-- Seed esencial de certificados_calidad_plantillas /
-- _soluciones_patron. Deliberadamente corto: son las familias base más
-- comunes (pH, Cloro Libre, Temperatura, Multiparámetro, Conductividad,
-- Turbidez, Oxígeno Disuelto, Titulador, Bomba, Reactivo). La idea es que
-- la base crezca desde el uso real: al armar un certificado, el técnico
-- edita los campos de la plantilla elegida y la guarda como una nueva
-- plantilla (botón "Guardar como plantilla" en Mediciones), en vez de
-- intentar precargar cada referencia posible de una vez.
--
-- Los valores de "pH" se tomaron del certificado real 5749 (equipo
-- HI 9810322) como referencia fiel del formato esperado.
-- ============================================================

INSERT INTO certificados_calidad_plantillas
  (codigo, nombre, categoria, filas, test_funcional_items, embalaje_items, control_estetico_items, notas_generales)
VALUES

(
  'pH',
  'Verificación de pH con buffers estándar',
  'pH',
  '[
    {"valor": "7.01 pH ✔", "estandar": "7.01 ± 0.01 pH @25°C", "tolerancia": "±0.05 pH"},
    {"valor": "3.99 pH ✔", "estandar": "4.01 ± 0.01 pH @25°C", "tolerancia": "±0.05 pH"},
    {"valor": "10.01 pH ✔", "estandar": "10.01 ± 0.01 pH @25°C", "tolerancia": "±0.05 pH"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Memoria','Medición','Batería'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  NULL
),
(
  'Cloro Libre',
  'Verificación de Cloro Libre',
  'Cloro Libre',
  '[
    {"valor": "0.00 ppm ✔", "estandar": "0.00 ppm @25°C", "tolerancia": "±0.03 ppm ±3% de lectura"},
    {"valor": "0.96 ppm ✔", "estandar": "1.00 ±0.05 ppm @25°C", "tolerancia": "±0.03 ppm ±3% de lectura"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Memoria','Medición','Batería'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  NULL
),
(
  'Temperatura',
  'Verificación de temperatura con sonda',
  'Temperatura',
  '[
    {"valor": "0.0 °C ✔", "estandar": "0.0 °C", "tolerancia": "±0.7 °C + 1.5 error sonda"},
    {"valor": "19.2 °C ✔", "estandar": "19.2 °C", "tolerancia": "±0.7 °C + 1.5 error sonda"},
    {"valor": "50.1 °C ✔", "estandar": "50.2 °C", "tolerancia": "±0.7 °C + 1.5 error sonda"}
  ]'::jsonb,
  ARRAY['LCD','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  NULL
),
(
  'Multiparámetro',
  'Verificación pH / mV / OD / Conductividad',
  'Multiparámetro',
  '[
    {"valor": "7.01 pH ✔", "estandar": "7.01 ± 0.1 pH @25°C", "tolerancia": "±0.05 pH"},
    {"valor": "4.01 pH ✔", "estandar": "4.01 ± 0.1 pH @25°C", "tolerancia": "±0.05 pH"},
    {"valor": "10.00 pH ✔", "estandar": "10.01 ± 0.1 pH @25°C", "tolerancia": "±0.05 pH"},
    {"valor": "100 % OD ✔", "estandar": "100% OD @25°C", "tolerancia": "90-120 % OD"},
    {"valor": "1417 uS/cm ✔", "estandar": "1413±5 uS/cm @25°C", "tolerancia": "±5.5% de la lectura"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Teclado','Memoria','Medición','Batería'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento'],
  NULL
),
(
  'Conductividad',
  'Verificación de Conductividad',
  'Conductividad',
  '[
    {"valor": "84 uS/cm ✔", "estandar": "84±1 uS/cm @25°C", "tolerancia": "±2% F.S"},
    {"valor": "1413 uS/cm ✔", "estandar": "1413±5 uS/cm @25°C", "tolerancia": "±2% F.S"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Memoria','Medición','Batería'],
  ARRAY['Instrumento','Sonda','Caja','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  NULL
),
(
  'Turbidez',
  'Verificación de Turbidez (NTU)',
  'Turbidez',
  '[
    {"valor": "0.10 NTU ✔", "estandar": "0.10 NTU @25°C", "tolerancia": "±2% o 0.02 NTU, lo que sea mayor"},
    {"valor": "15.0 NTU ✔", "estandar": "15.0 NTU @25°C", "tolerancia": "±2% o 0.02 NTU, lo que sea mayor"},
    {"valor": "100 NTU ✔", "estandar": "100 NTU @25°C", "tolerancia": "±2% o 0.02 NTU, lo que sea mayor"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Memoria','Medición','Batería'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  NULL
),
(
  'Oxígeno Disuelto',
  'Verificación de Oxígeno Disuelto (%OD)',
  'Oxígeno Disuelto',
  '[
    {"valor": "0.0 % OD ✔", "estandar": "0% ± 0.1 OD @25°C", "tolerancia": "&lt;10 % OD"},
    {"valor": "100 % OD ✔", "estandar": "100% OD @25°C", "tolerancia": "90-120 % OD"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Memoria','Medición','Batería'],
  ARRAY['Instrumento','Sonda','Caja','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  NULL
),
(
  'Titulador',
  'Verificación funcional y física de titulador',
  'Titulador',
  '[
    {"valor": "7.03 pH(-9.1mV) ✔", "estandar": "7.01 ± 0.01 pH @25°C", "tolerancia": "±0.001 pH"},
    {"valor": "4.03 pH(168.1mV) ✔", "estandar": "4.01 ± 0.01 pH @25°C", "tolerancia": "±0.001 pH"},
    {"valor": "10.04 pH(-171.9mV) ✔", "estandar": "10.01 ± 0.01 pH @25°C", "tolerancia": "±0.001 pH"}
  ]'::jsonb,
  ARRAY['Interruptor ON/OFF','LCD','Teclado','Memoria','Medición'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  $txt$Se realiza la verificación funcional y física del equipo, el cual cumple con las especificaciones técnicas que se encuentran en el manual de usuario. En la inspección física se encuentra lo siguiente:

*Bomba totalmente funcional
*Bureta y mangueras no presentan filtraciones, ni torceduras.
*Conexiones en buen estado.

En la verificación funcional se obtuvieron los siguientes resultados:$txt$
),
(
  'Bomba',
  'Verificación de bomba dosificadora',
  'Bomba',
  '[]'::jsonb,
  '{}', '{}', '{}',
  $txt$Se realizó la verificación del instrumento, obteniendo los siguientes resultados:

Físico:
-Bomba en buen estado, no presenta filtraciones.

Funcional:
Se verificó en los siguientes porcentajes de operación (caudal):
-15% de dosificación ok
-50% de dosificación ok
-100% de dosificación ok.$txt$
),
(
  'Reactivo',
  'Verificación de reactivo/solución',
  'Reactivos',
  '[]'::jsonb,
  '{}', '{}', '{}',
  $txt$Ref. [nombre del reactivo o solución].
Lote: [editar]
F. de Vencimiento: [editar]
Se realizó proceso de verificación del reactivo [código]. Se certifica que el reactivo se encuentra en buen estado y es funcional dentro de las especificaciones técnicas señaladas en el manual de operaciones.
Todos los estándares y reactivos son preparados en fábrica Hanna Instruments a una temperatura controlada de 25°C usando agua desionizada para uso analítico ISO3696/BS397.
El material de referencia es periódicamente verificado acorde procedimientos estipulados por el fabricante.$txt$
)
ON CONFLICT (codigo) DO NOTHING;

-- Soluciones estándar reales (Hanna) para el recuadro "Información de
-- Soluciones Estándar y/o Equipos Patrones Utilizados" — código, lote y
-- fecha de expiración vigentes al momento de este seed (certificado 5749);
-- se actualizan desde "Soluciones Patrón" cuando cambie el lote en uso.
INSERT INTO certificados_calidad_soluciones_patron (categoria, codigo, lote, fecha_expiracion, descripcion)
VALUES
  ('pH', 'HI 7007L', '0348', '2029-06-30', 'Solución Estándar pH 7.01'),
  ('pH', 'HI 7004L', '0373', '2029-07-31', 'Solución Estándar pH 4.01'),
  ('pH', 'HI 7010L', '0376', '2026-07-31', 'Solución Estándar pH 10.01');
