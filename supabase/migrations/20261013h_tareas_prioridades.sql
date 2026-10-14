BEGIN;
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS importante boolean NOT NULL DEFAULT false;
ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS urgente boolean NOT NULL DEFAULT false;
NOTIFY pgrst, 'reload schema';
COMMIT;
