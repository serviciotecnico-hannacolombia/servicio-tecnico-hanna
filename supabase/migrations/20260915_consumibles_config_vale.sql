-- ============================================================
-- Consumibles: configuración editable del módulo
-- Guarda la fecha del último vale de consumo pedido (dato editable
-- manualmente por el equipo, no calculado), mostrada en el dashboard
-- de Inventario en lugar de la tarjeta "Este mes".
-- ============================================================

CREATE TABLE IF NOT EXISTS consumibles_config (
  id                 int PRIMARY KEY DEFAULT 1,
  ultimo_vale_fecha  date,
  ultimo_vale_nota   text,
  updated_by         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consumibles_config_single_row CHECK (id = 1)
);

INSERT INTO consumibles_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE consumibles_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consumibles_config select" ON consumibles_config
  FOR SELECT TO authenticated USING (has_module('consumibles'));
CREATE POLICY "consumibles_config write" ON consumibles_config
  FOR UPDATE TO authenticated
  USING (has_module('consumibles')) WITH CHECK (has_module('consumibles'));
