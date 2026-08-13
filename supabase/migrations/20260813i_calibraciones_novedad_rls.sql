-- ============================================================
-- Calibraciones: la política de INSERT manual sobre el historial solo
-- permitía campo = 'servicios' (el resumen de cambios de RV CALIBR) — todo
-- lo demás lo escribe el trigger SECURITY DEFINER, que no pasa por RLS. Los
-- avances y resoluciones de novedad SÍ se insertan desde el cliente
-- (agregarAvanceNovedad/resolverNovedad en useCalibraciones.ts), así que
-- quedaban bloqueados por esta política — de ahí el error al agregar un
-- avance.
-- ============================================================

DROP POLICY IF EXISTS "ordenes_calibracion_historial insert manual" ON ordenes_calibracion_historial;

CREATE POLICY "ordenes_calibracion_historial insert manual"
  ON ordenes_calibracion_historial FOR INSERT TO authenticated
  WITH CHECK (
    has_module('calibraciones') AND has_capability('calibraciones_editar')
    AND campo IN ('servicios', 'novedad_avance', 'novedad_resuelta')
  );
