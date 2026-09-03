-- ============================================================
-- otst_bodega_pendientes tenía un único "FOR ALL USING (has_module('bodega'))"
-- que cubría insert/update/delete por igual — cualquiera con el módulo
-- 'bodega' (incluye el rol Ventas) podía eliminar solicitudes de despacho.
-- Se separa igual que ya hace otst_bodega: insertar/actualizar solo
-- requiere el módulo, eliminar requiere además bodega_eliminar.
-- ============================================================

DROP POLICY IF EXISTS "bodega_pendientes write" ON otst_bodega_pendientes;

CREATE POLICY "bodega_pendientes insert" ON otst_bodega_pendientes
  FOR INSERT TO authenticated WITH CHECK (has_module('bodega'));

CREATE POLICY "bodega_pendientes update" ON otst_bodega_pendientes
  FOR UPDATE TO authenticated
  USING (has_module('bodega')) WITH CHECK (has_module('bodega'));

CREATE POLICY "bodega_pendientes delete" ON otst_bodega_pendientes
  FOR DELETE TO authenticated
  USING (has_module('bodega') AND has_capability('bodega_eliminar'));
