-- ============================================================
-- Precios (codigos_sp_price) pasa a ser privado dentro del módulo
-- Códigos y Partes: hoy lo ve cualquier rol con el módulo 'codigos'
-- (incluye Ventas, Logística, Aplicaciones), pero solo debería verlo
-- Servicio Técnico, Líderes y Admin. Ningún capability existente mapea
-- exactamente a ese trío, así que se agrega uno nuevo — mismo patrón
-- que editar_codigos/gestion_codigos/importar_csv_codigos.
-- ============================================================

INSERT INTO capabilities (key) VALUES ('ver_precios_codigos')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'ver_precios_codigos' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Líderes', 'Admin')
ON CONFLICT DO NOTHING;
