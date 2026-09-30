-- ============================================================
-- Módulo: Garantías (reposición de producto por garantía — dos rutas
-- según haya stock o no, con responsables de Servicio Técnico,
-- semáforo por fecha, notas de avance e historial auditado).
--
-- Flujo:
--   Hay stock  → (PNC + fecha límite) → informe → finalizada
--              → sin PNC todavía → pnc_pendiente → informe
--   Sin stock  → nv → (N° NV + fecha seguimiento) → importacion
--              → (PNC + fecha límite) → informe → finalizada
--
-- Acceso: Servicio Técnico, Admin y Líderes editan (garantias_editar);
-- Jefe de Ventas ve todo en solo lectura (garantias_ver_todas); Ventas
-- ve solo las suyas (por correo de asesor).
-- Mismo molde que Equipos Sin Formato (20260915/20260916) y
-- calibraciones_ver_todas (20260922).
-- ============================================================

CREATE TABLE IF NOT EXISTS garantias (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                bigint GENERATED ALWAYS AS IDENTITY, -- se muestra como "GAR-{numero}"

  cliente               text NOT NULL,
  referencia            text NOT NULL,
  otst                  text, -- uno o varios códigos separados por coma
  asesor_correo         text NOT NULL REFERENCES calibraciones_asesores(correo),
  hay_stock             boolean NOT NULL,
  responsables          uuid[] NOT NULL DEFAULT '{}', -- profiles de Servicio Técnico

  estado                text NOT NULL
                          CHECK (estado IN ('pnc_pendiente', 'nv', 'importacion', 'informe', 'finalizada')),
  numero_nv             text,
  fecha_seguimiento     date,
  numero_pnc            text,
  fecha_limite_entrega  date,

  estado_desde          timestamptz NOT NULL DEFAULT now(),
  fecha_finalizada      timestamptz,

  anulada               boolean NOT NULL DEFAULT false,
  motivo_anulacion      text,

  creado_por            uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS garantias_notas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garantia_id  uuid NOT NULL REFERENCES garantias(id) ON DELETE CASCADE,
  usuario_id   uuid REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  texto        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS garantias_historial (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garantia_id     uuid NOT NULL REFERENCES garantias(id) ON DELETE CASCADE,
  usuario_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  campo           text NOT NULL,
  valor_anterior  text,
  valor_nuevo     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS garantias_notas_garantia_idx ON garantias_notas(garantia_id);
CREATE INDEX IF NOT EXISTS garantias_historial_garantia_idx ON garantias_historial(garantia_id);

ALTER TABLE garantias ENABLE ROW LEVEL SECURITY;
ALTER TABLE garantias_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE garantias_historial ENABLE ROW LEVEL SECURITY;

-- ── RLS ──────────────────────────────────────────────────────────────────────

CREATE POLICY "garantias select" ON garantias
  FOR SELECT TO authenticated USING (has_module('garantias') AND (
    has_capability('garantias_editar')
    OR has_capability('garantias_ver_todas')
    OR asesor_correo = (SELECT email FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "garantias insert" ON garantias
  FOR INSERT TO authenticated
  WITH CHECK (has_module('garantias') AND has_capability('garantias_editar'));

CREATE POLICY "garantias update" ON garantias
  FOR UPDATE TO authenticated
  USING (has_module('garantias') AND has_capability('garantias_editar'))
  WITH CHECK (has_module('garantias') AND has_capability('garantias_editar'));

CREATE POLICY "garantias delete" ON garantias
  FOR DELETE TO authenticated USING (has_module('admin'));

CREATE POLICY "garantias_notas select" ON garantias_notas
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM garantias g WHERE g.id = garantia_id AND has_module('garantias') AND (
      has_capability('garantias_editar')
      OR has_capability('garantias_ver_todas')
      OR g.asesor_correo = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  ));

CREATE POLICY "garantias_notas insert" ON garantias_notas
  FOR INSERT TO authenticated
  WITH CHECK (has_module('garantias') AND has_capability('garantias_editar'));

CREATE POLICY "garantias_historial select" ON garantias_historial
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM garantias g WHERE g.id = garantia_id AND has_module('garantias') AND (
      has_capability('garantias_editar')
      OR has_capability('garantias_ver_todas')
      OR g.asesor_correo = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  ));

-- ── Historial de auditoría ───────────────────────────────────────────────────
-- Todo cambio de campo del registro principal se audita solo (incluida la
-- fecha de seguimiento, que se puede reprogramar en Importación y debe
-- quedar trazada). estado_desde se mueve solo cuando cambia el estado.

CREATE OR REPLACE FUNCTION garantias_estado_desde()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    NEW.estado_desde := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garantias_estado_desde ON garantias;
CREATE TRIGGER trg_garantias_estado_desde
  BEFORE UPDATE ON garantias
  FOR EACH ROW EXECUTE FUNCTION garantias_estado_desde();

CREATE OR REPLACE FUNCTION log_garantias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'creacion', NEW.cliente);
    RETURN NEW;
  END IF;

  IF NEW.cliente IS DISTINCT FROM OLD.cliente THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'cliente', OLD.cliente, NEW.cliente);
  END IF;
  IF NEW.referencia IS DISTINCT FROM OLD.referencia THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'referencia', OLD.referencia, NEW.referencia);
  END IF;
  IF NEW.otst IS DISTINCT FROM OLD.otst THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'otst', OLD.otst, NEW.otst);
  END IF;
  IF NEW.asesor_correo IS DISTINCT FROM OLD.asesor_correo THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'asesor_correo', OLD.asesor_correo, NEW.asesor_correo);
  END IF;
  IF NEW.hay_stock IS DISTINCT FROM OLD.hay_stock THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'hay_stock', OLD.hay_stock::text, NEW.hay_stock::text);
  END IF;
  IF NEW.responsables IS DISTINCT FROM OLD.responsables THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'responsables', array_to_string(OLD.responsables, ','), array_to_string(NEW.responsables, ','));
  END IF;
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'estado', OLD.estado, NEW.estado);
  END IF;
  IF NEW.numero_nv IS DISTINCT FROM OLD.numero_nv THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'numero_nv', OLD.numero_nv, NEW.numero_nv);
  END IF;
  IF NEW.fecha_seguimiento IS DISTINCT FROM OLD.fecha_seguimiento THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'fecha_seguimiento', OLD.fecha_seguimiento::text, NEW.fecha_seguimiento::text);
  END IF;
  IF NEW.numero_pnc IS DISTINCT FROM OLD.numero_pnc THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'numero_pnc', OLD.numero_pnc, NEW.numero_pnc);
  END IF;
  IF NEW.fecha_limite_entrega IS DISTINCT FROM OLD.fecha_limite_entrega THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'fecha_limite_entrega', OLD.fecha_limite_entrega::text, NEW.fecha_limite_entrega::text);
  END IF;
  IF NEW.anulada IS DISTINCT FROM OLD.anulada THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'anulada', OLD.anulada::text, NEW.anulada::text);
  END IF;
  IF NEW.motivo_anulacion IS DISTINCT FROM OLD.motivo_anulacion THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'motivo_anulacion', OLD.motivo_anulacion, NEW.motivo_anulacion);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_garantias_insert ON garantias;
