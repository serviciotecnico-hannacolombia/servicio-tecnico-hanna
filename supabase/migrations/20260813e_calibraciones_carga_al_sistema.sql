-- ============================================================
-- Calibraciones: agrega el estado "Carga al sistema" — paso previo a
-- "Envío de certificados" exclusivo del flujo de sitio (in situ / sede
-- Hanna Dorado), donde se registra el código de recepción, las fechas de
-- calibración y los códigos de certificados que ese flujo nunca capturaba.
-- No requiere columnas nuevas: reutiliza codigo_recepcion,
-- certificado_fecha_inicio, certificado_fecha_fin y codigos_certificados,
-- que ya existían para el flujo de laboratorio.
-- ============================================================

ALTER TABLE ordenes_calibracion DROP CONSTRAINT ordenes_calibracion_estado_check;

ALTER TABLE ordenes_calibracion ADD CONSTRAINT ordenes_calibracion_estado_check CHECK (estado IN (
  'oc_creada','para_enviar','en_mantenimiento_reparacion',
  'en_programacion_visita','visita_programada','enviado',
  'en_calibracion','en_retorno','novedad',
  'control_calidad','carga_al_sistema','envio_certificados','terminado'
));
