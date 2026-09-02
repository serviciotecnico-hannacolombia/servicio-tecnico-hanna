-- Alta de los módulos 'void' y 'bodega_st' en el sistema de permisos por rol,
-- siguiendo el mismo patrón usado para 'calibraciones' (20260721_modulo_calibraciones.sql).

INSERT INTO modules (key) VALUES ('void'), ('bodega_st')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'void' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin', 'Líderes', 'Logística')
ON CONFLICT DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'bodega_st' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin', 'Líderes', 'Logística')
ON CONFLICT DO NOTHING;
