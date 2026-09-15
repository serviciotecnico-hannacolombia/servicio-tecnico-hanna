-- ============================================================
-- Módulo: Equipos Sin Formato (registro y seguimiento de equipos que
-- llegan a Servicio Técnico sin formato de ingreso o sin motivo claro
-- de su llegada — notifica al asesor relacionado y sigue una línea de
-- tiempo de 4 estados hasta quedar ingresado en el sistema).
-- Acceso: Servicio Técnico, Ventas (solo lectura de lo suyo), Admin
-- ============================================================

CREATE TABLE IF NOT EXISTS equipos_sin_formato (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero              bigint GENERATED ALWAYS AS IDENTITY, -- se muestra como "SF-{numero}"

  razon_social        text NOT NULL,
  fecha_llegada       date NOT NULL,
  modo_llegada        text, -- guía, comentario libre (ej. "dejado en bodega", "cliente envía formato después")
  asesor_correo       text NOT NULL REFERENCES calibraciones_asesores(correo),

  estado              text NOT NULL DEFAULT 'recibido'
                        CHECK (estado IN ('recibido', 'pendiente', 'preingresado', 'ingresado')),
  numero_pre_ingreso  text,
  otst                text, -- uno o varios códigos separados por coma

  fecha_recibido      timestamptz NOT NULL DEFAULT now(),
  fecha_pendiente     timestamptz,
  fecha_preingreso    timestamptz,
  fecha_ingreso       timestamptz,

  creado_por          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipos_sin_formato_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_sf_id  uuid NOT NULL REFERENCES equipos_sin_formato(id) ON DELETE CASCADE,
  referencia    text NOT NULL,
  serial        text,
  observaciones text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE equipos_sin_formato ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos_sin_formato_items ENABLE ROW LEVEL SECURITY;

-- Ventas ve (solo lectura) los registros de su propio correo de asesor;
-- quien tenga la capability ve y edita todo.
CREATE POLICY "esf select" ON equipos_sin_formato
  FOR SELECT TO authenticated USING (has_module('equipos_sin_formato') AND (
    has_capability('equipos_sin_formato_editar')
    OR asesor_correo = (SELECT email FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "esf write" ON equipos_sin_formato
  FOR ALL TO authenticated
  USING (has_module('equipos_sin_formato') AND has_capability('equipos_sin_formato_editar'))
  WITH CHECK (has_module('equipos_sin_formato') AND has_capability('equipos_sin_formato_editar'));

CREATE POLICY "esf_items select" ON equipos_sin_formato_items
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM equipos_sin_formato e WHERE e.id = equipo_sf_id AND (
      has_capability('equipos_sin_formato_editar')
      OR e.asesor_correo = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  ));

CREATE POLICY "esf_items write" ON equipos_sin_formato_items
  FOR ALL TO authenticated
  USING (has_module('equipos_sin_formato') AND has_capability('equipos_sin_formato_editar'))
  WITH CHECK (has_module('equipos_sin_formato') AND has_capability('equipos_sin_formato_editar'));

-- ── Seed: módulo, capability y accesos por rol ──────────────────────────────

INSERT INTO modules (key) VALUES ('equipos_sin_formato')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'equipos_sin_formato' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Ventas', 'Admin')
ON CONFLICT DO NOTHING;

INSERT INTO capabilities (key) VALUES ('equipos_sin_formato_editar')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'equipos_sin_formato_editar' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin')
ON CONFLICT DO NOTHING;
