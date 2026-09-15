-- ============================================================
-- Favoritos del sidebar: cada usuario puede marcar módulos como
-- favoritos y ordenarlos a su gusto. Se guarda como un array
-- ordenado de module_key en el propio perfil — la política
-- "profiles update" ya existente (id = auth.uid()) permite que
-- cada quien edite su propia fila, no hace falta RLS nueva.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favoritos_modulos text[] NOT NULL DEFAULT '{}';
