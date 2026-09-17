-- ============================================================
-- Seed inicial de certificados_calidad_plantillas / _soluciones_patron a
-- partir de los certificados reales compartidos por el usuario. Los
-- arrays de checklist (test_funcional_items / embalaje_items /
-- control_estetico_items) son un punto de partida razonable según la
-- categoría del equipo — quedan editables desde la UI de administración.
-- ============================================================

INSERT INTO certificados_calidad_plantillas
  (codigo, nombre, categoria, mediciones_html, test_funcional_items, embalaje_items, control_estetico_items, notas_generales)
VALUES
(
  'PCA 320-1',
  'Colorímetro Multiparámetro PCA 320-1',
  'Cloro Libre / pH',
  $html$<table border="1" align="center">
<tbody>
<tr>
<td style="width: 176.4px; text-align: center;"><strong>{{CODIGO}}</strong></td>
<td style="width: 176.4px; text-align: center;"><strong>Equ. o&nbsp;</strong><strong>sol. de referencia</strong></td>
<td style="width: 176.4px; text-align: center;"><strong>Estado</strong></td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;">&nbsp;NC: OK&nbsp;✔ NO: OK&nbsp;✔</td>
<td style="width: 176.4px; text-align: center;">&nbsp;Alarma - Reles</td>
<td style="width: 176.4px; text-align: center;">&nbsp;Conforme ✔</td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;">&nbsp;NO</td>
<td style="width: 176.4px; text-align: center;">&nbsp;Dosificaci&oacute;n de cloro - Rel&eacute;</td>
<td style="width: 176.4px; text-align: center;">&nbsp;Conforme ✔</td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;">&nbsp;NC</td>
<td style="width: 176.4px; text-align: center;">&nbsp;Error de sistema - Rel&eacute;</td>
<td style="width: 176.4px; text-align: center;">&nbsp;Conforme&nbsp;✔</td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;"><strong>&nbsp;Verificaci&oacute;n de celda</strong></td>
<td style="width: 176.4px; text-align: center;"><strong>Funci&oacute;n del instrumento&nbsp;</strong></td>
<td style="width: 176.4px; text-align: center;"><strong>Estado&nbsp;</strong></td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;">
<p>&nbsp;Encendido: OK&nbsp;✔ Apagado: OK ✔</p>
</td>
<td style="width: 176.4px; text-align: center;">&nbsp;Luz<br />Led Interna</td>
<td style="width: 176.4px; text-align: center;">Conforme&nbsp;✔&nbsp;</td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;">&nbsp;-9436</td>
<td style="width: 176.4px; text-align: center;">Verificaci&oacute;n blanco: M&aacute;ximo -20000&nbsp;</td>
<td style="width: 176.4px; text-align: center;">&nbsp;Conforme&nbsp;✔</td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;">&nbsp;+10852</td>
<td style="width: 176.4px; text-align: center;">Verificaci&oacute;n oscuro: M&aacute;ximo +20000&nbsp;</td>
<td style="width: 176.4px; text-align: center;">&nbsp;Conforme&nbsp;✔</td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;"><strong>&nbsp;Verificaci&oacute;n de Celda Cloro Libre</strong></td>
<td style="width: 176.4px; text-align: center;"><strong>&nbsp;Valor esperado</strong></td>
<td style="width: 176.4px; text-align: center;"><strong>Estado</strong></td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;">&nbsp;0.80 mg/L</td>
<td style="width: 176.4px; text-align: center;">&nbsp;0.80 mg/L @25&deg;C</td>
<td style="width: 176.4px; text-align: center;">&nbsp;Estable&nbsp;✔</td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;"><strong>Verificaci&oacute;n de pH</strong></td>
<td style="width: 176.4px; text-align: center;"><strong>Equ. o&nbsp;</strong><strong>sol. de referencia</strong></td>
<td style="width: 176.4px; text-align: center;"><strong>Tolerancia</strong></td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;">7.01 pH ✔</td>
<td style="width: 176.4px; text-align: center;">7.01 &plusmn; 0.1 pH @25&deg;C&nbsp;</td>
<td style="width: 176.4px; text-align: center;">&plusmn;0.5 pH</td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;">4.02 pH ✔</td>
<td style="width: 176.4px; text-align: center;">4.01 &plusmn; 0.1 pH @25&deg;C&nbsp;</td>
<td style="width: 176.4px; text-align: center;">&plusmn;0.5 pH</td>
</tr>
<tr>
<td style="width: 176.4px; text-align: center;">9.99 pH ✔</td>
<td style="width: 176.4px; text-align: center;">10.01 &plusmn; 0.1 pH @25&deg;C&nbsp;</td>
<td style="width: 176.4px; text-align: center;">&plusmn;0.5 pH</td>
</tr>
</tbody>
</table>$html$,
  ARRAY['LCD','Sonido','Hora/reloj','Teclado','Memoria','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Caja','Accesorios','Manual de Instrucciones','Soluciones'],
  ARRAY['Estética del instrumento'],
  NULL
),
(
  'HI 901C1-01',
  'Titulador HI 901C1-01',
  'Titulador',
  $html$<table border="1" align="center">
<tbody>
<tr>
<th style="text-align: center;">{{CODIGO}}</th>
<th style="text-align: center;">Sol. Est&aacute;ndar</th>
<th style="text-align: center;">Tolerancia</th>
</tr>
<tr>
<td style="text-align: center;"><span style="color: #000000;">7.03 pH(-9.1mV)</span><strong><span style="color: green;">✔</span></strong></td>
<td style="text-align: center;">7.01 &plusmn; 0.01 pH @25&deg;C</td>
<td style="text-align: center;">&plusmn;0.001 pH</td>
</tr>
<tr>
<td style="text-align: center;">4.03 pH(168.1mV) <strong><span style="color: green;">✔</span></strong></td>
<td style="text-align: center;">4.01 &plusmn; 0.01 pH @25&deg;C</td>
<td style="text-align: center;"><span style="color: #000000;">&plusmn;0.001 pH</span></td>
</tr>
<tr>
<td style="text-align: center;"><span style="color: green;"><span style="color: #000000;">10.04 pH(-171.9mV)</span></span><strong><span style="color: green;"><span style="color: #000000;"><strong>&nbsp;</strong></span>✔</span></strong></td>
<td style="text-align: center;">10.01 &plusmn; 0.01 pH @25&deg;C</td>
<td style="text-align: center;">&plusmn;0.001 pH</td>
</tr>
<tr>
<td style="text-align: center;"><strong>&nbsp;Tarjeta an&aacute;loga</strong></td>
<td style="text-align: center;"><strong>&nbsp;Equipo Simulador</strong></td>
<td style="text-align: center;"><strong>&nbsp;Tolerancia</strong></td>
</tr>
<tr>
<td style="text-align: center;">0.0 mV&nbsp;<span style="color: #008000;"><strong>✔</strong></span></td>
<td style="text-align: center;">0.0 mV</td>
<td style="text-align: center;">&plusmn;0.1 mV<br /></td>
</tr>
<tr>
<td style="text-align: center;">1800.0 mV&nbsp;<span style="color: #008000;"><strong>✔</strong></span></td>
<td style="text-align: center;">1800.0 mV</td>
<td style="text-align: center;">&plusmn;0.1 mV<br /></td>
</tr>
<tr>
<td style="text-align: center;">-1800.1 mV&nbsp;<span style="color: #008000;"><strong>✔</strong></span></td>
<td style="text-align: center;">-1800.0 mV</td>
<td style="text-align: center;">&plusmn;0.1 mV<br /></td>
</tr>
<tr>
<td style="text-align: center;">0.0 &deg;C&nbsp;<span style="color: #008000;"><strong>✔</strong></span></td>
<td style="text-align: center;">0.0 &deg;C</td>
<td style="text-align: center;">&plusmn;0.1&deg;C</td>
</tr>
<tr>
<td style="text-align: center;">25.0 &deg;C&nbsp;<span style="color: #008000;"><strong>✔</strong></span></td>
<td style="text-align: center;">25.0 &deg;C&nbsp;</td>
<td style="text-align: center;">&plusmn;0.1&deg;C</td>
</tr>
<tr>
<td style="text-align: center;">50.1 &deg;C&nbsp;<span style="color: #008000;"><strong>✔</strong></span></td>
<td style="text-align: center;">50.0 &deg;C&nbsp;</td>
<td style="text-align: center;">&plusmn;0.1&deg;C</td>
</tr>
</tbody>
</table>$html$,
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
  'HI 93701-01',
  'Reactivo Cloro Libre polvo (100 tests)',
  'Reactivos',
  NULL,
  '{}', '{}', '{}',
  $txt$Ref. Reactivo Cloro Libre polvo (100 tests).
Lote: [editar]
F. de Vencimiento: [editar]
Se realizó proceso de verificación del reactivo {{CODIGO}}. Se certifica que el reactivo, se encuentra en buen estado y es funcional dentro de las especificaciones técnicas señaladas en el manual de operaciones.
Todos los estándares y reactivos son preparados en fabrica Hanna Instruments a una temperatura controlada de 25°C usando agua desionizada para uso analítico ISO3696/BS397.
El material de referencia es periódicamente verificado acorde procedimientos estipulados por el fabricante.$txt$
),
(
  'HI 7077L',
  'Solución de limpieza de aceites',
  'Reactivos',
  NULL,
  '{}', '{}', '{}',
  $txt$Ref. Solución de limpieza de aceites
Lote: [editar]
F. de Vencimiento: [editar]
Se realizó proceso de verificación de la solución {{CODIGO}}. Se certifica que la solución, se encuentra en buen estado y es funcional dentro de las especificaciones técnicas señaladas en el manual de operaciones.
Todos los estándares y reactivos son preparados en fabrica Hanna Instruments a una temperatura controlada de 25°C usando agua desionizada para uso analítico ISO3696/BS397.
El material de referencia es periódicamente verificado acorde procedimientos estipulados por el fabricante.$txt$
),
(
  'HI 98501',
  'Termómetro HI 98501',
  'Temperatura',
  $html$<p>1) s/n [editar]</p>
