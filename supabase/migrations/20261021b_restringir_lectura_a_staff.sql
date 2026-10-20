-- ============================================================
-- Endurecimiento previo a la extranet de clientes (paso 1, parte B).
-- profiles, roles, modules, capabilities, role_modules y role_capabilities
-- tenían SELECT USING (true): cualquier usuario autenticado — incluido un
-- futuro cliente sin rol — podía leer a todo el equipo (correo, nombre,
-- rol) y los uuid de los roles. Ahora solo lo lee el personal interno; cada
-- usuario sigue pudiendo leer su propio perfil.
-- ============================================================

-- Personal interno = perfil activo con un rol asignado (mismo criterio que
-- has_module/has_capability, que devuelven false sin rol). SECURITY DEFINER
-- para no recursar en la propia RLS de profiles.
CREATE OR REPLACE FUNCTION public.es_staff() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.activo AND p.role_id IS NOT NULL
  );
$$;
REVOKE ALL ON FUNCTION public.es_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_staff() TO authenticated;

DROP POLICY IF EXISTS "profiles select" ON profiles;
CREATE POLICY "profiles select" ON profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.es_staff());

DROP POLICY IF EXISTS "roles select" ON roles;
CREATE POLICY "roles select" ON roles
  FOR SELECT TO authenticated USING (public.es_staff());

DROP POLICY IF EXISTS "modules select" ON modules;
CREATE POLICY "modules select" ON modules
  FOR SELECT TO authenticated USING (public.es_staff());

DROP POLICY IF EXISTS "capabilities select" ON capabilities;
CREATE POLICY "capabilities select" ON capabilities
  FOR SELECT TO authenticated USING (public.es_staff());

DROP POLICY IF EXISTS "role_modules select" ON role_modules;
CREATE POLICY "role_modules select" ON role_modules
  FOR SELECT TO authenticated USING (public.es_staff());

DROP POLICY IF EXISTS "role_capabilities select" ON role_capabilities;
CREATE POLICY "role_capabilities select" ON role_capabilities
  FOR SELECT TO authenticated USING (public.es_staff());
