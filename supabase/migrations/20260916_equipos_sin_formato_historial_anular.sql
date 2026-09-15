-- ============================================================
-- Equipos Sin Formato: anulación con motivo, borrado restringido a
-- Admin, e historial de auditoría (mismo patrón que Calibraciones —
-- ver 20260722_calibraciones_historial.sql y 20260901_calibraciones_anular.sql).
-- ============================================================

ALTER TABLE equipos_sin_formato
  ADD COLUMN IF NOT EXISTS anulada          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text;

-- ── Separar DELETE del resto de escritura (antes todo caía en "esf write") ──

DROP POLICY IF EXISTS "esf write" ON equipos_sin_formato;

CREATE POLICY "esf insert" ON equipos_sin_formato
  FOR INSERT TO authenticated
  WITH CHECK (has_module('equipos_sin_formato') AND has_capability('equipos_sin_formato_editar'));

CREATE POLICY "esf update" ON equipos_sin_formato
  FOR UPDATE TO authenticated
  USING (has_module('equipos_sin_formato') AND has_capability('equipos_sin_formato_editar'))
  WITH CHECK (has_module('equipos_sin_formato') AND has_capability('equipos_sin_formato_editar'));

CREATE POLICY "esf delete" ON equipos_sin_formato
  FOR DELETE TO authenticated USING (has_module('admin'));

-- ── Historial de auditoría ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipos_sin_formato_historial (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_sf_id  uuid NOT NULL REFERENCES equipos_sin_formato(id) ON DELETE CASCADE,
  usuario_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  campo         text NOT NULL,
  valor_anterior text,
  valor_nuevo    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE equipos_sin_formato_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esf_historial select" ON equipos_sin_formato_historial
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM equipos_sin_formato e WHERE e.id = equipo_sf_id AND (
      has_capability('equipos_sin_formato_editar')
      OR e.asesor_correo = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  ));

-- Los cambios de equipos (agregar/editar/quitar referencias) se registran a
-- mano desde el cliente, porque viven en una tabla aparte
-- (equipos_sin_formato_items) que el trigger de abajo no puede diffear
-- campo a campo. El resto de campos del registro principal se audita solo.
CREATE POLICY "esf_historial insert equipos" ON equipos_sin_formato_historial
  FOR INSERT TO authenticated
  WITH CHECK (
    campo = 'equipos'
    AND has_module('equipos_sin_formato') AND has_capability('equipos_sin_formato_editar')
  );

CREATE OR REPLACE FUNCTION log_equipos_sin_formato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO equipos_sin_formato_historial (equipo_sf_id, usuario_id, campo, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'creacion', NEW.razon_social);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.razon_social IS DISTINCT FROM OLD.razon_social THEN
      INSERT INTO equipos_sin_formato_historial (equipo_sf_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'razon_social', OLD.razon_social, NEW.razon_social);
    END IF;
    IF NEW.fecha_llegada IS DISTINCT FROM OLD.fecha_llegada THEN
      INSERT INTO equipos_sin_formato_historial (equipo_sf_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'fecha_llegada', OLD.fecha_llegada::text, NEW.fecha_llegada::text);
    END IF;
    IF NEW.modo_llegada IS DISTINCT FROM OLD.modo_llegada THEN
      INSERT INTO equipos_sin_formato_historial (equipo_sf_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'modo_llegada', OLD.modo_llegada, NEW.modo_llegada);
    END IF;
    IF NEW.asesor_correo IS DISTINCT FROM OLD.asesor_correo THEN
      INSERT INTO equipos_sin_formato_historial (equipo_sf_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'asesor_correo', OLD.asesor_correo, NEW.asesor_correo);
    END IF;
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      INSERT INTO equipos_sin_formato_historial (equipo_sf_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'estado', OLD.estado, NEW.estado);
    END IF;
    IF NEW.numero_pre_ingreso IS DISTINCT FROM OLD.numero_pre_ingreso THEN
      INSERT INTO equipos_sin_formato_historial (equipo_sf_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'numero_pre_ingreso', OLD.numero_pre_ingreso, NEW.numero_pre_ingreso);
    END IF;
    IF NEW.otst IS DISTINCT FROM OLD.otst THEN
      INSERT INTO equipos_sin_formato_historial (equipo_sf_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'otst', OLD.otst, NEW.otst);
    END IF;
    IF NEW.anulada IS DISTINCT FROM OLD.anulada THEN
      INSERT INTO equipos_sin_formato_historial (equipo_sf_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'anulada', OLD.anulada::text, NEW.anulada::text);
    END IF;
    IF NEW.motivo_anulacion IS DISTINCT FROM OLD.motivo_anulacion THEN
      INSERT INTO equipos_sin_formato_historial (equipo_sf_id, usuario_id, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, auth.uid(), 'motivo_anulacion', OLD.motivo_anulacion, NEW.motivo_anulacion);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_equipos_sin_formato_insert ON equipos_sin_formato;
CREATE TRIGGER trg_log_equipos_sin_formato_insert
  AFTER INSERT ON equipos_sin_formato
  FOR EACH ROW EXECUTE FUNCTION log_equipos_sin_formato();

DROP TRIGGER IF EXISTS trg_log_equipos_sin_formato_update ON equipos_sin_formato;
CREATE TRIGGER trg_log_equipos_sin_formato_update
  AFTER UPDATE ON equipos_sin_formato
  FOR EACH ROW EXECUTE FUNCTION log_equipos_sin_formato();
