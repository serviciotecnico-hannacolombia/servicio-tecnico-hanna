-- ============================================================
-- Nueva capability "calibraciones_ver_todas": permite ver todas las
-- órdenes de Calibraciones (sin restringir a las propias por
-- correo_asesor), sin dar permiso de edición — a diferencia de
-- calibraciones_editar, que da ambas cosas. Pensada para roles de
-- solo-lectura ampliada como "Jefe de Ventas" (clon de Ventas, que
-- hoy solo ve lo suyo).
-- ============================================================

INSERT INTO capabilities (key) VALUES ('calibraciones_ver_todas')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "ordenes_calibracion select" ON ordenes_calibracion;
CREATE POLICY "ordenes_calibracion select" ON ordenes_calibracion FOR SELECT TO authenticated
  USING (has_module('calibraciones') AND (
    has_capability('calibraciones_editar')
    OR has_capability('calibraciones_ver_todas')
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.email = ordenes_calibracion.correo_asesor)
  ));

DROP POLICY IF EXISTS "ordenes_calibracion_parametros select" ON ordenes_calibracion_parametros;
CREATE POLICY "ordenes_calibracion_parametros select" ON ordenes_calibracion_parametros FOR SELECT TO authenticated
  USING (has_module('calibraciones') AND (
    has_capability('calibraciones_editar')
    OR has_capability('calibraciones_ver_todas')
    OR EXISTS (
      SELECT 1 FROM ordenes_calibracion oc
      JOIN profiles p ON p.id = auth.uid()
      WHERE oc.id = ordenes_calibracion_parametros.orden_id AND p.email = oc.correo_asesor
    )
  ));

DROP POLICY IF EXISTS "ordenes_calibracion_historial select" ON ordenes_calibracion_historial;
CREATE POLICY "ordenes_calibracion_historial select" ON ordenes_calibracion_historial FOR SELECT TO authenticated
  USING (has_module('calibraciones') AND (
    has_capability('calibraciones_editar')
    OR has_capability('calibraciones_ver_todas')
    OR EXISTS (
      SELECT 1 FROM ordenes_calibracion oc
      JOIN profiles p ON p.id = auth.uid()
      WHERE oc.id = ordenes_calibracion_historial.orden_id AND p.email = oc.correo_asesor
    )
  ));

-- Conveniencia: el rol "Jefe de Ventas" ya lo creó el usuario a mano desde
-- el Admin — se le otorga la capability nueva automáticamente si existe.
-- No-op inofensivo si el rol no existe, ya cambió de nombre, o ya se le
-- asignó a mano desde el Admin.
INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'calibraciones_ver_todas' FROM roles r
WHERE r.name = 'Jefe de Ventas'
ON CONFLICT DO NOTHING;