CREATE TRIGGER trg_log_garantias_insert
  AFTER INSERT ON garantias
  FOR EACH ROW EXECUTE FUNCTION log_garantias();

DROP TRIGGER IF EXISTS trg_log_garantias_update ON garantias;
CREATE TRIGGER trg_log_garantias_update
  AFTER UPDATE ON garantias
  FOR EACH ROW EXECUTE FUNCTION log_garantias();

-- Cada nota de avance también queda en el historial.
CREATE OR REPLACE FUNCTION log_garantias_nota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_nuevo, created_at)
  VALUES (NEW.garantia_id, NEW.usuario_id, 'nota', NEW.texto, NEW.created_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_garantias_nota ON garantias_notas;
CREATE TRIGGER trg_log_garantias_nota
  AFTER INSERT ON garantias_notas
  FOR EACH ROW EXECUTE FUNCTION log_garantias_nota();

-- ── Seed: módulo, capabilities y accesos por rol ────────────────────────────

INSERT INTO modules (key) VALUES ('garantias')
ON CONFLICT (key) DO NOTHING;

-- "Jefe de Ventas" lo creó el usuario a mano desde el Admin — no-op si no existe.
INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'garantias' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin', 'Líderes', 'Ventas', 'Jefe de Ventas')
ON CONFLICT DO NOTHING;

INSERT INTO capabilities (key) VALUES ('garantias_editar'), ('garantias_ver_todas')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'garantias_editar' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin', 'Líderes')
ON CONFLICT DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'garantias_ver_todas' FROM roles r
WHERE r.name = 'Jefe de Ventas'
ON CONFLICT DO NOTHING;
