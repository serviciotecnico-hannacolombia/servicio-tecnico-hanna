-- ============================================================
-- Módulo: Formatos → Correos OC
-- ============================================================

CREATE TABLE IF NOT EXISTS correos_proveedores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL UNIQUE,
  activo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS correos_destinatarios (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id uuid NOT NULL REFERENCES correos_proveedores(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  email        text NOT NULL,
  tipo         text NOT NULL CHECK (tipo IN ('to','cc')) DEFAULT 'to',
  orden        int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE correos_proveedores   ENABLE ROW LEVEL SECURITY;
ALTER TABLE correos_destinatarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read proveedores"
  ON correos_proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all proveedores"
  ON correos_proveedores FOR ALL TO authenticated USING (true);

CREATE POLICY "auth read destinatarios"
  ON correos_destinatarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all destinatarios"
  ON correos_destinatarios FOR ALL TO authenticated USING (true);

-- ── Datos iniciales ──────────────────────────────────────────
INSERT INTO correos_proveedores (id, nombre) VALUES
  ('11111111-0000-0000-0000-000000000001', 'METROLOGICAL CENTER SAS'),
  ('11111111-0000-0000-0000-000000000002', 'METRONIKA SAS'),
  ('11111111-0000-0000-0000-000000000003', 'METRILAB LTDA'),
  ('11111111-0000-0000-0000-000000000004', 'CONAMET S.A.S.')
ON CONFLICT (nombre) DO NOTHING;

-- Destinatarios de METROLOGICAL CENTER (del .eml de ejemplo)
INSERT INTO correos_destinatarios (proveedor_id, nombre, email, tipo, orden) VALUES
  ('11111111-0000-0000-0000-000000000001', 'RECEPCION EQUIPOS METCENTER', 'recepcion@metrologicalcenter.com.co', 'to', 1),
  ('11111111-0000-0000-0000-000000000001', 'Natalia Pérez',               'dir.comercial@metrologicalcenter.com', 'to', 2),
  ('11111111-0000-0000-0000-000000000001', 'Catalina Fisgativa',          'a.comercial@metrologicalcenter.com',   'to', 3),
  ('11111111-0000-0000-0000-000000000001', 'Logística Hanna',             'logistica@hannacolombia.com',          'to', 4),
  ('11111111-0000-0000-0000-000000000001', 'Servicio Técnico',            'serviciotecnico@hannacolombia.com',    'cc', 5)
ON CONFLICT DO NOTHING;
