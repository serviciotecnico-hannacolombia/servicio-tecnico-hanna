-- ============================================================
-- Calibraciones: las novedades pasan a ser eventos propios.
--
-- Antes la novedad era la columna ordenes_calibracion.novedad_detalle (una
-- sola a la vez) y sus avances/resolución eran filas sueltas del historial.
-- Desde aquí:
--   - ordenes_calibracion_novedades: una fila por novedad, con la etapa en
--     que se abrió, los equipos afectados (opcional) y su resolución. Puede
--     haber varias abiertas a la vez.
--   - ordenes_calibracion_novedad_avances: el seguimiento de cada una.
--   - ordenes_calibracion.novedad_detalle se mantiene sola (trigger) con el
--     detalle de la novedad abierta más reciente, para la etiqueta "Novedad"
--     de la lista. La app ya no la escribe directo.
--   - El historial de la orden registra novedad_abierta / novedad_avance /
--     novedad_resuelta desde estos triggers.
-- La novedad no toca el estado, las fechas ni el semáforo de la orden.
-- ============================================================

CREATE TABLE IF NOT EXISTS ordenes_calibracion_novedades (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orden_id      uuid NOT NULL REFERENCES ordenes_calibracion(id) ON DELETE CASCADE,
  etapa         text NOT NULL,          -- estado de la orden al abrirla
  detalle       text NOT NULL CHECK (btrim(detalle) <> ''),
  equipos_ids   uuid[] NOT NULL DEFAULT '{}',
  abierta_por   uuid DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  resuelta_at   timestamptz,
  resuelta_por  uuid,
  resolucion    text
);

CREATE INDEX IF NOT EXISTS ordenes_calibracion_novedades_orden_idx
  ON ordenes_calibracion_novedades (orden_id);
CREATE INDEX IF NOT EXISTS ordenes_calibracion_novedades_abiertas_idx
  ON ordenes_calibracion_novedades (orden_id) WHERE resuelta_at IS NULL;

CREATE TABLE IF NOT EXISTS ordenes_calibracion_novedad_avances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  novedad_id  uuid NOT NULL REFERENCES ordenes_calibracion_novedades(id) ON DELETE CASCADE,
  mensaje     text NOT NULL CHECK (btrim(mensaje) <> ''),
  usuario_id  uuid DEFAULT auth.uid(),
  notificado  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ordenes_calibracion_novedad_avances_novedad_idx
  ON ordenes_calibracion_novedad_avances (novedad_id);

ALTER TABLE ordenes_calibracion_novedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_calibracion_novedad_avances ENABLE ROW LEVEL SECURITY;

-- ── RLS (mismo criterio que ordenes_calibracion_equipos; sin DELETE) ────────

DROP POLICY IF EXISTS "ordenes_calibracion_novedades select" ON ordenes_calibracion_novedades;
CREATE POLICY "ordenes_calibracion_novedades select" ON ordenes_calibracion_novedades FOR SELECT TO authenticated
  USING (has_module('calibraciones') AND (
    has_capability('calibraciones_editar')
    OR has_capability('calibraciones_ver_todas')
    OR EXISTS (
      SELECT 1 FROM ordenes_calibracion oc
      JOIN profiles p ON p.id = auth.uid()
      WHERE oc.id = ordenes_calibracion_novedades.orden_id AND p.email = oc.correo_asesor
    )
  ));

DROP POLICY IF EXISTS "ordenes_calibracion_novedades insert" ON ordenes_calibracion_novedades;
CREATE POLICY "ordenes_calibracion_novedades insert" ON ordenes_calibracion_novedades FOR INSERT TO authenticated
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));

DROP POLICY IF EXISTS "ordenes_calibracion_novedades update" ON ordenes_calibracion_novedades;
CREATE POLICY "ordenes_calibracion_novedades update" ON ordenes_calibracion_novedades FOR UPDATE TO authenticated
  USING (has_module('calibraciones') AND has_capability('calibraciones_editar'))
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));

