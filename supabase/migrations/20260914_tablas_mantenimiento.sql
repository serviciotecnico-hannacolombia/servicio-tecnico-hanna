-- ============================================================
-- "Tablas de mantenimiento": biblioteca de tablas de lectura/tolerancia
-- por modelo de equipo (Editor de Informes), para insertar en un informe
-- sin escribir el HTML a mano cada vez. Se guardan las filas estructuradas
-- (no el HTML ya armado) para poder repoblar el formulario de edición sin
-- tener que parsear HTML arbitrario.
-- ============================================================

CREATE TABLE IF NOT EXISTS tablas_mantenimiento (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo      text NOT NULL,
  parametro   text,
  filas       jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ lectura, estandar, tolerancia }, ...]
  creado_por  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tablas_mantenimiento ENABLE ROW LEVEL SECURITY;

-- Cualquiera con el módulo 'editor' puede ver e insertar en su informe;
-- agregar/editar/borrar tablas queda restringido a quien tenga la
-- capability, igual que editar_codigos/calibraciones_editar.
CREATE POLICY "tablas_mantenimiento select" ON tablas_mantenimiento
  FOR SELECT TO authenticated USING (has_module('editor'));

CREATE POLICY "tablas_mantenimiento write" ON tablas_mantenimiento
  FOR ALL TO authenticated
  USING (has_module('editor') AND has_capability('tablas_mantenimiento_editar'))
  WITH CHECK (has_module('editor') AND has_capability('tablas_mantenimiento_editar'));

-- ── Seed: capability y acceso por rol ────────────────────────────────────────

INSERT INTO capabilities (key) VALUES ('tablas_mantenimiento_editar')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'tablas_mantenimiento_editar' FROM roles r
WHERE r.name IN ('Admin')
ON CONFLICT DO NOTHING;
