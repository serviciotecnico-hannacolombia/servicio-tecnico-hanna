-- ============================================================
-- Endurecimiento previo a la extranet de clientes (paso 1, parte A).
-- Cierra tres cosas que hoy puede explotar cualquier usuario autenticado
-- (incluso uno sin rol) aunque la interfaz no se lo muestre:
--   1. cerrar_dia_llamadas() ejecutable por cualquiera.
--   2. profiles.email editable por el propio usuario (las políticas de
--      calibraciones/garantías comparan ese correo con asesor_correo).
--   3. role_id tomado de user_metadata (el usuario puede fijarlo si el
--      registro directo de Supabase Auth está habilitado).
-- ============================================================

-- 1. Solo la invoca pg_cron (corre como postgres, que conserva el permiso);
--    el frontend nunca la llama. SECURITY DEFINER sin comprobación + EXECUTE
--    abierto permitía a cualquiera archivar y borrar llamadas_diario.
REVOKE EXECUTE ON FUNCTION public.cerrar_dia_llamadas() FROM PUBLIC, anon, authenticated;

-- 2. email se protege igual que role_id/activo/es_ejecutivo: solo un admin
--    puede cambiarlo. Ningún flujo del frontend modifica profiles.email.
--    Nota: igual que con role_id, una edición manual desde el SQL Editor
--    (sin auth.uid()) también se revierte; para corregir un correo hay que
--    hacerlo con un usuario admin o deshabilitando el trigger a propósito.
CREATE OR REPLACE FUNCTION protect_profile_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  if not public.is_admin() then
    new.role_id      := old.role_id;
    new.activo       := old.activo;
    new.es_ejecutivo := old.es_ejecutivo;
    new.email        := old.email;
  end if;
  return new;
end;
$$;

-- 3. El rol inicial se lee SOLO de raw_app_meta_data (únicamente escribible
--    con service role, desde las Edge Functions self-signup y manage-users).
--    raw_user_meta_data es editable por el propio usuario, así que ya no se
--    confía en él para el rol. Un alta sin app_metadata.role_id queda sin
--    rol (sin acceso a ningún módulo) hasta que un Admin lo asigne.
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  insert into public.profiles (id, email, full_name, role_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    nullif(new.raw_app_meta_data->>'role_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