DROP POLICY IF EXISTS "ordenes_calibracion_novedad_avances select" ON ordenes_calibracion_novedad_avances;
CREATE POLICY "ordenes_calibracion_novedad_avances select" ON ordenes_calibracion_novedad_avances FOR SELECT TO authenticated
  USING (has_module('calibraciones') AND (
    has_capability('calibraciones_editar')
    OR has_capability('calibraciones_ver_todas')
    OR EXISTS (
      SELECT 1 FROM ordenes_calibracion_novedades n
      JOIN ordenes_calibracion oc ON oc.id = n.orden_id
      JOIN profiles p ON p.id = auth.uid()
      WHERE n.id = ordenes_calibracion_novedad_avances.novedad_id AND p.email = oc.correo_asesor
    )
  ));

DROP POLICY IF EXISTS "ordenes_calibracion_novedad_avances insert" ON ordenes_calibracion_novedad_avances;
CREATE POLICY "ordenes_calibracion_novedad_avances insert" ON ordenes_calibracion_novedad_avances FOR INSERT TO authenticated
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));

-- ── Triggers ─────────────────────────────────────────────────────────────────
-- Durante la migración de datos (abajo) se apagan con este flag local.

CREATE OR REPLACE FUNCTION calibraciones_migrando_novedades() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('calibraciones.migrando_novedades', true), '') = 'on'
$$;

-- Mantiene ordenes_calibracion.novedad_detalle = detalle de la novedad
-- abierta más reciente (o null). El trigger general de la orden registra ese
-- cambio como 'novedad_detalle'; como el evento ya queda en el historial con
-- novedad_abierta / novedad_resuelta, esa fila duplicada se borra (es de esta
-- misma transacción: created_at = now()).
CREATE OR REPLACE FUNCTION sync_novedad_detalle_orden() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_detalle text;
BEGIN
  IF calibraciones_migrando_novedades() THEN RETURN NULL; END IF;

  SELECT detalle INTO v_detalle
  FROM ordenes_calibracion_novedades
  WHERE orden_id = NEW.orden_id AND resuelta_at IS NULL
  ORDER BY created_at DESC LIMIT 1;

  UPDATE ordenes_calibracion SET novedad_detalle = v_detalle
  WHERE id = NEW.orden_id AND novedad_detalle IS DISTINCT FROM v_detalle;

  DELETE FROM ordenes_calibracion_historial
  WHERE orden_id = NEW.orden_id AND campo = 'novedad_detalle' AND created_at = now();

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_novedad_detalle_orden ON ordenes_calibracion_novedades;
CREATE TRIGGER trg_sync_novedad_detalle_orden
  AFTER INSERT OR UPDATE ON ordenes_calibracion_novedades
  FOR EACH ROW EXECUTE FUNCTION sync_novedad_detalle_orden();

CREATE OR REPLACE FUNCTION log_ordenes_calibracion_novedades() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF calibraciones_migrando_novedades() THEN RETURN NULL; END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_nuevo)
    VALUES (NEW.orden_id, auth.uid(), 'novedad_abierta', NEW.detalle);
  ELSIF NEW.resuelta_at IS NOT NULL AND OLD.resuelta_at IS NULL THEN
    INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.orden_id, auth.uid(), 'novedad_resuelta', NEW.detalle, NEW.resolucion);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ordenes_calibracion_novedades ON ordenes_calibracion_novedades;
CREATE TRIGGER trg_log_ordenes_calibracion_novedades
  AFTER INSERT OR UPDATE ON ordenes_calibracion_novedades
  FOR EACH ROW EXECUTE FUNCTION log_ordenes_calibracion_novedades();

CREATE OR REPLACE FUNCTION log_ordenes_calibracion_novedad_avances() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF calibraciones_migrando_novedades() THEN RETURN NULL; END IF;

  INSERT INTO ordenes_calibracion_historial (orden_id, usuario_id, campo, valor_nuevo)
  SELECT n.orden_id, auth.uid(), 'novedad_avance', NEW.mensaje
  FROM ordenes_calibracion_novedades n WHERE n.id = NEW.novedad_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_ordenes_calibracion_novedad_avances ON ordenes_calibracion_novedad_avances;
CREATE TRIGGER trg_log_ordenes_calibracion_novedad_avances
  AFTER INSERT ON ordenes_calibracion_novedad_avances
  FOR EACH ROW EXECUTE FUNCTION log_ordenes_calibracion_novedad_avances();

-- ── Migración de las novedades existentes ───────────────────────────────────
-- Recorre el historial de cada orden en orden cronológico: cada marca de
-- novedad_detalle abre una novedad (en la etapa vigente en ese momento), los
-- novedad_avance se le cuelgan y novedad_resuelta la cierra. Las que siguen
-- activas sin marca en el historial se crean con updated_at.

