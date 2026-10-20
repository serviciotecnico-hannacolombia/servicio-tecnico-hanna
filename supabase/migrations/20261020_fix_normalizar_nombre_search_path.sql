-- ============================================================
-- HOTFIX: login roto (500 en /auth/v1/token) tras 20261019b_normalizar_nombres.
--
-- Al iniciar sesión / refrescar el token, GoTrue actualiza auth.users →
-- handle_user_update() actualiza profiles.full_name → dispara
-- trg_profiles_normalizar_nombre, que llamaba a normalizar_nombre() sin
-- esquema. El rol de Auth corre con search_path = auth, así que la función
-- no se encontraba y la transacción del login fallaba.
--
-- Se califica todo con public. y se fija search_path en las funciones.
-- ============================================================

CREATE OR REPLACE FUNCTION public.normalizar_nombre(n text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN n IS NULL OR btrim(n) = '' THEN n
    ELSE initcap(lower(regexp_replace(btrim(n), '\s+', ' ', 'g')))
  END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_normalizar_nombre() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.full_name := public.normalizar_nombre(NEW.full_name);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  update public.profiles
  set full_name = coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  where id = new.id;
  return new;
end;
$$;