<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Equ. Patrón</th><th>Tolerancia</th></tr>
  <tr><td>0.0 °C ✔</td><td>0.0 °C</td><td>±0.7 °C + 1.5 error sonda</td></tr>
  <tr><td>19.2 °C ✔</td><td>19.2 °C</td><td>±0.7 °C + 1.5 error sonda</td></tr>
  <tr><td>50.1 °C ✔</td><td>50.2 °C</td><td>±0.7 °C + 1.5 error sonda</td></tr>
  <tr><td>150.0 °C ✔</td><td>150.0 °C</td><td>±0.7 °C + 1.5 error sonda</td></tr>
</table>$html$,
  ARRAY['LCD','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  NULL
),
(
  'HI 148-1',
  'Termómetro HI 148-1',
  'Temperatura',
  $html$<p>1) s/n [editar]</p>
<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Equipo patrón</th><th>Tolerancia</th></tr>
  <tr><td>0.2 °C</td><td>0.0 °C</td><td>±0.5 °C + 1.5 error sonda</td></tr>
  <tr><td>18.0 °C</td><td>18.0 °C</td><td>±0.5 °C + 1.5 error sonda</td></tr>
  <tr><td>49.9 °C</td><td>50.0 °C</td><td>±0.5 °C + 1.5 error sonda</td></tr>
