-- ============================================================
-- Módulo: Mantenimiento Programado (seguimiento de equipos con plan de
-- mantenimiento preventivo vendido junto con la compra)
-- Acceso: Servicio Técnico, Admin y Líderes
-- ============================================================

CREATE TABLE IF NOT EXISTS equipos_mantenimiento (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial         text NOT NULL,
  familia        text NOT NULL,
  cliente        text NOT NULL,
  codigo_mantprog text,
  periodicidad   text NOT NULL CHECK (periodicidad IN ('trimestral','semestral','anual')),
  fecha_compra   date NOT NULL,
  proxima_fecha  date NOT NULL,
  estado         text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','cancelado')),
  observaciones  text,
  creado_por     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipos_mant_estado        ON equipos_mantenimiento (estado);
CREATE INDEX IF NOT EXISTS idx_equipos_mant_proxima_fecha ON equipos_mantenimiento (proxima_fecha);

CREATE TABLE IF NOT EXISTS eventos_mantenimiento (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id      uuid NOT NULL REFERENCES equipos_mantenimiento(id) ON DELETE CASCADE,
  fecha_recepcion date NOT NULL,
  fecha_entrega  date,
  observaciones  text,
  responsable    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_mant_equipo_id ON eventos_mantenimiento (equipo_id);

-- RLS: tabla operativa compartida — visible/editable por cualquiera con el
-- módulo habilitado, igual que otst_bodega. Sin capacidades finas por ahora.
ALTER TABLE equipos_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_mantenimiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipos_mantenimiento select"
  ON equipos_mantenimiento FOR SELECT TO authenticated
  USING (has_module('mantenimiento_programado'));

CREATE POLICY "equipos_mantenimiento write"
  ON equipos_mantenimiento FOR ALL TO authenticated
  USING (has_module('mantenimiento_programado'))
  WITH CHECK (has_module('mantenimiento_programado'));

CREATE POLICY "eventos_mantenimiento select"
  ON eventos_mantenimiento FOR SELECT TO authenticated
  USING (has_module('mantenimiento_programado'));

CREATE POLICY "eventos_mantenimiento write"
  ON eventos_mantenimiento FOR ALL TO authenticated
  USING (has_module('mantenimiento_programado'))
  WITH CHECK (has_module('mantenimiento_programado'));

-- ── Seed: módulo nuevo, solo para Servicio Técnico, Admin y Líderes ────────

INSERT INTO modules (key) VALUES ('mantenimiento_programado')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'mantenimiento_programado' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin', 'Líderes')
ON CONFLICT DO NOTHING;
