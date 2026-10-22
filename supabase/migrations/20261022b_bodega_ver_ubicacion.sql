-- ============================================================
-- Nueva capability "bodega_ver_ubicacion": controla si se ve la
-- ubicación física (columna Ubicación) en Bodega › Despacho.
-- Se otorga a todos los roles que ya tienen el módulo Bodega, excepto
-- Ventas y Jefe de Ventas. Ajustable luego desde Admin → Roles.
-- ============================================================

INSERT INTO capabilities (key) VALUES ('bodega_ver_ubicacion')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'bodega_ver_ubicacion' FROM roles r
JOIN role_modules rm ON rm.role_id = r.id AND rm.module_key = 'bodega'
WHERE r.name NOT IN ('Ventas', 'Jefe de Ventas')
ON CONFLICT DO NOTHING;
