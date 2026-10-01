-- Alta del módulo 'certificados_calidad' en el sistema de permisos por rol,
-- siguiendo el mismo patrón usado para 'void'/'bodega_st'
-- (20260901c_void_bodega_st_permisos.sql).

INSERT INTO modules (key) VALUES ('certificados_calidad')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'certificados_calidad' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin', 'Líderes', 'Logística')
ON CONFLICT DO NOTHING;
