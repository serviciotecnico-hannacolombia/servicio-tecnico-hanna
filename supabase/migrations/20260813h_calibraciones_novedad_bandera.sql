-- ============================================================
-- Calibraciones: "novedad" deja de ser un estado y pasa a ser una bandera
-- independiente (novedad_detalle no nulo = activa) que convive con
-- cualquier estado real de la orden, sin reemplazarlo ni tocar fechas ni
-- semáforo. Nunca hubo en la app un botón que pusiera estado = 'novedad'
-- (quedó a medio construir), así que no hace falta migrar filas existentes
-- — solo cerrar la puerta en el CHECK para que no vuelva a usarse.
-- ============================================================

ALTER TABLE ordenes_calibracion DROP CONSTRAINT ordenes_calibracion_estado_check;

ALTER TABLE ordenes_calibracion ADD CONSTRAINT ordenes_calibracion_estado_check CHECK (estado IN (
  'oc_creada','para_enviar','en_mantenimiento_reparacion',
  'en_programacion_visita','visita_programada','enviado',
  'en_calibracion','en_retorno',
  'control_calidad','carga_al_sistema','envio_certificados','terminado'
));
