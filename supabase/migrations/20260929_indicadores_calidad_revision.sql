-- Indicador de calidad: pedidos revisados dentro del tiempo máximo de 2 horas.
-- Se registra manualmente cada mes (igual que indicadores_reales) y permite
-- separar los pedidos vencidos por causas justificadas (capacitaciones,
-- acondicionamiento de equipos, etc.) para calcular un indicador "real"
-- además del indicador oficial que muestra la intranet.

CREATE TABLE IF NOT EXISTS indicadores_calidad_revision (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio                        int NOT NULL,
  mes                         int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  total_pedidos               int NOT NULL DEFAULT 0,
  pedidos_a_tiempo            int NOT NULL DEFAULT 0,
  pedidos_vencidos_justificados int NOT NULL DEFAULT 0,
  notas                       text,
  actualizado_por             text,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now(),
  UNIQUE (anio, mes)
);

ALTER TABLE indicadores_calidad_revision ENABLE ROW LEVEL SECURITY;

CREATE POLICY "indicadores_calidad select" ON indicadores_calidad_revision
  FOR SELECT TO authenticated USING (has_module('indicadores'));
CREATE POLICY "indicadores_calidad write" ON indicadores_calidad_revision
  FOR ALL TO authenticated USING (has_module('indicadores')) WITH CHECK (has_module('indicadores'));