</table>$html$,
  ARRAY['LCD','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  NULL
),
(
  'HI 151',
  'Termómetro HI 151',
  'Temperatura',
  $html$<p>1) s/n [editar]</p>
<table border="1" align="center">
  <tr><th>{{CODIGO}}</th><th>Equ. Patrón</th><th>Tolerancia</th></tr>
  <tr><td>0.0 °C ✔</td><td>0.0 °C</td><td>±0.2 °C + 1.5 error sonda</td></tr>
  <tr><td>19.0 °C ✔</td><td>19.2 °C</td><td>±0.2 °C + 1.5 error sonda</td></tr>
  <tr><td>50.2 °C ✔</td><td>50.2 °C</td><td>±0.2 °C + 1.5 error sonda</td></tr>
  <tr><td>150.1 °C ✔</td><td>150.0 °C</td><td>±0.2 °C + 1.5 error sonda</td></tr>
</table>$html$,
  ARRAY['LCD','Medición','Batería','Calibración'],
  ARRAY['Instrumento','Sonda','Caja','Manual de Instrucciones'],
  ARRAY['Estética del instrumento'],
  NULL
)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO certificados_calidad_soluciones_patron (categoria, codigo, descripcion)
VALUES
  ('pH', NULL, '7.01 ± 0.01 pH @25°C (buffer estándar)'),
  ('pH', NULL, '4.01 ± 0.01 pH @25°C (buffer estándar)'),
  ('pH', NULL, '10.01 ± 0.01 pH @25°C (buffer estándar)'),
  ('Cloro Libre', NULL, '0.80 mg/L @25°C (patrón cloro libre)');
