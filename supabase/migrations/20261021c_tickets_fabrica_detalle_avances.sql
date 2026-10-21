-- ============================================================
-- Tickets a Fábrica: vista de detalle por ticket.
-- - OTST relacionada (link a la intranet, igual que Calibraciones).
-- - Bitácora de avances: quién registró qué y a qué hora. Reemplaza el
--   texto único "nota_estado", que se sobrescribía y perdía el seguimiento
--   con fábrica. Los cambios de estado y OTST se registran solos.
-- - ultimo_avance / ultimo_avance_at en el ticket para que la lista muestre
--   el último movimiento sin traer la bitácora completa.
-- ============================================================

ALTER TABLE tickets_fabrica
  ADD COLUMN IF NOT EXISTS otst             text,
  ADD COLUMN IF NOT EXISTS ultimo_avance    text,
  ADD COLUMN IF NOT EXISTS ultimo_avance_at timestamptz;

CREATE TABLE IF NOT EXISTS tickets_fabrica_avances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       uuid NOT NULL REFERENCES tickets_fabrica(id) ON DELETE CASCADE,
  usuario_id      uuid REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  tipo            text NOT NULL DEFAULT 'avance' CHECK (tipo IN ('avance', 'estado', 'otst', 'nombre', 'origen')),
  texto           text,           -- tipo 'avance': lo que escribió el usuario
  valor_anterior  text,           -- tipos 'estado' / 'otst' / 'nombre' (TID) / 'origen'
  valor_nuevo     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tickets_fabrica_avances_ticket_idx
  ON tickets_fabrica_avances(ticket_id, created_at);

ALTER TABLE tickets_fabrica_avances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_fabrica_avances select" ON tickets_fabrica_avances
  FOR SELECT TO authenticated USING (has_module('tickets'));

-- A mano solo se escriben avances propios; los de estado/OTST los crea el
-- trigger (SECURITY DEFINER). Sin UPDATE/DELETE: la bitácora es inmutable y
-- solo cae en cascada si se elimina el ticket.
CREATE POLICY "tickets_fabrica_avances insert" ON tickets_fabrica_avances
  FOR INSERT TO authenticated
  WITH CHECK (has_module('tickets') AND tipo = 'avance' AND usuario_id = auth.uid());

-- ── Etiqueta legible del estado (para el resumen de "último avance") ────────

