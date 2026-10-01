-- Certificados de Calidad: qué archivos adjuntos (de certificados_calidad_archivos)
-- eligió el técnico para este certificado, para poder recuperarlos al copiar
-- hacia la intranet.

ALTER TABLE certificados_calidad_generados ADD COLUMN IF NOT EXISTS adjuntos jsonb NOT NULL DEFAULT '[]';
