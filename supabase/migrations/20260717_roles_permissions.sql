-- ============================================================
-- Roles dinámicos, módulos y capacidades sensibles
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modules (
  key text PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS capabilities (
  key text PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS role_modules (
  role_id    uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  module_key text NOT NULL REFERENCES modules(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, module_key)
);

CREATE TABLE IF NOT EXISTS role_capabilities (
  role_id        uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  capability_key text NOT NULL REFERENCES capabilities(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, capability_key)
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id);

-- ── Seed: módulos y capacidades ─────────────────────────────────────────────

INSERT INTO modules (key) VALUES
  ('llamadas'), ('bodega'), ('consumibles'), ('tarifas'), ('codigos'),
  ('editor'), ('indicadores'), ('correos'), ('admin')
ON CONFLICT (key) DO NOTHING;

INSERT INTO capabilities (key) VALUES
  ('importar_csv_tarifas'), ('importar_csv_codigos'), ('importar_csv_llamadas'),
  ('bodega_registrar_ingreso'), ('editar_codigos'), ('gestion_codigos'), ('bodega_eliminar')
ON CONFLICT (key) DO NOTHING;

-- ── Seed: 6 roles semilla ────────────────────────────────────────────────────

INSERT INTO roles (name) VALUES
  ('Servicio Técnico'), ('Logística'), ('Ventas'), ('Aplicaciones'), ('Líderes'), ('Admin')
ON CONFLICT (name) DO NOTHING;

-- ── Seed: matriz de módulos por rol ──────────────────────────────────────────

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, m.key FROM roles r, modules m WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, m.key FROM roles r, modules m WHERE r.name = 'Líderes'
ON CONFLICT DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, m.key FROM roles r, modules m
WHERE r.name = 'Servicio Técnico'
  AND m.key IN ('llamadas','bodega','consumibles','tarifas','codigos','editor','indicadores','correos')
ON CONFLICT DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, m.key FROM roles r, modules m
WHERE r.name = 'Logística' AND m.key IN ('tarifas','codigos')
ON CONFLICT DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, m.key FROM roles r, modules m
WHERE r.name = 'Ventas' AND m.key IN ('bodega','tarifas','codigos')
ON CONFLICT DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, m.key FROM roles r, modules m
WHERE r.name = 'Aplicaciones' AND m.key IN ('tarifas','codigos','editor')
ON CONFLICT DO NOTHING;

-- ── Seed: capacidades sensibles por rol ──────────────────────────────────────

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, c.key FROM roles r, capabilities c
WHERE r.name IN ('Líderes','Admin')
  AND c.key IN ('importar_csv_tarifas','importar_csv_codigos','importar_csv_llamadas',
                'editar_codigos','gestion_codigos','bodega_eliminar','bodega_registrar_ingreso')
ON CONFLICT DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'bodega_registrar_ingreso' FROM roles r WHERE r.name = 'Servicio Técnico'
ON CONFLICT DO NOTHING;

-- ── Backfill y corte de la columna vieja ─────────────────────────────────────

UPDATE profiles SET role_id = (SELECT id FROM roles WHERE name = 'Admin') WHERE role = 'admin';
-- role = 'user': se deja role_id NULL a propósito (sin mapeo confiable a un rol
-- de negocio). Un Admin debe reasignar manualmente desde Administración apenas
-- se despliegue, o esos perfiles quedan sin acceso a ningún módulo.

ALTER TABLE profiles DROP COLUMN role;

-- ── Funciones helper para RLS ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION has_module(_module_key text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN role_modules rm ON rm.role_id = p.role_id
    WHERE p.id = auth.uid() AND rm.module_key = _module_key AND p.activo
  );
$$;

CREATE OR REPLACE FUNCTION has_capability(_capability_key text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN role_capabilities rc ON rc.role_id = p.role_id
    WHERE p.id = auth.uid() AND rc.capability_key = _capability_key AND p.activo
  );
$$;

CREATE OR REPLACE FUNCTION has_any_capability(_keys text[]) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN role_capabilities rc ON rc.role_id = p.role_id
    WHERE p.id = auth.uid() AND rc.capability_key = ANY(_keys) AND p.activo
  );
$$;

GRANT EXECUTE ON FUNCTION has_module(text)      TO authenticated;
GRANT EXECUTE ON FUNCTION has_capability(text)  TO authenticated;
GRANT EXECUTE ON FUNCTION has_any_capability(text[]) TO authenticated;

-- is_admin() ya existía (usada por la política admin_update_profiles) — se
-- redefine para delegar en has_module, así esa política no necesita cambiar.
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT public.has_module('admin');
$$;

-- protect_profile_role() ya existía y protegía role/activo contra
-- auto-escalada; se redefine para proteger role_id/activo.
CREATE OR REPLACE FUNCTION protect_profile_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  if not public.is_admin() then
    new.role_id := old.role_id;
    new.activo  := old.activo;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE TRIGGER protect_profile_role_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_role();

-- handle_new_user() creaba el perfil leyendo user_metadata.role (texto
-- 'admin'/'user'); ahora lee user_metadata.role_id (uuid). Sin rol
-- explícito, el perfil queda sin rol asignado (sin acceso a ningún módulo)
-- hasta que un Admin se lo asigne.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  insert into public.profiles (id, email, full_name, role_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data->>'role_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
