-- Ejecutar después de 12-instalar-observaciones-st.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gestion_otst_vencidas_justificadas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 otst text NOT NULL CHECK (otst ~ '^[0-9]{1,20}$'),
 periodo date NOT NULL CHECK (extract(day FROM periodo)=1),
 observaciones text NOT NULL CHECK (length(trim(observaciones)) BETWEEN 1 AND 5000),
 created_at timestamptz NOT NULL DEFAULT now(),
 creado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id)
);
ALTER TABLE public.gestion_otst_vencidas_justificadas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gestion_otst_vencidas_justificadas FROM anon,authenticated;
GRANT SELECT,DELETE ON public.gestion_otst_vencidas_justificadas TO authenticated;
GRANT INSERT(id,otst,periodo,observaciones) ON public.gestion_otst_vencidas_justificadas TO authenticated;
DROP POLICY IF EXISTS observaciones_st_ver ON public.gestion_otst_vencidas_justificadas;
CREATE POLICY observaciones_st_ver ON public.gestion_otst_vencidas_justificadas FOR SELECT TO authenticated USING (public.intervenciones_permiso('observaciones_ver'));
DROP POLICY IF EXISTS observaciones_st_crear ON public.gestion_otst_vencidas_justificadas;
CREATE POLICY observaciones_st_crear ON public.gestion_otst_vencidas_justificadas FOR INSERT TO authenticated WITH CHECK (creado_por=auth.uid() AND public.intervenciones_permiso('observaciones_crear'));
DROP POLICY IF EXISTS observaciones_st_eliminar ON public.gestion_otst_vencidas_justificadas;
CREATE POLICY observaciones_st_eliminar ON public.gestion_otst_vencidas_justificadas FOR DELETE TO authenticated USING (public.intervenciones_permiso('administrar_observaciones_st'));
CREATE INDEX IF NOT EXISTS otst_vencidas_periodo ON public.gestion_otst_vencidas_justificadas(periodo,created_at DESC,id);
COMMIT;
