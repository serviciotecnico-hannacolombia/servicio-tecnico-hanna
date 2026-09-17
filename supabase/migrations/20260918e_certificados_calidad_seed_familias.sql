-- ============================================================
-- Seed masivo de familias de plantillas de Mediciones a partir de
-- "Tablas HTML.txt" compartido por el usuario. Cada tabla es una FAMILIA
-- de verificación (no necesariamente un código de equipo literal — varias,
-- como "pH 2 decimales" o "Multiparámetro", agrupan varios modelos que
-- comparten la misma estructura de verificación).
--
-- El título de cada tabla se reemplazó por {{CODIGO}} (ver
-- applyPlaceholder en CrearCertificadoTab.tsx): al aplicar la plantilla a
-- un equipo, ese marcador se sustituye por el código real que el técnico
-- escriba en la fila de "Equipos" (la referencia de factura), dejando fijos
-- los valores de "Sol. Estándar"/"Tolerancia" para copiar y pegar tal cual.
--
-- Se omitieron dos tablas duplicadas del archivo original ("HI 97101C" y
-- "Tarjeta Análoga" aparecían dos veces con contenido casi idéntico) para
-- no violar el índice único de código — si esas variantes eran
-- intencionales, se pueden agregar a mano desde "Plantillas de Referencia".
-- ============================================================

INSERT INTO certificados_calidad_plantillas
  (codigo, nombre, categoria, mediciones_html, test_funcional_items, embalaje_items, control_estetico_items)
VALUES

