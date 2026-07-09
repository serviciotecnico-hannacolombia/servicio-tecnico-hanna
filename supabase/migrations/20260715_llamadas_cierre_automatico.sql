-- ============================================================
-- Control de Llamadas: cierre automático del día
-- L-J a las 17:00 hora Colombia (22:00 UTC), V a las 16:00 (21:00 UTC)
-- ============================================================

-- 1. Registro de cierres (queda constancia aunque el día no tenga llamadas)
CREATE TABLE IF NOT EXISTS llamadas_cierres (
  fecha                 date PRIMARY KEY,
  total_llamadas        int NOT NULL DEFAULT 0,
  marcadas_no_llamado   int NOT NULL DEFAULT 0,
  tipo                  text NOT NULL DEFAULT 'automatico' CHECK (tipo IN ('automatico','manual')),
  cerrado_en            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE llamadas_cierres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read llamadas_cierres"
  ON llamadas_cierres FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all llamadas_cierres"
  ON llamadas_cierres FOR ALL TO authenticated USING (true);

-- 2. Función que replica "marcar vacíos + archivar día" y deja registro,
--    incluso si ese día no se cargó ninguna OTST (total_llamadas = 0).
CREATE OR REPLACE FUNCTION cerrar_dia_llamadas() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fecha     date := (now() AT TIME ZONE 'UTC')::date;
  v_marcadas  int;
  v_total     int;
BEGIN
  -- evita cerrar dos veces el mismo día si el cron se disparara de nuevo
  IF EXISTS (SELECT 1 FROM llamadas_cierres WHERE fecha = v_fecha) THEN
    RETURN;
  END IF;

  UPDATE llamadas_diario
    SET estado = 'NO LLAMADO',
        usuario = 'Sistema (auto-cierre)',
        hora = to_char(now() AT TIME ZONE 'America/Bogota', 'HH24:MI'),
        updated_at = now()
    WHERE fecha_dia = v_fecha AND estado = '';
  GET DIAGNOSTICS v_marcadas = ROW_COUNT;

  SELECT count(*) INTO v_total FROM llamadas_diario WHERE fecha_dia = v_fecha;

  INSERT INTO llamadas_historico (otst, cliente, ingeniero, garantia, estado, hora, usuario, fecha_dia, archivado_at)
    SELECT otst, cliente, ingeniero, garantia, estado, hora, usuario, fecha_dia, now()
    FROM llamadas_diario
    WHERE fecha_dia = v_fecha;

  DELETE FROM llamadas_diario WHERE fecha_dia = v_fecha;

  INSERT INTO llamadas_cierres (fecha, total_llamadas, marcadas_no_llamado, tipo, cerrado_en)
    VALUES (v_fecha, v_total, v_marcadas, 'automatico', now());
END;
$$;

-- 3. Programación (requiere la extensión pg_cron habilitada en el proyecto:
--    Supabase Dashboard → Database → Extensions → pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cierre-llamadas-lun-jue';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cierre-llamadas-viernes';

SELECT cron.schedule(
  'cierre-llamadas-lun-jue',
  '0 22 * * 1-4',
  $$SELECT cerrar_dia_llamadas();$$
);

SELECT cron.schedule(
  'cierre-llamadas-viernes',
  '0 21 * * 5',
  $$SELECT cerrar_dia_llamadas();$$
);
