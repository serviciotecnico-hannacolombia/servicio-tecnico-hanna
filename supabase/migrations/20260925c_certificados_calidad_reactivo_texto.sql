-- La plantilla "Reactivo" traía "Ref. [nombre]" / "Lote: [editar]" /
-- "F. de Vencimiento: [editar]" escritos a mano dentro del texto narrativo.
-- Ahora esas 3 líneas se arman solas a partir de los campos Referencia/Lote/
-- Fecha de Vencimiento del bloque (ver utils/mediciones.ts), así que dejarlas
-- también en el texto duplicaría la información. Se deja solo el párrafo de
-- certificación.

UPDATE certificados_calidad_plantillas
SET notas_generales = 'Se realizó proceso de verificación del reactivo [código]. Se certifica que el reactivo se encuentra en buen estado y es funcional dentro de las especificaciones técnicas señaladas en el manual de operaciones.
Todos los estándares y reactivos son preparados en fábrica Hanna Instruments a una temperatura controlada de 25°C usando agua desionizada para uso analítico ISO3696/BS397.
El material de referencia es periódicamente verificado acorde procedimientos estipulados por el fabricante.',
    updated_at = now()
WHERE codigo = 'Reactivo';
