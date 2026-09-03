-- ============================================================
-- void_registros/bodega_st_registros (y sus _auditoria) quedaron con
-- políticas "USING (true)" desde su migración original — anterior al
-- patrón de gating por módulo que 20260718_rls_module_gating.sql aplicó
-- al resto de la app. Esto las alinea: cualquier autenticado ya no puede
-- leer/escribir estas tablas solo por estar logueado, hace falta tener
-- el módulo 'void'/'bodega_st' asignado (ver role_modules,
-- 20260901c_void_bodega_st_permisos.sql).
-- ============================================================

DROP POLICY IF EXISTS "auth all void registros" ON void_registros;
CREATE POLICY "void_registros select" ON void_registros
  FOR SELECT TO authenticated USING (has_module('void'));
CREATE POLICY "void_registros write" ON void_registros
  FOR ALL TO authenticated
  USING (has_module('void')) WITH CHECK (has_module('void'));

DROP POLICY IF EXISTS "auth read void auditoria" ON void_registros_auditoria;
CREATE POLICY "void_registros_auditoria select" ON void_registros_auditoria
  FOR SELECT TO authenticated USING (has_module('void'));
-- sin política de escritura: el trigger registrar_auditoria_void() es
-- SECURITY DEFINER, no pasa por RLS — nadie inserta aquí directo.

DROP POLICY IF EXISTS "auth all bodega st registros" ON bodega_st_registros;
CREATE POLICY "bodega_st_registros select" ON bodega_st_registros
  FOR SELECT TO authenticated USING (has_module('bodega_st'));
CREATE POLICY "bodega_st_registros write" ON bodega_st_registros
  FOR ALL TO authenticated
  USING (has_module('bodega_st')) WITH CHECK (has_module('bodega_st'));

DROP POLICY IF EXISTS "auth read bodega st auditoria" ON bodega_st_registros_auditoria;
CREATE POLICY "bodega_st_registros_auditoria select" ON bodega_st_registros_auditoria
  FOR SELECT TO authenticated USING (has_module('bodega_st'));
