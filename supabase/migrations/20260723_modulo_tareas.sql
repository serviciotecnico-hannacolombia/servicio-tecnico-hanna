-- ============================================================
-- Módulo: Tareas (una persona crea una tarea para sí misma o para otro
-- usuario, con fecha de vencimiento y observaciones)
-- ============================================================

CREATE TABLE IF NOT EXISTS tareas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo            text NOT NULL,
  descripcion       text,
  creado_por        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asignado_a        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fecha_vencimiento date,
  estado            text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completada')),
  completado_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tareas_asignado_a ON tareas (asignado_a);
CREATE INDEX IF NOT EXISTS idx_tareas_creado_por ON tareas (creado_por);
CREATE INDEX IF NOT EXISTS idx_tareas_estado     ON tareas (estado);

-- RLS: a diferencia de las tablas operativas compartidas (bodega, tarifas...),
-- una tarea es de naturaleza personal — solo debe verla quien la creó o a
-- quien se le asignó, no todo el que tenga el módulo habilitado.
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tareas select propias o asignadas"
  ON tareas FOR SELECT TO authenticated
  USING (creado_por = auth.uid() OR asignado_a = auth.uid());

CREATE POLICY "tareas insert propias"
  ON tareas FOR INSERT TO authenticated
  WITH CHECK (creado_por = auth.uid());

CREATE POLICY "tareas update propias o asignadas"
  ON tareas FOR UPDATE TO authenticated
  USING (creado_por = auth.uid() OR asignado_a = auth.uid());

CREATE POLICY "tareas delete solo creador"
  ON tareas FOR DELETE TO authenticated
  USING (creado_por = auth.uid());

-- updated_at se fija manualmente desde el cliente en cada UPDATE, igual que
-- en el resto de las tablas de este proyecto (no hay trigger de BD para esto).

-- ── Seed: módulo nuevo, disponible para todos los roles existentes ─────────
-- (es una herramienta personal transversal, no atada a un área específica;
-- ajustable luego desde Administración → Roles si se quiere restringir)

INSERT INTO modules (key) VALUES ('tareas')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'tareas' FROM roles r
ON CONFLICT DO NOTHING;
