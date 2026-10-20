-- ============================================================
-- Borrar usuarios fallaba ("Database error deleting user"): al eliminar en
-- auth.users se borra en cascada el perfil, pero gestion_mantenimientos y
-- mantenimiento_consultas lo referenciaban con NOT NULL y sin ON DELETE.
--
-- Igual que el resto de tablas: ON DELETE SET NULL. El histórico conserva
-- quién fue gracias a creado_por_nombre / usuario_nombre (+ usuario_email).
-- ============================================================

ALTER TABLE public.gestion_mantenimientos
  ALTER COLUMN creado_por DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS gestion_mantenimientos_creado_por_fkey,
  ADD CONSTRAINT gestion_mantenimientos_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.mantenimiento_consultas
  ALTER COLUMN usuario_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS mantenimiento_consultas_usuario_id_fkey,
  ADD CONSTRAINT mantenimiento_consultas_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Verificación: FKs a profiles/auth.users que aún bloquean el borrado (debería devolver 0 filas):
--   SELECT conrelid::regclass, conname FROM pg_constraint
--   WHERE contype = 'f' AND confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
--     AND confdeltype = 'a';
