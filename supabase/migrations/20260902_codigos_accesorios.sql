-- ============================================================
-- Módulo Códigos y Partes: catálogo de compatibilidad equipo↔accesorio
-- (nueva pestaña "Accesorios") + catálogo plano de familia/descripción,
-- ambos poblados desde el Excel oficial de Hanna Instruments
-- "Accessories_List_2026-08-02.xlsx" en la migración de seed siguiente.
-- ============================================================

CREATE TABLE codigos_accesorios (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_codigo    text NOT NULL,
  accesorio_codigo text NOT NULL,
  descripcion      text,
  descripcion_es   text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_codigos_accesorios_par ON codigos_accesorios (equipo_codigo, accesorio_codigo);
CREATE INDEX idx_codigos_accesorios_equipo    ON codigos_accesorios (equipo_codigo);
CREATE INDEX idx_codigos_accesorios_accesorio ON codigos_accesorios (accesorio_codigo);

-- Catálogo plano código→familia/descripción (hoja "List code" del Excel).
-- Cubre tanto códigos de equipo como de accesorio — sirve para mostrar
-- familia/descripción en la pestaña Accesorios sin depender de que el
-- código ya exista en codigos_inet.
CREATE TABLE codigos_catalogo (
  codigo      text PRIMARY KEY,
  familia     text,
  descripcion text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE codigos_accesorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_catalogo   ENABLE ROW LEVEL SECURITY;

-- Mismo patrón de RLS que codigos_inet/codigos_sp_price (ver
-- 20260718_rls_module_gating.sql) — reutiliza las mismas capacidades,
-- sin capacidades nuevas.
CREATE POLICY "codigos_accesorios select" ON codigos_accesorios
  FOR SELECT TO authenticated USING (has_module('codigos'));
CREATE POLICY "codigos_accesorios write" ON codigos_accesorios
  FOR ALL TO authenticated
  USING (has_module('codigos') AND has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos']))
  WITH CHECK (has_module('codigos') AND has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos']));

CREATE POLICY "codigos_catalogo select" ON codigos_catalogo
  FOR SELECT TO authenticated USING (has_module('codigos'));
CREATE POLICY "codigos_catalogo write" ON codigos_catalogo
  FOR ALL TO authenticated
  USING (has_module('codigos') AND has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos']))
  WITH CHECK (has_module('codigos') AND has_any_capability(ARRAY['editar_codigos','gestion_codigos','importar_csv_codigos']));
