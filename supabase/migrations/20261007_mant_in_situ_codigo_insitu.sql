-- ============================================================
-- Mant. In Situ: el código de mantenimiento IN SITU de cada equipo pasa a
-- vivir en codigos_inet.codigo_mantenimiento_insitu (junto al código
-- normal), alimentado solo desde Mant. In Situ.
--
-- Un equipo tiene un código normal (ej. MANTCHECKER.01, precio fijo) y uno
-- in situ (ej. MANTCHECKER.02, precio variable). mant_in_situ_codigos es
-- el catálogo de códigos IN SITU: se sembró (20261006) con los 18 códigos
-- del HTML original y se renombran desde Configuración → Precios base;
-- el ON UPDATE CASCADE propaga el nombre nuevo a todas las referencias.
-- ============================================================

-- 1. Columna nueva. Borrar un código in situ deja sus referencias sin
--    asignar (pendientes) en vez de impedir el borrado.
ALTER TABLE codigos_inet
  ADD COLUMN IF NOT EXISTS codigo_mantenimiento_insitu text
    REFERENCES mant_in_situ_codigos(codigo) ON UPDATE CASCADE ON DELETE SET NULL;

-- 2. Backfill con la asignación que tenía el HTML: la excepción de código
--    de Mant. In Situ si existía, si no el código normal cuando es uno de
--    los códigos sembrados.
UPDATE codigos_inet ci
SET codigo_mantenimiento_insitu = COALESCE(
  (SELECT e.codigo_mantenimiento FROM mant_in_situ_equipos e WHERE TRIM(e.referencia) = TRIM(ci.codigo)),
  (SELECT c.codigo FROM mant_in_situ_codigos c WHERE c.codigo = TRIM(ci.codigo_mantenimiento))
)
WHERE ci.codigo_mantenimiento_insitu IS NULL;

-- 3. El código ya no es una excepción de Mant. In Situ: se quita la columna
--    y se borran las excepciones que quedaron sin ningún valor propio.
ALTER TABLE mant_in_situ_equipos DROP COLUMN IF EXISTS codigo_mantenimiento;

DELETE FROM mant_in_situ_equipos
WHERE horas IS NULL AND precio IS NULL AND descripcion_servicio IS NULL;

-- 4. Asignación desde Mant. In Situ. La escritura general de codigos_inet
--    sigue siendo del módulo Códigos; esta función solo toca la columna in
--    situ y exige la capability del módulo.
CREATE OR REPLACE FUNCTION mant_in_situ_asignar_codigo(p_referencias text[], p_codigo text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_filas integer;
BEGIN
  IF NOT (has_module('mant_in_situ') AND has_capability('mant_in_situ_editar')) THEN
    RAISE EXCEPTION 'Se requiere permiso para configurar Mant. In Situ';
  END IF;
  IF p_codigo IS NOT NULL AND NOT EXISTS (SELECT 1 FROM mant_in_situ_codigos WHERE codigo = p_codigo) THEN
    RAISE EXCEPTION 'El código in situ % no existe', p_codigo;
  END IF;

  UPDATE codigos_inet
  SET codigo_mantenimiento_insitu = p_codigo
  WHERE codigo = ANY(p_referencias)
    AND codigo_mantenimiento_insitu IS DISTINCT FROM p_codigo;
  GET DIAGNOSTICS v_filas = ROW_COUNT;
  RETURN v_filas;
END;
$$;

REVOKE ALL ON FUNCTION mant_in_situ_asignar_codigo(text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mant_in_situ_asignar_codigo(text[], text) TO authenticated;
