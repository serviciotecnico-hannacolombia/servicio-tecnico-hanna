-- ============================================================
-- Biblioteca: editores por persona.
--
-- Además de la capability biblioteca_gestionar (por rol, Admin), el Admin
-- puede elegir usuarios puntuales que gestionan la biblioteca: crear,
-- editar y borrar carpetas y documentos, subir revisiones y aprobarlas.
-- La lista de editores solo la modifica el Admin.
-- ============================================================

CREATE TABLE IF NOT EXISTS biblioteca_editores (
  user_id     uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  agregado_por uuid DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE biblioteca_editores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biblioteca_editores select" ON biblioteca_editores;
CREATE POLICY "biblioteca_editores select" ON biblioteca_editores FOR SELECT TO authenticated
  USING (has_module('biblioteca'));
DROP POLICY IF EXISTS "biblioteca_editores write" ON biblioteca_editores;
CREATE POLICY "biblioteca_editores write" ON biblioteca_editores FOR ALL TO authenticated
  USING (has_module('admin'))
  WITH CHECK (has_module('admin'));

-- Quién gestiona: la capability (por rol) o estar en la lista de editores.
CREATE OR REPLACE FUNCTION puede_gestionar_biblioteca() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_module('biblioteca') AND (
    has_capability('biblioteca_gestionar')
    OR EXISTS (SELECT 1 FROM biblioteca_editores e WHERE e.user_id = auth.uid())
  )
$$;
REVOKE ALL ON FUNCTION puede_gestionar_biblioteca() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION puede_gestionar_biblioteca() TO authenticated;

-- ── Las políticas de escritura pasan a usar puede_gestionar_biblioteca() ───

DROP POLICY IF EXISTS "biblioteca_carpetas write" ON biblioteca_carpetas;
CREATE POLICY "biblioteca_carpetas write" ON biblioteca_carpetas FOR ALL TO authenticated
  USING (puede_gestionar_biblioteca()) WITH CHECK (puede_gestionar_biblioteca());

DROP POLICY IF EXISTS "biblioteca_documentos write" ON biblioteca_documentos;
CREATE POLICY "biblioteca_documentos write" ON biblioteca_documentos FOR ALL TO authenticated
  USING (puede_gestionar_biblioteca()) WITH CHECK (puede_gestionar_biblioteca());

DROP POLICY IF EXISTS "biblioteca_revisiones select" ON biblioteca_revisiones;
CREATE POLICY "biblioteca_revisiones select" ON biblioteca_revisiones FOR SELECT TO authenticated
  USING (has_module('biblioteca') AND (estado <> 'obsoleta' OR puede_gestionar_biblioteca()));
DROP POLICY IF EXISTS "biblioteca_revisiones write" ON biblioteca_revisiones;
CREATE POLICY "biblioteca_revisiones write" ON biblioteca_revisiones FOR ALL TO authenticated
  USING (puede_gestionar_biblioteca()) WITH CHECK (puede_gestionar_biblioteca());

DROP POLICY IF EXISTS "biblioteca storage insert" ON storage.objects;
CREATE POLICY "biblioteca storage insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'biblioteca-sgc' AND puede_gestionar_biblioteca());

DROP POLICY IF EXISTS "biblioteca storage delete" ON storage.objects;
CREATE POLICY "biblioteca storage delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'biblioteca-sgc' AND puede_gestionar_biblioteca());

CREATE OR REPLACE FUNCTION aprobar_revision_biblioteca(_revision_id uuid, _fecha date)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_documento uuid;
BEGIN
  IF NOT puede_gestionar_biblioteca() THEN
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
