-- ============================================================
-- Rendimiento de RLS en las tablas del módulo Códigos.
--
-- has_module / has_any_capability son SECURITY DEFINER: Postgres no las
-- puede "inlinear" y, llamadas directo en USING, se ejecutan UNA VEZ POR
-- FILA. En codigos_accesorios (~11k filas, paginado de a 1000 con OFFSET y
-- varias páginas en paralelo) eso hacía que las páginas altas superaran el
-- statement timeout → 500 en el cliente. Además, las políticas FOR ALL de
-- escritura también se evalúan en los SELECT.
--
-- Envolverlas en (SELECT ...) las convierte en un InitPlan: se evalúan una
-- sola vez por consulta (recomendación oficial de Supabase para RLS). Las
-- condiciones son las mismas; solo cambia cómo se evalúan.
-- ============================================================

-- codigos_inet
DROP POLICY IF EXISTS "codigos_inet select" ON codigos_inet;
CREATE POLICY "codigos_inet select" ON codigos_inet
  FOR SELECT TO authenticated USING ((SELECT has_module('codigos')));

DROP POLICY IF EXISTS "codigos_inet select mant_in_situ" ON codigos_inet;
CREATE POLICY "codigos_inet select mant_in_situ" ON codigos_inet
  FOR SELECT TO authenticated USING ((SELECT has_module('mant_in_situ')));

DROP POLICY IF EXISTS "codigos_inet write" ON codigos_inet;
CREATE POLICY "codigos_inet write" ON codigos_inet
  FOR ALL TO authenticated
  USING ((SELECT has_module('codigos')) AND (SELECT has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos'])))
  WITH CHECK ((SELECT has_module('codigos')) AND (SELECT has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos'])));

-- codigos_sp_price
DROP POLICY IF EXISTS "codigos_sp_price select" ON codigos_sp_price;
CREATE POLICY "codigos_sp_price select" ON codigos_sp_price
  FOR SELECT TO authenticated USING ((SELECT has_module('codigos')));

DROP POLICY IF EXISTS "codigos_sp_price write" ON codigos_sp_price;
CREATE POLICY "codigos_sp_price write" ON codigos_sp_price
  FOR ALL TO authenticated
  USING ((SELECT has_module('codigos')) AND (SELECT has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos'])))
  WITH CHECK ((SELECT has_module('codigos')) AND (SELECT has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos'])));

-- codigos_accesorios
DROP POLICY IF EXISTS "codigos_accesorios select" ON codigos_accesorios;
CREATE POLICY "codigos_accesorios select" ON codigos_accesorios
  FOR SELECT TO authenticated USING ((SELECT has_module('codigos')));

DROP POLICY IF EXISTS "codigos_accesorios write" ON codigos_accesorios;
CREATE POLICY "codigos_accesorios write" ON codigos_accesorios
  FOR ALL TO authenticated
  USING ((SELECT has_module('codigos')) AND (SELECT has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos'])))
  WITH CHECK ((SELECT has_module('codigos')) AND (SELECT has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos'])));

-- codigos_catalogo
DROP POLICY IF EXISTS "codigos_catalogo select" ON codigos_catalogo;
CREATE POLICY "codigos_catalogo select" ON codigos_catalogo
  FOR SELECT TO authenticated USING ((SELECT has_module('codigos')));

DROP POLICY IF EXISTS "codigos_catalogo write" ON codigos_catalogo;
CREATE POLICY "codigos_catalogo write" ON codigos_catalogo
  FOR ALL TO authenticated
  USING ((SELECT has_module('codigos')) AND (SELECT has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos'])))
  WITH CHECK ((SELECT has_module('codigos')) AND (SELECT has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos'])));
