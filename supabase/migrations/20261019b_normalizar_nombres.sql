-- ============================================================
-- Normaliza los nombres de los usuarios: nada de TODO MAYÚSCULAS.
-- Cada palabra con mayúscula inicial ("MATEO CAMILO VILLARRAGA" →
-- "Mateo Camilo Villarraga"; también "De", "Del", "La"...).
--
-- 1. normalizar_nombre(): la regla, en un solo lugar.
-- 2. Trigger en profiles: todo full_name que entre (alta por Admin,
--    auto-registro, edición del perfil, sincronización desde auth) queda
--    normalizado — sin depender del frontend ni de las edge functions.
-- 3. Histórico: varios módulos guardan el NOMBRE como texto (quién marcó la
--    llamada, quién movió la OTST…). Llamadas cruza por nombre en la
--    Carrera y el Seguimiento ejecutivo, así que donde el texto sea
--    EXACTAMENTE el nombre viejo de un perfil se reemplaza por el nuevo.
-- 4. auth.users.raw_user_meta_data.full_name también se normaliza: si no,
--    handle_user_update() lo volvería a copiar a profiles en cada login
--    (el trigger lo normalizaría igual, pero así quedan consistentes).
-- ============================================================

CREATE OR REPLACE FUNCTION normalizar_nombre(n text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN n IS NULL OR btrim(n) = '' THEN n
    ELSE initcap(lower(regexp_replace(btrim(n), '\s+', ' ', 'g')))
  END;
$$;

CREATE OR REPLACE FUNCTION profiles_normalizar_nombre() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.full_name := normalizar_nombre(NEW.full_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_normalizar_nombre ON profiles;
CREATE TRIGGER trg_profiles_normalizar_nombre
  BEFORE INSERT OR UPDATE OF full_name ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_normalizar_nombre();

-- ── Histórico ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  col record;
  n   integer;
BEGIN
  CREATE TEMP TABLE _nombres_cambio ON COMMIT DROP AS
    SELECT DISTINCT full_name AS viejo, normalizar_nombre(full_name) AS nuevo
    FROM profiles
    WHERE full_name IS NOT NULL AND full_name IS DISTINCT FROM normalizar_nombre(full_name);

  -- Columnas de texto que guardan el nombre de quien hizo algo: usuario,
  -- *_por (solicitado_por, completado_por, actualizado_por…), *_nombre de
  -- usuario (usuario_nombre, creado_por_nombre) y responsable*. Solo se
  -- reemplazan coincidencias exactas con el nombre viejo de un perfil.
  FOR col IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.data_type = 'text'
      AND c.table_name <> 'profiles'
      AND (
        c.column_name = 'usuario'
        OR c.column_name = 'usuario_nombre'
        OR c.column_name LIKE '%\_por'
        OR c.column_name LIKE '%\_por\_nombre'
        OR c.column_name LIKE 'responsable%'
      )
  LOOP
    EXECUTE format(
      'UPDATE public.%I t SET %I = m.nuevo FROM _nombres_cambio m WHERE t.%I = m.viejo',
      col.table_name, col.column_name, col.column_name
    );
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'normalizar_nombres: %.% → % filas', col.table_name, col.column_name, n;
  END LOOP;

  -- Perfiles (el trigger aplicaría normalizar_nombre de todas formas).
  UPDATE profiles p SET full_name = m.nuevo
  FROM _nombres_cambio m WHERE p.full_name = m.viejo;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'normalizar_nombres: profiles → % perfiles', n;

  -- Metadata de auth, para que handle_user_update() copie ya el nombre nuevo.
  UPDATE auth.users u
  SET raw_user_meta_data = jsonb_set(u.raw_user_meta_data, '{full_name}', to_jsonb(normalizar_nombre(u.raw_user_meta_data->>'full_name')))
  WHERE u.raw_user_meta_data ? 'full_name'
    AND (u.raw_user_meta_data->>'full_name') IS DISTINCT FROM normalizar_nombre(u.raw_user_meta_data->>'full_name');
END;
$$;

-- Verificación después de aplicar (debería devolver 0 filas):
--   SELECT full_name FROM profiles WHERE full_name = upper(full_name) AND full_name ~ '[[:alpha:]]';
