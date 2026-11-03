-- ============================================================
-- Módulo "Biblioteca": documentos del SGC de Servicio Técnico (PDF).
--
--   - biblioteca_carpetas: Políticas de calidad, Instructivos, Formularios…
--     (el Admin las crea, renombra y borra; no se borra una con documentos).
--   - biblioteca_documentos: título + código (ej. PL.ST.01) dentro de una
--     carpeta.
--   - biblioteca_revisiones: el historial de cada documento. Cada revisión
--     es un PDF con su número, fecha de revisión y de aprobación, y un
--     estado: pendiente_aprobacion → vigente → obsoleta. Solo una vigente
--     por documento; las obsoletas solo las ve quien gestiona.
--
-- Los PDF viven en el bucket privado "biblioteca-sgc"; se ven y descargan
-- con createSignedUrl desde el frontend.
-- Fase 2 (no aquí): activos fijos con sus certificados de calibración.
-- ============================================================

-- ── Módulo y capability ─────────────────────────────────────────────────────

INSERT INTO modules (key) VALUES ('biblioteca') ON CONFLICT (key) DO NOTHING;

-- Todos los roles ven la biblioteca (se ajusta después en Admin → Roles).
INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'biblioteca' FROM roles r
ON CONFLICT DO NOTHING;

INSERT INTO capabilities (key) VALUES ('biblioteca_gestionar') ON CONFLICT (key) DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'biblioteca_gestionar' FROM roles r
WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

-- ── Tablas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS biblioteca_carpetas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL UNIQUE CHECK (btrim(nombre) <> ''),
  descripcion  text,
  orden        int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biblioteca_documentos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carpeta_id   uuid NOT NULL REFERENCES biblioteca_carpetas(id) ON DELETE RESTRICT,
  titulo       text NOT NULL CHECK (btrim(titulo) <> ''),
  codigo       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS biblioteca_documentos_carpeta_idx ON biblioteca_documentos (carpeta_id);
CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_documentos_codigo_unico
  ON biblioteca_documentos (upper(btrim(codigo))) WHERE codigo IS NOT NULL AND btrim(codigo) <> '';

CREATE TABLE IF NOT EXISTS biblioteca_revisiones (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id      uuid NOT NULL REFERENCES biblioteca_documentos(id) ON DELETE CASCADE,
  revision          text NOT NULL CHECK (btrim(revision) <> ''),
  fecha_revision    date,
  fecha_aprobacion  date,
  estado            text NOT NULL DEFAULT 'pendiente_aprobacion'
                    CHECK (estado IN ('vigente', 'pendiente_aprobacion', 'obsoleta')),
  storage_path      text NOT NULL,
  nombre_archivo    text,
  tamano_bytes      bigint,
  notas             text,
  subido_por        uuid DEFAULT auth.uid(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS biblioteca_revisiones_documento_idx ON biblioteca_revisiones (documento_id);
-- Una sola revisión vigente por documento.
CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_revisiones_una_vigente
  ON biblioteca_revisiones (documento_id) WHERE estado = 'vigente';

INSERT INTO biblioteca_carpetas (nombre, orden) VALUES
  ('Políticas de calidad', 1),
  ('Instructivos Colombia', 2),
  ('Formularios', 3),
  ('Procedimientos Colombia', 4),
  ('Caracterización de Procesos Colombia', 5)
ON CONFLICT (nombre) DO NOTHING;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE biblioteca_carpetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE biblioteca_revisiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biblioteca_carpetas select" ON biblioteca_carpetas;
CREATE POLICY "biblioteca_carpetas select" ON biblioteca_carpetas FOR SELECT TO authenticated
  USING (has_module('biblioteca'));
DROP POLICY IF EXISTS "biblioteca_carpetas write" ON biblioteca_carpetas;
CREATE POLICY "biblioteca_carpetas write" ON biblioteca_carpetas FOR ALL TO authenticated
  USING (has_module('biblioteca') AND has_capability('biblioteca_gestionar'))
  WITH CHECK (has_module('biblioteca') AND has_capability('biblioteca_gestionar'));

DROP POLICY IF EXISTS "biblioteca_documentos select" ON biblioteca_documentos;
CREATE POLICY "biblioteca_documentos select" ON biblioteca_documentos FOR SELECT TO authenticated
  USING (has_module('biblioteca'));
DROP POLICY IF EXISTS "biblioteca_documentos write" ON biblioteca_documentos;
CREATE POLICY "biblioteca_documentos write" ON biblioteca_documentos FOR ALL TO authenticated
  USING (has_module('biblioteca') AND has_capability('biblioteca_gestionar'))
  WITH CHECK (has_module('biblioteca') AND has_capability('biblioteca_gestionar'));

DROP POLICY IF EXISTS "biblioteca_revisiones select" ON biblioteca_revisiones;
CREATE POLICY "biblioteca_revisiones select" ON biblioteca_revisiones FOR SELECT TO authenticated
  USING (has_module('biblioteca') AND (estado <> 'obsoleta' OR has_capability('biblioteca_gestionar')));
DROP POLICY IF EXISTS "biblioteca_revisiones write" ON biblioteca_revisiones;
CREATE POLICY "biblioteca_revisiones write" ON biblioteca_revisiones FOR ALL TO authenticated
  USING (has_module('biblioteca') AND has_capability('biblioteca_gestionar'))
  WITH CHECK (has_module('biblioteca') AND has_capability('biblioteca_gestionar'));

-- ── Storage ──────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('biblioteca-sgc', 'biblioteca-sgc', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "biblioteca storage select" ON storage.objects;
CREATE POLICY "biblioteca storage select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'biblioteca-sgc' AND has_module('biblioteca'));

DROP POLICY IF EXISTS "biblioteca storage insert" ON storage.objects;
CREATE POLICY "biblioteca storage insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'biblioteca-sgc' AND has_module('biblioteca') AND has_capability('biblioteca_gestionar'));

DROP POLICY IF EXISTS "biblioteca storage delete" ON storage.objects;
CREATE POLICY "biblioteca storage delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'biblioteca-sgc' AND has_module('biblioteca') AND has_capability('biblioteca_gestionar'));

-- ── Aprobación de una revisión ──────────────────────────────────────────────
-- En una sola transacción: la vigente anterior del documento pasa a obsoleta
-- y esta queda vigente con su fecha de aprobación (nunca dos vigentes).

CREATE OR REPLACE FUNCTION aprobar_revision_biblioteca(_revision_id uuid, _fecha date)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_documento uuid;
BEGIN
  IF NOT (has_module('biblioteca') AND has_capability('biblioteca_gestionar')) THEN
    RAISE EXCEPTION 'Se requiere permiso para gestionar la biblioteca';
  END IF;

  SELECT documento_id INTO v_documento FROM biblioteca_revisiones WHERE id = _revision_id;
  IF v_documento IS NULL THEN
    RAISE EXCEPTION 'La revisión no existe';
  END IF;

  UPDATE biblioteca_revisiones SET estado = 'obsoleta'
  WHERE documento_id = v_documento AND estado = 'vigente' AND id <> _revision_id;

  UPDATE biblioteca_revisiones
  SET estado = 'vigente', fecha_aprobacion = coalesce(_fecha, current_date)
  WHERE id = _revision_id;

  UPDATE biblioteca_documentos SET updated_at = now() WHERE id = v_documento;
END;
$$;

REVOKE ALL ON FUNCTION aprobar_revision_biblioteca(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION aprobar_revision_biblioteca(uuid, date) TO authenticated;
