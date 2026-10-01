-- ============================================================
-- Equipos Sin Formato: quita la restricción de solo-lo-mío para Ventas —
-- ahora cualquiera con acceso al módulo ve todos los registros (igual que
-- otros módulos operativos), no solo los de su propio correo de asesor.
-- El orden "el asesor ve primero lo suyo" se resuelve en el cliente
-- (EquiposSinFormatoPage.tsx), no en RLS.
-- ============================================================

DROP POLICY IF EXISTS "esf select" ON equipos_sin_formato;
CREATE POLICY "esf select" ON equipos_sin_formato
  FOR SELECT TO authenticated USING (has_module('equipos_sin_formato'));

DROP POLICY IF EXISTS "esf_items select" ON equipos_sin_formato_items;
CREATE POLICY "esf_items select" ON equipos_sin_formato_items
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM equipos_sin_formato e WHERE e.id = equipo_sf_id AND has_module('equipos_sin_formato')
  ));

DROP POLICY IF EXISTS "esf_historial select" ON equipos_sin_formato_historial;
CREATE POLICY "esf_historial select" ON equipos_sin_formato_historial
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM equipos_sin_formato e WHERE e.id = equipo_sf_id AND has_module('equipos_sin_formato')
  ));
