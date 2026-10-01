-- ============================================================
-- Garantías: lista configurable de responsables seleccionables.
-- En vez de tomar automáticamente a todos los del rol "Servicio
-- Técnico", el Admin decide desde el propio módulo quiénes aparecen
-- en el selector de Responsables. Se siembra con los integrantes
-- activos actuales de Servicio Técnico.
-- ============================================================

CREATE TABLE IF NOT EXISTS garantias_responsables (
  profile_id  uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE garantias_responsables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "garantias_responsables select" ON garantias_responsables
  FOR SELECT TO authenticated USING (has_module('garantias'));

CREATE POLICY "garantias_responsables write" ON garantias_responsables
  FOR ALL TO authenticated
  USING (has_module('admin'))
  WITH CHECK (has_module('admin'));

INSERT INTO garantias_responsables (profile_id)
SELECT p.id FROM profiles p
JOIN roles r ON r.id = p.role_id
WHERE r.name = 'Servicio Técnico' AND p.activo
ON CONFLICT DO NOTHING;