DO $$
DECLARE
  o        record;
  h        record;
  v_estado text;
  v_abierta uuid;
  v_actual  text;
BEGIN
  -- Si ya hay novedades (la migración se corrió antes), no se duplican.
  IF EXISTS (SELECT 1 FROM ordenes_calibracion_novedades) THEN RETURN; END IF;

  PERFORM set_config('calibraciones.migrando_novedades', 'on', true);

  FOR o IN
    SELECT DISTINCT oc.id, oc.estado, oc.novedad_detalle, oc.updated_at
    FROM ordenes_calibracion oc
    WHERE nullif(btrim(oc.novedad_detalle), '') IS NOT NULL
       OR EXISTS (SELECT 1 FROM ordenes_calibracion_historial x
                  WHERE x.orden_id = oc.id AND x.campo IN ('novedad_detalle', 'novedad_avance', 'novedad_resuelta'))
  LOOP
    v_abierta := NULL;
    -- Algunas órdenes tienen novedad_detalle = '' (vacío): cuenta como sin novedad.
    v_actual := nullif(btrim(o.novedad_detalle), '');
    SELECT coalesce(x.valor_anterior, x.valor_nuevo) INTO v_estado
    FROM ordenes_calibracion_historial x
    WHERE x.orden_id = o.id AND x.campo = 'estado'
    ORDER BY x.created_at LIMIT 1;
    v_estado := coalesce(v_estado, o.estado);

    FOR h IN
      SELECT * FROM ordenes_calibracion_historial x
      WHERE x.orden_id = o.id AND x.campo IN ('estado', 'novedad_detalle', 'novedad_avance', 'novedad_resuelta')
      ORDER BY x.created_at, x.id
    LOOP
      IF h.campo = 'estado' THEN
        v_estado := coalesce(h.valor_nuevo, v_estado);
      ELSIF h.campo = 'novedad_detalle' AND h.valor_nuevo IS NOT NULL AND btrim(h.valor_nuevo) <> '' THEN
        IF v_abierta IS NULL THEN
          INSERT INTO ordenes_calibracion_novedades (orden_id, etapa, detalle, abierta_por, created_at)
          VALUES (o.id, v_estado, h.valor_nuevo, h.usuario_id, h.created_at)
          RETURNING id INTO v_abierta;
        ELSE
          UPDATE ordenes_calibracion_novedades SET detalle = h.valor_nuevo WHERE id = v_abierta;
        END IF;
      ELSIF h.campo = 'novedad_avance' AND v_abierta IS NOT NULL AND coalesce(btrim(h.valor_nuevo), '') <> '' THEN
        INSERT INTO ordenes_calibracion_novedad_avances (novedad_id, mensaje, usuario_id, created_at)
        VALUES (v_abierta, h.valor_nuevo, h.usuario_id, h.created_at);
      ELSIF h.campo = 'novedad_resuelta' AND v_abierta IS NOT NULL THEN
        UPDATE ordenes_calibracion_novedades
        SET resuelta_at = h.created_at, resuelta_por = h.usuario_id, resolucion = h.valor_nuevo
        WHERE id = v_abierta;
        v_abierta := NULL;
      ELSIF h.campo = 'novedad_detalle' AND h.valor_nuevo IS NULL AND v_abierta IS NOT NULL THEN
        -- Se limpió sin pasar por "Dar solución".
        UPDATE ordenes_calibracion_novedades
        SET resuelta_at = h.created_at, resuelta_por = h.usuario_id
        WHERE id = v_abierta;
        v_abierta := NULL;
      END IF;
    END LOOP;

    IF v_actual IS NOT NULL AND v_abierta IS NULL THEN
      INSERT INTO ordenes_calibracion_novedades (orden_id, etapa, detalle, abierta_por, created_at)
      VALUES (o.id, o.estado, v_actual, NULL, coalesce(o.updated_at, now()));
    ELSIF v_actual IS NULL AND v_abierta IS NOT NULL THEN
      UPDATE ordenes_calibracion_novedades SET resuelta_at = coalesce(o.updated_at, now()) WHERE id = v_abierta;
    END IF;
  END LOOP;

  PERFORM set_config('calibraciones.migrando_novedades', 'off', true);
END;
$$;
