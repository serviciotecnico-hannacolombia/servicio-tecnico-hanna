-- ============================================================
-- Igual que 20261020b: las tablas de Gestión in situ (20261104b..k)
-- referenciaban profiles/auth.users sin ON DELETE, lo que vuelve a romper
-- el borrado de usuarios ("Database error deleting user").
--
-- - Registros de negocio e historiales: ON DELETE SET NULL (columna nullable).
--   Quién fue se conserva en los historiales jsonb (campo "usuario").
-- - Datos personales del usuario (permisos, avisos leídos): ON DELETE CASCADE.
-- - Observaciones ST / Vencidas justificadas apuntaban a auth.users; ahora a
--   profiles como el resto del módulo.
--
-- Usa DROP CONSTRAINT IF EXISTS: sirve tanto en instalación nueva como sobre
-- un proyecto donde ya se aplicaron las etapas 04-13 del paquete original.
-- ============================================================

BEGIN;

-- Reporte in situ
ALTER TABLE public.mantenimiento_intervenciones
  ALTER COLUMN creado_por DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS mantenimiento_intervenciones_creado_por_fkey,
  ADD CONSTRAINT mantenimiento_intervenciones_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Alertas: si se elimina al propietario, queda sin administrador hasta reasignarlo
-- (UPDATE intervenciones_alertas_config SET administrador_id = '<uuid>' WHERE id;).
ALTER TABLE public.intervenciones_alertas_config
  ALTER COLUMN administrador_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS intervenciones_alertas_config_administrador_id_fkey,
  ADD CONSTRAINT intervenciones_alertas_config_administrador_id_fkey
    FOREIGN KEY (administrador_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS intervenciones_alertas_config_actualizado_por_fkey,
  ADD CONSTRAINT intervenciones_alertas_config_actualizado_por_fkey
    FOREIGN KEY (actualizado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.intervenciones_alertas_leidas
  DROP CONSTRAINT IF EXISTS intervenciones_alertas_leidas_usuario_id_fkey,
  ADD CONSTRAINT intervenciones_alertas_leidas_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Permisos de visitas
ALTER TABLE public.intervenciones_permisos
  DROP CONSTRAINT IF EXISTS intervenciones_permisos_usuario_id_fkey,
  ADD CONSTRAINT intervenciones_permisos_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  DROP CONSTRAINT IF EXISTS intervenciones_permisos_actualizado_por_fkey,
  ADD CONSTRAINT intervenciones_permisos_actualizado_por_fkey
    FOREIGN KEY (actualizado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.intervenciones_permisos_historial
  ALTER COLUMN usuario_id DROP NOT NULL,
  ALTER COLUMN administrador_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS intervenciones_permisos_historial_usuario_id_fkey,
  ADD CONSTRAINT intervenciones_permisos_historial_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS intervenciones_permisos_historial_administrador_id_fkey,
  ADD CONSTRAINT intervenciones_permisos_historial_administrador_id_fkey
    FOREIGN KEY (administrador_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Oportunidades
ALTER TABLE public.intervenciones_oportunidades
  ALTER COLUMN creado_por DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS intervenciones_oportunidades_creado_por_fkey,
  ADD CONSTRAINT intervenciones_oportunidades_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Observaciones ST y Vencidas justificadas (DEFAULT auth.uid() se conserva)
ALTER TABLE public.gestion_observaciones_st
  ALTER COLUMN creado_por DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS gestion_observaciones_st_creado_por_fkey,
  ADD CONSTRAINT gestion_observaciones_st_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.gestion_otst_vencidas_justificadas
  ALTER COLUMN creado_por DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS gestion_otst_vencidas_justificadas_creado_por_fkey,
  ADD CONSTRAINT gestion_otst_vencidas_justificadas_creado_por_fkey
    FOREIGN KEY (creado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMIT;

-- Verificación (debería devolver 0 filas):
--   SELECT conrelid::regclass, conname FROM pg_constraint
--   WHERE contype = 'f' AND confrelid IN ('public.profiles'::regclass, 'auth.users'::regclass)
--     AND confdeltype = 'a';
