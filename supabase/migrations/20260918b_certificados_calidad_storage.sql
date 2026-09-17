-- ============================================================
-- Bucket de Storage para el repositorio de archivos del módulo
-- "Certificados de Calidad" (ver 20260918_certificados_calidad_schema.sql,
-- tabla certificados_calidad_archivos). Privado: la descarga se hace con
-- createSignedUrl desde el frontend, no hay URL pública directa.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados-calidad', 'certificados-calidad', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "certificados_calidad storage select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'certificados-calidad' AND has_module('certificados_calidad'));

CREATE POLICY "certificados_calidad storage insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'certificados-calidad' AND has_module('certificados_calidad'));

CREATE POLICY "certificados_calidad storage delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'certificados-calidad' AND has_module('certificados_calidad'));
