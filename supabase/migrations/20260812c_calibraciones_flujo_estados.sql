-- ============================================================
-- Calibraciones: rediseño del flujo de estados. El flujo real depende
-- de la modalidad — laboratorio externo (con envío/retorno) vs.
-- sede Hanna Dorado / in situ (con visita programada, sin envío) — y
-- ambos terminan en un único paso "Control de calidad" antes de
-- cerrar la orden. Se retiran 'recolectado_en_hanna' y
-- 'a_falta_certificado', que quedan cubiertos por 'control_calidad'.
-- ============================================================

-- El CHECK original no admite 'control_calidad' todavía, así que hay que
-- soltarlo antes de reasignar las filas existentes (si no, el UPDATE de
-- abajo lo viola). Se vuelve a crear ya con la lista final de estados.
ALTER TABLE ordenes_calibracion DROP CONSTRAINT ordenes_calibracion_estado_check;

UPDATE ordenes_calibracion SET estado = 'control_calidad'
  WHERE estado IN ('recolectado_en_hanna', 'a_falta_certificado');

ALTER TABLE ordenes_calibracion ADD CONSTRAINT ordenes_calibracion_estado_check CHECK (estado IN (
  'oc_creada','para_enviar','en_mantenimiento_reparacion',
  'en_programacion_visita','visita_programada','enviado',
  'en_calibracion','en_retorno','novedad',
  'control_calidad','terminado'
));