(
  'Multiparámetro',
  'Multiparámetro — pH / ORP / OD / Conductividad / Temperatura',
  'Multiparámetro',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.01 pH ✔</td><td>7.01 ± 0.1 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>4.01 pH ✔</td><td>4.01 ± 0.1 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>10.00 pH ✔</td><td>10.01 ± 0.1 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>7.03 pH (-3.1mV) ✔</td><td>7.01 pH @25°C (0mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>4.03 pH (166.5mV) ✔</td><td>4.01 pH @25°C (177.48 mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>10.04 pH (-170.9mV) ✔</td><td>10.01 pH @25°C (-177.48 mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>421.2 mV ✔</td><td>470 mV @25°C</td><td>±50 mV</td></tr>
  <tr><td>0.0 % OD ✔</td><td>0% ± 0.1 OD @25°C</td><td>&lt;10 % OD</td></tr>
  <tr><td>100 % OD ✔</td><td>100% OD @25°C</td><td>90-120 % OD</td></tr>
  <tr><td>84 uS/cm ✔</td><td>84±1 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>1417 uS/cm ✔</td><td>1413±5 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>12.93 mS/cm ✔</td><td>12880 ±50 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>560.9 mmHg ✔</td><td>561.3 mmHg</td><td>±3 mmHg Aproximadamente</td></tr>
  <tr><td>18.4 °C ✔</td><td>18.2 °C</td><td>±0.7 °C</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 931',
  'HI 931 — verificación de mV',
  'pH/ORP',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Equi. referencia</th><th>Tolerancia</th></tr>
  <tr><td>0.0 mV ✔</td><td>0.0 mV</td><td>±5 mV</td></tr>
  <tr><td>177.4 mV ✔</td><td>177.5 mV</td><td>±5 mV</td></tr>
  <tr><td>1800 mV ✔</td><td>1800 mV</td><td>±5 mV</td></tr>
  <tr><td>-177.5 mV ✔</td><td>-177.5 mV</td><td>±5 mV</td></tr>
  <tr><td>-1800.1 mV ✔</td><td>-1800 mV</td><td>±5 mV</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'GLP',
  'GLP — registro de calibración (offset/slope)',
  'pH/ORP',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}} — GLP</th></tr>
  <tr><td>OFFSET: 0.0 mV ✔</td></tr>
  <tr><td>SLOPE A: 177.4 mV ✔</td></tr>
  <tr><td>SLOPE B: ✔</td></tr>
</table>$html$,
  '{}', '{}', '{}'
),
(
  'HI 98195',
  'HI 98195 — pH / mV / Conductividad / Temperatura',
  'Multiparámetro',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.03 pH (-3.1mV) ✔</td><td>7.01 pH @25°C (0mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>4.03 pH (166.5mV) ✔</td><td>4.01 pH @25°C (177.48 mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>10.04 pH (-170.9mV) ✔</td><td>10.01 pH @25°C (-177.48 mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>421.2 mV ✔</td><td>470 mV @25°C</td><td>±50 mV</td></tr>
  <tr><td>1417 uS/cm ✔</td><td>1413±5 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>12.93 mS/cm ✔</td><td>12880 ±50 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>18.4 °C ✔</td><td>18.2 °C</td><td>±0.7 °C</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'Combos',
  'Combos — pH / Conductividad / Temperatura',
  'Multiparámetro',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.01 pH ✔</td><td>7.01 ± 0.1 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>4.01 pH ✔</td><td>4.01 ± 0.1 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>10.00 pH ✔</td><td>10.01 ± 0.1 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>1417 uS/cm ✔</td><td>1413±5 uS/cm @25°C</td><td>±2.0% F.S</td></tr>
  <tr><td>12.93 mS/cm ✔</td><td>12880 ±50 uS/cm @25°C</td><td>±2.0% F.S</td></tr>
  <tr><td>18.4 °C ✔</td><td>18.2 °C</td><td>±0.7 °C</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'pH 1 decimales',
  'pH (1 decimal) — verificación con buffers',
  'pH',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.0 pH ✔</td><td>7.01 ± 0.1 pH @25°C</td><td>±0.2 pH</td></tr>
  <tr><td>4.0 pH ✔</td><td>4.01 ± 0.1 pH @25°C</td><td>±0.2 pH</td></tr>
  <tr><td>9.9 pH ✔</td><td>10.01 ± 0.1 pH @25°C</td><td>±0.2 pH</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'pH 2 decimales',
  'pH (2 decimales) — verificación con buffers',
  'pH',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>6.88 pH ✔</td><td>7.01 ± 0.01 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>3.91 pH ✔</td><td>4.01 ± 0.01 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>10.12 pH ✔</td><td>10.01 ± 0.01 pH @25°C</td><td>±0.05 pH</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'pH con mV',
  'pH con lectura de mV',
  'pH',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.03 pH (-3.1mV) ✔</td><td>7.01 pH @25°C (0mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>4.03 pH (166.5mV) ✔</td><td>4.01 pH @25°C (177.48 mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>10.04 pH (-170.9mV) ✔</td><td>10.01 pH @25°C (-177.48 mV)</td><td>±0.05 pH (±25mV)</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'Salida análoga pH',
  'Salida análoga (loop de corriente) — pH',
  'pH',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}} — Salida análoga</th><th>V calculado</th><th>Tolerancia</th></tr>
  <tr><td>12.06 mA ✔</td><td>11.96 mA @20°C</td><td>±0.30 mA</td></tr>
  <tr><td>8.61 mA ✔</td><td>8.58 mA @20°C</td><td>±0.30 mA</td></tr>
  <tr><td>15.48 mA ✔</td><td>15.40 mA @20°C</td><td>±0.30 mA</td></tr>
</table>$html$,
  '{}', '{}', '{}'
),
(
  'HI 981X',
  'HI 981X — pH / Conductividad / Temperatura',
  'Multiparámetro',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.0 pH ✔</td><td>7.01 ± 0.1 pH @25°C</td><td>±0.2 pH</td></tr>
  <tr><td>4.1 pH ✔</td><td>4.01 ± 0.1 pH @25°C</td><td>±0.2 pH</td></tr>
  <tr><td>10.0 pH ✔</td><td>10.01 ± 0.1 pH @25°C</td><td>±0.2 pH</td></tr>
  <tr><td>1.41 mS/cm ✔</td><td>1413±5 uS/cm @25°C</td><td>±2.0% F.S</td></tr>
  <tr><td>1410 uS/cm ✔</td><td>1413±5 uS/cm @25°C</td><td>±2.0% F.S</td></tr>
  <tr><td>18.4 °C ✔</td><td>18.2 °C</td><td>±0.7 °C</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 9814',
  'HI 9814 — pH / Conductividad',
  'Multiparámetro',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.01 pH ✔</td><td>7.01 ± 0.01 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>4.00 pH ✔</td><td>4.01 ± 0.01 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>10.01 pH ✔</td><td>10.01 ± 0.01 pH @25°C</td><td>±0.05 pH</td></tr>
  <tr><td>1.41 mS/cm ✔</td><td>1413±5 uS/cm @25°C</td><td>±2.0% F.S</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 991301',
  'HI 991301 — pH / Conductividad',
  'Multiparámetro',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.03 pH (-3.1mV) ✔</td><td>7.01 pH @25°C (0mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>4.03 pH (166.5mV) ✔</td><td>4.01 pH @25°C (177.48 mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>10.04 pH (-170.9mV) ✔</td><td>10.01 pH @25°C (-177.48 mV)</td><td>±0.05 pH (±25mV)</td></tr>
  <tr><td>12.90 mS/cm ✔</td><td>12880 ±50 uS/cm @25°C</td><td>±2.0% F.S</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'Temperatura',
  'Temperatura — verificación genérica con sonda',
  'Temperatura',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Equ. Patrón</th><th>Tolerancia</th></tr>
  <tr><td>7.3 °C ✔</td><td>0.0 °C</td><td>±0.7 °C + 1.5 error sonda</td></tr>
  <tr><td>19.2 °C ✔</td><td>19.2 °C</td><td>±0.7 °C + 1.5 error sonda</td></tr>
  <tr><td>104.5 °C ✔</td><td>50.2 °C</td><td>±0.7 °C + 1.5 error sonda</td></tr>
  <tr><td>150.0 °C ✔</td><td>150.0 °C</td><td>±0.7 °C + 1.5 error sonda</td></tr>
</table>$html$,
  ARRAY['LCD','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Manual de Instrucciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 96710',
  'HI 96710 — pH / Cloro Libre / Total',
  'Cloro Libre',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>6.9 pH ✔</td><td>7.0 pH @25°C</td><td>±0.2 pH</td></tr>
  <tr><td>1.01 mg/L ✔</td><td>1.00 ± 0.03mg/L CL2 F @25°C</td><td>±0.03 mg/L ±3% de lectura</td></tr>
  <tr><td>1.00 mg/L ✔</td><td>1.00 ± 0.03mg/L CL2 T @25°C</td><td>±0.03 mg/L ±3% de lectura</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 96735',
  'HI 96735 — Cloruros',
  'Cloruros',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>150 mg/L ✔</td><td>150 mg/L @25°C</td><td>±5 mg/L +10 de lectura</td></tr>
  <tr><td>350 mg/L ✔</td><td>350 mg/L @25°C</td><td>±7 mg/L +15 de lectura</td></tr>
  <tr><td>525 mg/L ✔</td><td>520 mg/L @25°C</td><td>±10 mg/L +20 del estándar</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 96734',
  'HI 96734 — Cloro Libre / Total',
  'Cloro Libre',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>4.00 mg/L ✔</td><td>4.00 mg/L CL2 F @25°C</td><td>±3% de la lectura</td></tr>
  <tr><td>4.00 mg/L ✔</td><td>4.00 mg/L CL2 L @25°C</td><td>±3% de la lectura</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 93703',
  'HI 93703 — Turbidez (FTU)',
  'Turbidez',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0.0 FTU ✔</td><td>0.0 FTU @25°C &lt; 0.1</td><td>±5% F.S. (0 a 10 FTU)</td></tr>
  <tr><td>10.16 FTU ✔</td><td>10.00 FTU @25°C ± 0.20</td><td>±10% F.S. (10 a 50 FTU)</td></tr>
  <tr><td>501 FTU ✔</td><td>500 FTU @25°C ± 10</td><td>±5% F.S. (50 a 1000 FTU)</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 93414-01',
  'HI 93414-01 — Turbidez (NTU) / Cloro',
  'Turbidez',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0.15 NTU ✔</td><td>0.10 NTU @25°C</td><td>±2% o 0.02 NTU, lo que sea mayor</td></tr>
  <tr><td>15.3 NTU ✔</td><td>15.0 NTU @25°C</td><td>±2% o 0.02 NTU, lo que sea mayor</td></tr>
  <tr><td>101 NTU ✔</td><td>100 NTU @25°C</td><td>±2% o 0.02 NTU, lo que sea mayor</td></tr>
  <tr><td>748 NTU ✔</td><td>750 NTU @25°C</td><td>±2% o 0.02 NTU, lo que sea mayor</td></tr>
  <tr><td>1.01 mg/L ✔</td><td>1.00 ± 0.03mg/L CL2 F @25°C</td><td>±0.03 mg/L ±3% de lectura</td></tr>
  <tr><td>1.00 mg/L ✔</td><td>1.00 ± 0.03mg/L CL2 T @25°C</td><td>±0.03 mg/L ±3% de lectura</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 98703',
  'HI 98703 — Turbidez (NTU)',
  'Turbidez',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0.10 NTU ✔</td><td>0.10 NTU @25°C</td><td>±2% o 0.02 NTU, lo que sea mayor</td></tr>
  <tr><td>15.0 NTU ✔</td><td>15.0 NTU @25°C</td><td>±2% o 0.02 NTU, lo que sea mayor</td></tr>
  <tr><td>100 NTU ✔</td><td>100 NTU @25°C</td><td>±2% o 0.02 NTU, lo que sea mayor</td></tr>
  <tr><td>750 NTU ✔</td><td>750 NTU @25°C</td><td>±2% o 0.02 NTU, lo que sea mayor</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 88703-01',
  'HI 88703-01 — Turbidez (NTU)',
  'Turbidez',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0.11 NTU ✔</td><td>0.10 NTU @25°C</td><td>±2% ± 0.09 NTU</td></tr>
  <tr><td>15.1 NTU ✔</td><td>15.0 NTU @25°C</td><td>±2% ± 0.03 NTU</td></tr>
  <tr><td>100 NTU ✔</td><td>100 NTU @25°C</td><td>±2% ± 2 NTU</td></tr>
  <tr><td>749 NTU ✔</td><td>750 NTU @25°C</td><td>±2% ± 10 NTU</td></tr>
  <tr><td>1998 NTU ✔</td><td>2000 NTU @25°C</td><td>±5% ± 20 NTU</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'Oxígeno',
  'Verificación de Oxígeno Disuelto (%OD)',
  'Oxígeno Disuelto',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Equi. Simulador</th><th>Tolerancia</th></tr>
  <tr><td>0.0 % OD ✔</td><td>0% ± 0.1 OD @25°C</td><td>&lt;10 % OD</td></tr>
  <tr><td>100 % OD ✔</td><td>100% OD @25°C</td><td>90-120 % OD</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'Tarjeta Análoga',
  'Tarjeta análoga — verificación mV @ uA',
  'Tarjeta Análoga',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}} — Tarjeta Análoga</th><th>Equipo o soluciones de referencia</th><th>Tolerancia</th></tr>
  <tr><td>13.5 mV@1uA ✔</td><td>13.1+ mV @1uA</td><td>±2 mV</td></tr>
  <tr><td>28.4 mV@2uA ✔</td><td>28.1+ mV @2uA</td><td>±2 mV</td></tr>
  <tr><td>70.3 mV@5uA ✔</td><td>70.2+ mV @5uA</td><td>±2 mV</td></tr>
  <tr><td>146.1 mV@10uA ✔</td><td>145.2+ mV @10uA</td><td>±2 mV</td></tr>
  <tr><td>217.1 mV@15uA ✔</td><td>218.3+ mV @15uA</td><td>±2 mV</td></tr>
  <tr><td>288.0 mV@20uA ✔</td><td>287.1+ mV @20uA</td><td>±2 mV</td></tr>
  <tr><td>430.1 mV@30uA ✔</td><td>431.8+ mV @30uA</td><td>±2 mV</td></tr>
  <tr><td>568.3 mV@40uA ✔</td><td>568.9+ mV @40uA</td><td>±2 mV</td></tr>
</table>$html$,
  '{}', '{}', '{}'
),
(
  'HI 97101C',
  'HI 97101C — pH / Cloro / Cianuro / Hierro / Yodo / Bromo',
  'Multiparámetro',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.0 pH ✔</td><td>7.0 pH @25°C ± 0.1</td><td>±0.1 pH</td></tr>
  <tr><td>1.01 mg/L ✔</td><td>1.00 ± 0.03mg/L CL2 F @25°C</td><td>±0.03 mg/L ±3% de lectura</td></tr>
  <tr><td>1.00 mg/L ✔</td><td>1.00 ± 0.03mg/L CL2 T @25°C</td><td>±0.03 mg/L ±3% de lectura</td></tr>
  <tr><td>21 mg/L ✔</td><td>20 ± 1mg/L Cy @25°C</td><td>±1 mg/L ± 15% de lectura</td></tr>
  <tr><td>0.80 mg/L ✔</td><td>0.81 ± 0.07mg/L Iron LR @25°C</td><td>±0.01 mg/L ±8% o lectura</td></tr>
  <tr><td>2.6 mg/L ✔</td><td>2.6 ± 0.2mg/L Iode LR @25°C</td><td>±0.1 mg/L ± 5% de lectura</td></tr>
  <tr><td>2.00 mg/L ✔</td><td>2.01 ± 0.06mg/L Br @25°C</td><td>±0.08 mg/L ± 3% de lectura</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 86301',
  'HI 86301 — Conductividad (ppm)',
  'Conductividad',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0.0 ppm ✔</td><td>0.0 ppm @25°C</td><td>±2.0% F.S</td></tr>
  <tr><td>1385 ppm ✔</td><td>1382 ±5 ppm @25°C</td><td>±2.0% F.S</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 735',
  'HI 735 — verificación (ppm)',
  'Otros',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0 ppm ✔</td><td>0 ppm @25°C</td><td>±6 ppm ±6% de la lectura @25°C</td></tr>
  <tr><td>174 ppm ✔</td><td>175 ± 6ppm</td><td>±6 ppm ±6% de la lectura @25°C</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 98303',
  'HI 98303 — Conductividad (uS/cm)',
  'Conductividad',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0 uS/cm ✔</td><td>0 uS/cm @25°C</td><td>--</td></tr>
  <tr><td>1413 uS/cm ✔</td><td>1413±5 uS/cm @25°C</td><td>±2% F.S</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 98308',
  'HI 98308 — Conductividad (uS/cm)',
  'Conductividad',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>84 uS/cm ✔</td><td>84±1 uS/cm @25°C</td><td>±2% F.S</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI775 (ppb)',
  'HI775 — verificación en ppb',
  'Otros',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0 ppb ✔</td><td>0±0ppb @25°C</td><td>±20 ppb ± 5% de la lectura</td></tr>
  <tr><td>104 ppb ✔</td><td>100±10ppb @25°C</td><td>±20 ppb ± 5% de la lectura</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI775 (ppm)',
  'HI775 — verificación en ppm',
  'Otros',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0 ppm ✔</td><td>0±10ppm</td><td>±5ppm ±5% de lectura</td></tr>
  <tr><td>96 ppm ✔</td><td>104±10 ppm</td><td>±5ppm ±5% de lectura</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 8410',
  'HI 8410 — Oxígeno Disuelto (%OD) / Salida análoga',
  'Oxígeno Disuelto',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0.0 % OD ✔</td><td>0.0 % OD</td><td>±1.5 % F.S @25°C</td></tr>
  <tr><td>103 % OD ✔</td><td>100.00 % OD</td><td>±1.5 % F.S @25°C</td></tr>
  <tr><td>402 % OD ✔</td><td>400.00 % OD</td><td>±1.5 % F.S @25°C</td></tr>
  <tr><td>595 % OD ✔</td><td>598.00 % OD</td><td>±1.5 % F.S @25°C</td></tr>
  <tr><th>mA</th><th>Valores teóricos</th><th>Tolerancia</th></tr>
  <tr><td>0.99 V ✔</td><td>4 mA @ 1 V (250Ω)</td><td>No aplica</td></tr>
  <tr><td>1.72 V ✔</td><td>7 mA - 1.75 V (250Ω)</td><td>No aplica</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 9565',
  'HI 9565 — Humedad Relativa / Temperatura',
  'Humedad',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>65 % HR ✔</td><td>65 % HR</td><td>±3% HR (50 a 85% HR); ±5% HR (&gt; 85% HR)</td></tr>
  <tr><td>52 % HR ✔</td><td>52 % HR</td><td>±3% HR (50 a 85% HR); ±5% HR (&gt; 85% HR)</td></tr>
  <tr><td>18.2 °C ✔</td><td>18.2 °C</td><td>±0.7 °C</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 772',
  'HI 772 — verificación (ppm)',
  'Otros',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0.00 ppm ✔</td><td>0.00 ppm @25°C</td><td>±3 ppm ± 5% de lectura</td></tr>
  <tr><td>200 ppm ✔</td><td>200 ±10 ppm @25°C</td><td>±3 ppm ± 5% de lectura</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  '97727',
  '97727 — Color (PCU)',
  'Color',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Solución</th><th>Tolerancia Instrumento</th></tr>
  <tr><td>0.0 PCU ✔</td><td>0.0 PCU @25°C</td><td>±10 PCU ±5% de lectura</td></tr>
  <tr><td>155 PCU ✔</td><td>254 ±10 PCU @25°C</td><td>±10 PCU ±5% de lectura</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 93102',
  'HI 93102 — verificación (mg/L)',
  'Otros',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Solución</th><th>Tolerancia Instrumento</th></tr>
  <tr><td>1.00 mg/L ✔</td><td>1.00 mg/L ±0.06</td><td>±0.05 mg/L</td></tr>
  <tr><td>0.50 mg/L ✔</td><td>0.50 mg/L ±0.05</td><td>±0.05 mg/L</td></tr>
  <tr><td>0.24 mg/L ✔</td><td>0.24 mg/L ±0.04</td><td>±0.05 mg/L</td></tr>
  <tr><td>0.01 mg/L ✔</td><td>0.01 mg/L ±0.02</td><td>±0.05 mg/L</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 97500',
  'HI 97500 — Luxómetro (klux)',
  'Luxómetro',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Solución</th><th>Tolerancia Instrumento</th></tr>
  <tr><td>6.7 klux ✔</td><td>6718 Lux ±6%</td><td>±6% de lectura ±2 dígitos</td></tr>
  <tr><td>2.050 klux ✔</td><td>2020 Lux ±6%</td><td>±6% de lectura ±2 dígitos</td></tr>
  <tr><td>0.685 klux ✔</td><td>685 Lux ±6%</td><td>±6% de lectura ±2 dígitos</td></tr>
  <tr><td>0.520 klux ✔</td><td>540 Lux ±6%</td><td>±6% de lectura ±2 dígitos</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'ISE 9829',
  'ISE 9829 — verificación (ppm)',
  'Otros',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>10 ppm ✔</td><td>10.00 ppm @25°C</td><td>±5% de lectura o 2 ppm</td></tr>
  <tr><td>100 ppm ✔</td><td>100 ±0.05 ppm @25°C</td><td>±5% de lectura o 2 ppm</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'TP 8427 (mV)',
  'TP 8427 — verificación de mV',
  'pH/ORP',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}} — mV</th><th>Equi. referencia</th><th>Tolerancia</th></tr>
  <tr><td>0.0 mV ✔</td><td>0.0 mV</td><td>±5 mV</td></tr>
  <tr><td>177.4 mV ✔</td><td>177.5 mV</td><td>±5 mV</td></tr>
  <tr><td>349.9 mV ✔</td><td>350 mV</td><td>±5 mV</td></tr>
  <tr><td>380.1 mV ✔</td><td>380 mV</td><td>±5 mV</td></tr>
  <tr><td>500.1 mV ✔</td><td>500 mV</td><td>±5 mV</td></tr>
  <tr><td>599.9 mV ✔</td><td>600 mV</td><td>±5 mV</td></tr>
  <tr><td>1000 mV ✔</td><td>1000 mV</td><td>±5 mV</td></tr>
  <tr><td>1077.2 mV ✔</td><td>1077.1 mV</td><td>±5 mV</td></tr>
  <tr><td>1499.8 mV ✔</td><td>1500 mV</td><td>±5 mV</td></tr>
  <tr><td>1800 mV ✔</td><td>1800 mV</td><td>±5 mV</td></tr>
  <tr><td>1900 mV ✔</td><td>1900 mV</td><td>±5 mV</td></tr>
  <tr><td>1999.8 mV ✔</td><td>2000 mV</td><td>±5 mV</td></tr>
  <tr><td>2050.2 mV ✔</td><td>2050 mV</td><td>±5 mV</td></tr>
  <tr><td>-177.5 mV ✔</td><td>-177.5 mV</td><td>±5 mV</td></tr>
  <tr><td>-349.9 mV ✔</td><td>-350 mV</td><td>±5 mV</td></tr>
  <tr><td>-380.1 mV ✔</td><td>-380 mV</td><td>±5 mV</td></tr>
  <tr><td>-500.1 mV ✔</td><td>-500 mV</td><td>±5 mV</td></tr>
  <tr><td>-599.9 mV ✔</td><td>-600 mV</td><td>±5 mV</td></tr>
  <tr><td>-999.9 mV ✔</td><td>-1000 mV</td><td>±5 mV</td></tr>
  <tr><td>-1077.1 mV ✔</td><td>-1077.1 mV</td><td>±5 mV</td></tr>
  <tr><td>-1499.9 mV ✔</td><td>-1500 mV</td><td>±5 mV</td></tr>
  <tr><td>-1800.1 mV ✔</td><td>-1800 mV</td><td>±5 mV</td></tr>
  <tr><td>-1900 mV ✔</td><td>-1900 mV</td><td>±5 mV</td></tr>
  <tr><td>-1999.9 mV ✔</td><td>-2000 mV</td><td>±5 mV</td></tr>
  <tr><td>-2050.1 mV ✔</td><td>-2050 mV</td><td>±5 mV</td></tr>
</table>$html$,
  '{}', '{}', '{}'
),
(
  'Simulador OD',
  'Simulador de Oxígeno Disuelto (%OD)',
  'Oxígeno Disuelto',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Equi. Simulador</th><th>Tolerancia</th></tr>
  <tr><td>0.0 % OD ✔</td><td>0.0 % OD</td><td>±1.5 % F.S @25°C</td></tr>
  <tr><td>14.5 % OD ✔</td><td>5.0 % OD</td><td>±1.5 % F.S @25°C</td></tr>
  <tr><td>196.5 % OD ✔</td><td>50.0 % OD</td><td>±1.5 % F.S @25°C</td></tr>
  <tr><td>300.0 % OD ✔</td><td>100.00 % OD</td><td>±1.5 % F.S @25°C</td></tr>
  <tr><td>300.0 % OD ✔</td><td>200.00 % OD</td><td>±1.5 % F.S @25°C</td></tr>
  <tr><td>300.0 % OD ✔</td><td>300.00 % OD</td><td>±1.5 % F.S @25°C</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 5522-01',
  'HI 5522-01 — Conductividad / mV (llaves simuladoras)',
  'Conductividad',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Llaves Simuladoras</th><th>Tolerancia</th></tr>
  <tr><td>1.000 uS/cm ✔</td><td>1.000 uS/cm</td><td>±1% de lectura (±0.01 µS/cm)</td></tr>
  <tr><td>10.00 uS/cm ✔</td><td>10.00 uS/cm</td><td>±1% de lectura (±0.01 µS/cm)</td></tr>
  <tr><td>100.0 uS/cm ✔</td><td>100.0 uS/cm</td><td>±1% de lectura (±0.01 µS/cm)</td></tr>
  <tr><td>1.000 mS/cm ✔</td><td>1.000 mS/cm</td><td>±1% de lectura (±0.01 µS/cm)</td></tr>
  <tr><td>100.0 mS/cm ✔</td><td>100.0 mS/cm</td><td>±1% de lectura (±0.01 µS/cm)</td></tr>
  <tr><td>-0.5 mV ✔</td><td>0mV</td><td>±25mV ± 1LSD</td></tr>
  <tr><td>177.5mV ✔</td><td>177.5 mV</td><td>±25mV ± 1LSD</td></tr>
  <tr><td>-176.9mV ✔</td><td>-177.5 mV</td><td>±25mV ± 1LSD</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'TP 8427 (°C)',
  'TP 8427 — verificación de temperatura',
  'Temperatura',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}} — Temperatura</th><th>Equi. referencia</th><th>Tolerancia</th></tr>
  <tr><td>25.0 °C ✔</td><td>25.0 °C</td><td>±0.5 °C</td></tr>
  <tr><td>0.0 °C ✔</td><td>0.0 °C</td><td>±0.5 °C</td></tr>
  <tr><td>50.1 °C ✔</td><td>50.0 °C</td><td>±0.5 °C</td></tr>
  <tr><td>100.0 °C ✔</td><td>100.0 °C</td><td>±0.5 °C</td></tr>
</table>$html$,
  '{}', '{}', '{}'
),
(
  'HI 9829',
  'HI 9829 — pH / OD / Conductividad / Turbidez / Temperatura',
  'Multiparámetro',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.03 pH (-3.1mV) ✔</td><td>7.01 pH @25°C (0mV)</td><td>±0.05pH(±25mV)</td></tr>
  <tr><td>4.03 pH (166.5mV) ✔</td><td>4.01 pH @25°C (177.48 mV)</td><td>±0.05pH(±25mV)</td></tr>
  <tr><td>10.04 pH (-170.9mV) ✔</td><td>10.01 pH @25°C(-177.48 mV)</td><td>±0.05pH(±25mV)</td></tr>
  <tr><td>421.2 mV ✔</td><td>470 mV @25°C</td><td>±50 mV</td></tr>
  <tr><td>0.0 % OD ✔</td><td>0% ± 0.1 OD @25°C</td><td>&lt;10 % OD</td></tr>
  <tr><td>100 % OD ✔</td><td>100% OD @25°C</td><td>90-120 % OD</td></tr>
  <tr><td>84 uS/cm ✔</td><td>84±1 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>1417 uS/cm ✔</td><td>1413±5 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>12.93 mS/cm ✔</td><td>12880 ±50 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>560.9 mmHg ✔</td><td>561.3 mmHg</td><td>±3 mmHg Aproximadamente</td></tr>
  <tr><td>0.0 NTU ✔</td><td>0.0 NTU @25°C</td><td>±0.3 FNU o ±2 % de la lectura</td></tr>
  <tr><td>20.2 NTU ✔</td><td>20 NTU @25°C</td><td>±0.3 FNU o ±2 % de la lectura</td></tr>
  <tr><td>18.4 °C ✔</td><td>18.2 °C</td><td>±0.7 °C</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'Edge',
  'Edge — pH / OD / Conductividad / Temperatura',
  'Multiparámetro',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>7.03 pH (-3.1mV) ✔</td><td>7.01 pH @25°C (0mV)</td><td>±0.05pH(±25mV)</td></tr>
  <tr><td>4.03 pH (166.5mV) ✔</td><td>4.01 pH @25°C (177.48 mV)</td><td>±0.05pH(±25mV)</td></tr>
  <tr><td>10.04 pH (-170.9mV) ✔</td><td>10.01 pH @25°C(-177.48 mV)</td><td>±0.05pH(±25mV)</td></tr>
  <tr><td>421.2 mV ✔</td><td>470 mV @25°C</td><td>±50 mV</td></tr>
  <tr><td>0.1 % OD ✔</td><td>0.0 % OD @25°C</td><td>±5.5 % de la lectura</td></tr>
  <tr><td>100.1 % OD ✔</td><td>100.00 % OD @25°C</td><td>±5.5 % de la lectura</td></tr>
  <tr><td>84 uS/cm ✔</td><td>84±1 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>1417 uS/cm ✔</td><td>1413±5 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>12.93 mS/cm ✔</td><td>12880 ±50 uS/cm @25°C</td><td>±5.5% de la lectura</td></tr>
  <tr><td>560.9 mmHg ✔</td><td>561.3 mmHg</td><td>±3 mmHg Aproximadamente</td></tr>
  <tr><td>18.4 °C ✔</td><td>18.2 °C</td><td>±0.7 °C</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 727',
  'HI 727 — Color (PCU)',
  'Color',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0.0 PCU ✔</td><td>0.0 PCU @25°C</td><td>±10 PCU ±5% de lectura</td></tr>
  <tr><td>155 PCU ✔</td><td>150 ±15 PCU @25°C</td><td>±10 PCU ±5% de lectura</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 701',
  'HI 701 — Cloro Libre (ppm)',
  'Cloro Libre',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0.00 ppm ✔</td><td>0.00 ppm @25°C</td><td>±0.03 ppm ±3% de lectura</td></tr>
  <tr><td>0.96 ppm ✔</td><td>1.00 ±0.05 ppm @25°C</td><td>±0.03 ppm ±3% de lectura</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 96800',
  'HI 96800 — Refractometría (% Brix)',
  'Refractometría',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Solución</th><th>Tolerancia Instrumento</th></tr>
  <tr><td>0.0 % Brix @18.2°C ✔</td><td>0.0 ±0.2 % Brix @ 20°C</td><td>±0.2 % Brix</td></tr>
  <tr><td>50.1 % Brix @18.2°C ✔</td><td>50.0 ±0.2% Brix @ 20°C</td><td>±0.2 % Brix</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 801',
  'HI 801 — Espectrofotometría (longitud de onda)',
  'Espectrofotometría',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Estándar</th><th>Tolerancia</th></tr>
  <tr><td>361.1nm ✔</td><td>359.6 a 362.6 abs</td><td>±1.5 nm</td></tr>
  <tr><td>446.2nm ✔</td><td>444.7 a 447.7 abs</td><td>±1.5 nm</td></tr>
  <tr><td>536.5nm ✔</td><td>535.0 a 538.0 abs</td><td>±1.5 nm</td></tr>
  <tr><td>637.5nm ✔</td><td>636.0 a 639.0 abs</td><td>±1.5 nm</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 833XX',
  'HI 833XX — Espectrofotometría (absorbancia)',
  'Espectrofotometría',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Estándar</th><th>Tolerancia</th></tr>
  <tr><td>1.01 abs ✔</td><td>@420nm 1.00 abs</td><td>±0.02 @25°C + 0.003 abs</td></tr>
  <tr><td>1.01 abs ✔</td><td>@466nm 1.00 abs</td><td>±0.02 @25°C + 0.003 abs</td></tr>
  <tr><td>1.00 abs ✔</td><td>@525nm 1.00 abs</td><td>±0.02 @25°C + 0.003 abs</td></tr>
  <tr><td>1.02 abs ✔</td><td>@575nm 1.00 abs</td><td>±0.02 @25°C + 0.003 abs</td></tr>
  <tr><td>1.01 abs ✔</td><td>@610nm 1.00 abs</td><td>±0.02 @25°C + 0.003 abs</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'HI 783',
  'HI 783 — verificación (ppm)',
  'Otros',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Sol. Estándar</th><th>Tolerancia</th></tr>
  <tr><td>0.00 ppm ✔</td><td>0.00 ppm @25°C</td><td>±5 % de la lectura a 25°C (77°F)</td></tr>
  <tr><td>1370 ppm ✔</td><td>1400 ±70 ppm @25°C</td><td>±5 % de la lectura a 25°C (77°F)</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
),
(
  'BL 20-1',
  'BL 20-1 — verificación (%)',
  'Otros',
  $html$<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Referencia</th><th>Tolerancia</th></tr>
  <tr><td>20% ✔</td><td>20% @21°C</td><td>No aplica</td></tr>
  <tr><td>50% ✔</td><td>50% @21°C</td><td>No aplica</td></tr>
  <tr><td>100% ✔</td><td>100% @21°C</td><td>No aplica</td></tr>
</table>$html$,
  ARRAY['LCD','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento']
)
ON CONFLICT (codigo) DO NOTHING;