CREATE OR REPLACE FUNCTION ticket_fabrica_estado_label(_estado text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _estado
    WHEN 'exportacion_garantia' THEN 'Exportación/garantía'
    WHEN 'consulta_resuelta'    THEN 'Consulta resuelta'
    WHEN 'pendiente_feedback'   THEN 'Pendiente feedback'
    WHEN 'exportacion'          THEN 'Exportación'
    WHEN 'denegada_garantia'    THEN 'Denegada garantía'
    WHEN 'en_espera'            THEN 'En espera'
    WHEN 'cambio_garantia'      THEN 'Cambio garantía'
    WHEN 'boletin_tecnico'      THEN 'Boletín Técnico'
    ELSE coalesce(_estado, 'Sin estado')
  END;
$$;

CREATE OR REPLACE FUNCTION ticket_fabrica_origen_label(_origen text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _origen
    WHEN 'control_calidad' THEN 'Control de Calidad'
    WHEN 'orden_trabajo'   THEN 'Orden de Trabajo'
    ELSE coalesce(_origen, 'Sin origen')
  END;
$$;

-- ── Cada avance actualiza el resumen del ticket ─────────────────────────────
-- Solo si es el más reciente: el backfill inserta avances con fechas viejas.

CREATE OR REPLACE FUNCTION tickets_fabrica_avance_resumen() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _resumen text;
BEGIN
  _resumen := CASE NEW.tipo
    WHEN 'estado' THEN 'Estado: ' || ticket_fabrica_estado_label(NEW.valor_anterior) || ' → ' || ticket_fabrica_estado_label(NEW.valor_nuevo)
    WHEN 'otst'   THEN 'OTST: ' || coalesce(nullif(NEW.valor_nuevo, ''), 'sin OTST')
    WHEN 'nombre' THEN 'Ticket: ' || coalesce(NEW.valor_anterior, '—') || ' → ' || coalesce(NEW.valor_nuevo, '—')
    WHEN 'origen' THEN 'Origen: ' || ticket_fabrica_origen_label(NEW.valor_anterior) || ' → ' || ticket_fabrica_origen_label(NEW.valor_nuevo)
    ELSE NEW.texto
  END;

  UPDATE tickets_fabrica
     SET ultimo_avance = _resumen, ultimo_avance_at = NEW.created_at
   WHERE id = NEW.ticket_id
     AND (ultimo_avance_at IS NULL OR ultimo_avance_at <= NEW.created_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_fabrica_avance_resumen ON tickets_fabrica_avances;
CREATE TRIGGER tickets_fabrica_avance_resumen
  AFTER INSERT ON tickets_fabrica_avances
  FOR EACH ROW EXECUTE FUNCTION tickets_fabrica_avance_resumen();

-- ── Cambios de TID / origen / estado / OTST quedan en la bitácora ───────────

CREATE OR REPLACE FUNCTION tickets_fabrica_log_cambios() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.nombre IS DISTINCT FROM OLD.nombre THEN
    INSERT INTO tickets_fabrica_avances (ticket_id, usuario_id, tipo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'nombre', OLD.nombre, NEW.nombre);
  END IF;
  IF NEW.origen IS DISTINCT FROM OLD.origen THEN
    INSERT INTO tickets_fabrica_avances (ticket_id, usuario_id, tipo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'origen', OLD.origen, NEW.origen);
  END IF;
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO tickets_fabrica_avances (ticket_id, usuario_id, tipo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'estado', OLD.estado, NEW.estado);
  END IF;
  IF coalesce(NEW.otst, '') IS DISTINCT FROM coalesce(OLD.otst, '') THEN
    INSERT INTO tickets_fabrica_avances (ticket_id, usuario_id, tipo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'otst', OLD.otst, NEW.otst);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_fabrica_log_cambios ON tickets_fabrica;
CREATE TRIGGER tickets_fabrica_log_cambios
  AFTER UPDATE OF nombre, origen, estado, otst ON tickets_fabrica
  FOR EACH ROW EXECUTE FUNCTION tickets_fabrica_log_cambios();

-- ── El detalle inicial (nota_estado) se vuelve el primer avance ─────────────
-- Así el formulario de creación y el importador de Excel siguen enviando
-- nota_estado sin cambios, y el texto queda en la bitácora con su autor/fecha.

CREATE OR REPLACE FUNCTION tickets_fabrica_nota_inicial() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF nullif(trim(NEW.nota_estado), '') IS NOT NULL THEN
    INSERT INTO tickets_fabrica_avances (ticket_id, usuario_id, tipo, texto, created_at)
    VALUES (NEW.id, NEW.creado_por, 'avance', trim(NEW.nota_estado), NEW.created_at);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_fabrica_nota_inicial ON tickets_fabrica;
CREATE TRIGGER tickets_fabrica_nota_inicial
  AFTER INSERT ON tickets_fabrica
  FOR EACH ROW EXECUTE FUNCTION tickets_fabrica_nota_inicial();

-- ── Backfill: nota_estado existente → primer avance ─────────────────────────

INSERT INTO tickets_fabrica_avances (ticket_id, usuario_id, tipo, texto, created_at)
SELECT t.id, t.creado_por, 'avance', trim(t.nota_estado), t.created_at
FROM tickets_fabrica t
WHERE nullif(trim(t.nota_estado), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM tickets_fabrica_avances a WHERE a.ticket_id = t.id);
