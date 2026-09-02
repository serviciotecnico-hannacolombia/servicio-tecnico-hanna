-- ============================================================
-- Calibraciones: agrega el estado "Envío de certificados" — paso previo
-- a "Terminado" en ambos flujos (laboratorio e in situ / sede Hanna
-- Dorado), donde se registra la entrega del certificado (fecha, carta
-- de entrega, carta del certificado). Esas tres columnas ya existían;
-- solo se vuelven a usar en esta etapa en vez de en "Control de calidad".
-- ============================================================

ALTER TABLE ordenes_calibracion DROP CONSTRAINT ordenes_calibracion_estado_check;

ALTER TABLE ordenes_calibracion ADD CONSTRAINT ordenes_calibracion_estado_check CHECK (estado IN (
  'oc_creada','para_enviar','en_mantenimiento_reparacion',
  'en_programacion_visita','visita_programada','enviado',
  'en_calibracion','en_retorno','novedad',
  'control_calidad','envio_certificados','terminado'
));
