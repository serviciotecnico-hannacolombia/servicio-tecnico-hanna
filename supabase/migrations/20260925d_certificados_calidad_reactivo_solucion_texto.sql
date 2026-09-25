-- Textos oficiales de certificación para Reactivos y Soluciones, cada uno
-- como su propia plantilla (antes una sola plantilla "Reactivo" cubría
-- ambos con un texto genérico). Las líneas Ref./Lote/F. de Vencimiento no
-- se incluyen: se arman solas desde los campos del bloque de Mediciones.

UPDATE certificados_calidad_plantillas
SET nombre = 'Verificación de reactivo',
    notas_generales = 'Se realizó proceso de verificación del reactivo [código]. Se certifica que el reactivo, se encuentra en buen estado y es funcional dentro de las especificaciones técnicas señaladas en el manual de operaciones.
Todos los estándares y reactivos son preparados en fabrica Hanna Instruments a una temperatura controlada de 25°C usando agua desionizada para uso analítico ISO3696/BS397.
El material de referencia es periódicamente verificado acorde procedimientos estipulados por el fabricante.',
    updated_at = now()
WHERE codigo = 'Reactivo';

INSERT INTO certificados_calidad_plantillas (codigo, nombre, categoria, filas, test_funcional_items, embalaje_items, control_estetico_items, notas_generales)
VALUES (
  'Solución',
  'Verificación de solución',
  'Soluciones',
  '[]'::jsonb,
  '{}', '{}', '{}',
  'Se realizó proceso de verificación de la solución [código]. Se certifica que la solución, se encuentra en buen estado y es funcional dentro de las especificaciones técnicas señaladas en el manual de operaciones.
Todos los estándares y reactivos son preparados en fabrica Hanna Instruments a una temperatura controlada de 25°C usando agua desionizada para uso analítico ISO3696/BS397.
El material de referencia es periódicamente verificado acorde procedimientos estipulados por el fabricante.'
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  categoria = EXCLUDED.categoria,
  notas_generales = EXCLUDED.notas_generales,
  updated_at = now();
