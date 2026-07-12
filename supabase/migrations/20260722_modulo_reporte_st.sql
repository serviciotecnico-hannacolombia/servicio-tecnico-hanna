-- ============================================================
-- Nuevo módulo: Reporte ST (tiempos y cumplimiento SLA de diagnóstico)
-- Acceso: Servicio Técnico, Admin y Líderes
-- ============================================================

INSERT INTO modules (key) VALUES ('reporte_st')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'reporte_st' FROM roles r WHERE r.name IN ('Servicio Técnico', 'Admin', 'Líderes')
ON CONFLICT DO NOTHING;
