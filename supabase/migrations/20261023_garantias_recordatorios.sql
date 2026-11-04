-- ============================================================
-- Garantías: recordatorios por correo.
--
-- Los responsables de una garantía (y Admin) programan uno o varios
-- recordatorios con fecha/hora futura y una nota. Cada 5 minutos pg_cron
-- revisa si hay recordatorios vencidos sin enviar; si los hay, llama vía
-- pg_net a la Edge Function `garantias-recordatorios`, que envía el correo
-- a los responsables (Resend) y los marca como enviados.
--
-- Los pendientes se pueden cancelar (no se borran). Crear, cancelar y
-- enviar quedan en el historial de la garantía.
--
-- Requisitos manuales (una sola vez, fuera de esta migración — son
-- secretos): crear en Supabase Vault
--   garantias_recordatorios_url    → https://<proyecto>.supabase.co/functions/v1/garantias-recordatorios
--   garantias_recordatorios_secret → el mismo valor del secret CRON_SECRET de la función
-- p. ej. SELECT vault.create_secret('<valor>', 'garantias_recordatorios_url');
-- ============================================================

CREATE TABLE IF NOT EXISTS garantias_recordatorios (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  garantia_id    uuid NOT NULL REFERENCES garantias(id) ON DELETE CASCADE,
  fecha_hora     timestamptz NOT NULL,
  nota           text,
  creado_por     uuid REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  enviado_at     timestamptz,
  cancelado_at   timestamptz,
  cancelado_por  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  procesando_at  timestamptz, -- lo toma un envío en curso (evita duplicados)
  intentos       int NOT NULL DEFAULT 0,
  error          text
);

CREATE INDEX IF NOT EXISTS garantias_recordatorios_garantia_idx ON garantias_recordatorios(garantia_id);
CREATE INDEX IF NOT EXISTS garantias_recordatorios_pendientes_idx ON garantias_recordatorios(fecha_hora)
  WHERE enviado_at IS NULL AND cancelado_at IS NULL;

ALTER TABLE garantias_recordatorios ENABLE ROW LEVEL SECURITY;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Ver: misma visibilidad que la garantía. Crear: responsables de esa
-- garantía o Admin, solo a futuro y a su nombre. Sin UPDATE/DELETE directos:
-- cancelar va por la función cancelar_recordatorio_garantia().

CREATE POLICY "garantias_recordatorios select" ON garantias_recordatorios
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM garantias g WHERE g.id = garantia_id AND has_module('garantias') AND (
      has_capability('garantias_editar')
      OR has_capability('garantias_ver_todas')
      OR g.asesor_correo = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  ));

CREATE POLICY "garantias_recordatorios insert" ON garantias_recordatorios
  FOR INSERT TO authenticated
  WITH CHECK (
    has_module('garantias')
    AND creado_por = auth.uid()
    AND fecha_hora > now()
    AND enviado_at IS NULL AND cancelado_at IS NULL AND procesando_at IS NULL
    AND EXISTS (
      SELECT 1 FROM garantias g
      WHERE g.id = garantia_id AND NOT g.anulada
        AND (is_admin() OR auth.uid() = ANY(g.responsables))
    )
  );

CREATE OR REPLACE FUNCTION cancelar_recordatorio_garantia(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE garantias_recordatorios r
     SET cancelado_at = now(), cancelado_por = auth.uid()
   WHERE r.id = _id
     AND r.enviado_at IS NULL AND r.cancelado_at IS NULL
     AND EXISTS (
       SELECT 1 FROM garantias g
       WHERE g.id = r.garantia_id AND has_module('garantias')
         AND (is_admin() OR auth.uid() = ANY(g.responsables))
     );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se puede cancelar este recordatorio (ya se envió, ya estaba cancelado o no eres responsable).';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION cancelar_recordatorio_garantia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION cancelar_recordatorio_garantia(uuid) TO authenticated;

-- ── Historial ────────────────────────────────────────────────────────────────
-- El valor se guarda ya legible (hora de Colombia) para el sidebar.

CREATE OR REPLACE FUNCTION log_garantias_recordatorio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_texto text := to_char(NEW.fecha_hora AT TIME ZONE 'America/Bogota', 'DD/MM/YYYY HH24:MI')
                  || COALESCE(' — ' || NULLIF(trim(NEW.nota), ''), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_nuevo, created_at)
    VALUES (NEW.garantia_id, NEW.creado_por, 'recordatorio', v_texto, NEW.created_at);
  ELSIF NEW.cancelado_at IS NOT NULL AND OLD.cancelado_at IS NULL THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior)
    VALUES (NEW.garantia_id, NEW.cancelado_por, 'recordatorio_cancelado', v_texto);
  ELSIF NEW.enviado_at IS NOT NULL AND OLD.enviado_at IS NULL THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_nuevo)
    VALUES (NEW.garantia_id, NULL, 'recordatorio_enviado', v_texto);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_garantias_recordatorio ON garantias_recordatorios;
CREATE TRIGGER trg_log_garantias_recordatorio
  AFTER INSERT OR UPDATE ON garantias_recordatorios
  FOR EACH ROW EXECUTE FUNCTION log_garantias_recordatorio();

-- ── Envío ────────────────────────────────────────────────────────────────────
-- La Edge Function (service_role) toma los vencidos con esta función: los
-- marca "procesando" en la misma sentencia para que dos ejecuciones que se
-- crucen no envíen dos veces. Un envío que quedó colgado más de 10 minutos
-- se vuelve a tomar. Máximo 5 intentos por recordatorio.

CREATE OR REPLACE FUNCTION garantias_recordatorios_tomar()
RETURNS SETOF garantias_recordatorios
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE garantias_recordatorios r
     SET procesando_at = now()
   WHERE r.id IN (
     SELECT id FROM garantias_recordatorios
      WHERE enviado_at IS NULL AND cancelado_at IS NULL
        AND fecha_hora <= now() AND intentos < 5
        AND (procesando_at IS NULL OR procesando_at < now() - interval '10 minutes')
      ORDER BY fecha_hora
      LIMIT 50
      FOR UPDATE SKIP LOCKED
   )
  RETURNING r.*;
$$;

REVOKE ALL ON FUNCTION garantias_recordatorios_tomar() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION garantias_recordatorios_tomar() TO service_role;

-- Llamada desde pg_cron: solo invoca la Edge Function si hay algo vencido.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION garantias_disparar_recordatorios()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM garantias_recordatorios
     WHERE enviado_at IS NULL AND cancelado_at IS NULL
       AND fecha_hora <= now() AND intentos < 5
  ) THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'garantias_recordatorios_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'garantias_recordatorios_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RAISE WARNING 'Faltan los secretos de Vault garantias_recordatorios_url / garantias_recordatorios_secret';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body    := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION garantias_disparar_recordatorios() FROM PUBLIC, anon, authenticated;

-- ── Programación (cada 5 minutos) ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'garantias-recordatorios';

SELECT cron.schedule(
  'garantias-recordatorios',
  '*/5 * * * *',
  $$SELECT garantias_disparar_recordatorios();$$
);
