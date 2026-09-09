-- ============================================================
-- Módulo: Tickets a Fábrica (reporte de fallas/novedades de equipos ante
-- fábrica — reemplaza el seguimiento manual en Notion)
-- Acceso: Servicio Técnico, Admin
-- ============================================================

CREATE TABLE IF NOT EXISTS tickets_fabrica (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero      bigint GENERATED ALWAYS AS IDENTITY,

  nombre      text NOT NULL, -- No. de ticket generado en la plataforma de fábrica
  creado_por  uuid REFERENCES profiles(id) ON DELETE SET NULL,

  codigo        text,
  serial        text,
  equipo_nombre text,
  origen      text CHECK (origen IN ('control_calidad', 'orden_trabajo')),
  estado      text CHECK (estado IN (
                'exportacion_garantia', 'consulta_resuelta', 'pendiente_feedback',
                'exportacion', 'denegada_garantia', 'en_espera', 'cambio_garantia'
              )),
  nota_estado text, -- detalle libre según el estado (ej. qué pidió fábrica, motivo de la respuesta)

  -- Trazabilidad equipo madre/hijo: una sonda o electrodo (equipo hijo) que
  -- falla se reporta con su propio código/serial, pero sin registrar el
  -- equipo madre se pierde el rastro de qué equipo completo quedó afectado.
  es_equipo_hijo       boolean NOT NULL DEFAULT false,
  equipo_madre_codigo  text,
  equipo_madre_serial  text,
  equipo_madre_nombre  text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tickets_fabrica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_fabrica select" ON tickets_fabrica
  FOR SELECT TO authenticated USING (has_module('tickets'));
CREATE POLICY "tickets_fabrica write" ON tickets_fabrica
  FOR ALL TO authenticated
  USING (has_module('tickets')) WITH CHECK (has_module('tickets'));

-- ── Seed: módulo y accesos por rol ──────────────────────────────────────────

INSERT INTO modules (key) VALUES ('tickets')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'tickets' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin')
ON CONFLICT DO NOTHING;
