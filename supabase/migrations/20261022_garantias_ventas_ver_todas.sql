-- ============================================================
-- Ventas pasa a ver todas las garantías (no solo las propias por
-- asesor_correo). Sigue sin poder editarlas. La página de Garantías
-- muestra primero las del asesor logueado y luego las demás.
-- Se puede revertir quitando la capability al rol desde el Admin.
-- ============================================================

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'garantias_ver_todas' FROM roles r
WHERE r.name = 'Ventas'
ON CONFLICT DO NOTHING;
