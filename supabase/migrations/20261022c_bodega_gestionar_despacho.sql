-- ============================================================
-- Nueva capability "bodega_gestionar_despacho": permite Completar
-- despachos y marcar/resolver novedades en Bodega › Despacho. Sin ella
-- (Ventas) solo se puede solicitar y cancelar el despacho.
-- Se otorga a todos los roles que ya tienen el módulo Bodega, excepto
-- Ventas y Jefe de Ventas. Ajustable luego desde Admin → Roles.
-- ============================================================

INSERT INTO capabilities (key) VALUES ('bodega_gestionar_despacho')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'bodega_gestionar_despacho' FROM roles r
JOIN role_modules rm ON rm.role_id = r.id AND rm.module_key = 'bodega'
WHERE r.name NOT IN ('Ventas', 'Jefe de Ventas')
ON CONFLICT DO NOTHING;
