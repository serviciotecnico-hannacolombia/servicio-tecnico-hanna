-- ============================================================
-- Elimina el módulo "Correos" (/correos — plantillas de OC y de
-- certificados), ya cubierto por el flujo de Calibraciones.
--
-- Las tablas correos_proveedores / correos_destinatarios se CONSERVAN:
-- Calibraciones las lee (proveedores y destinatarios del correo de OC) y
-- Admin las administra (pestaña "Correos OC"). Su lectura dependía de
-- has_module('correos') (20260718_rls_module_gating.sql), así que primero
-- se pasa a has_module('calibraciones') para no cortar el acceso.
-- ============================================================

DROP POLICY IF EXISTS "correos_proveedores select" ON correos_proveedores;
CREATE POLICY "correos_proveedores select" ON correos_proveedores
  FOR SELECT TO authenticated USING (has_module('calibraciones') OR has_module('admin'));

DROP POLICY IF EXISTS "correos_destinatarios select" ON correos_destinatarios;
CREATE POLICY "correos_destinatarios select" ON correos_destinatarios
  FOR SELECT TO authenticated USING (has_module('calibraciones') OR has_module('admin'));

-- Borra el módulo; role_modules cae en cascada (FK ON DELETE CASCADE).
-- Los favoritos con 'correos' en profiles.favoritos_modulos los ignora el
-- Sidebar (filtra claves inexistentes).
DELETE FROM modules WHERE key = 'correos';
