-- Aplicar antes de desplegar el frontend. Las tareas existentes siguen privadas.
BEGIN;

ALTER TABLE public.tareas ADD COLUMN privada boolean NOT NULL DEFAULT true;

DROP POLICY "tareas select propias o asignadas" ON public.tareas;
DROP POLICY "tareas insert propias" ON public.tareas;
DROP POLICY "tareas update propias o asignadas" ON public.tareas;
DROP POLICY "tareas delete solo creador" ON public.tareas;

CREATE POLICY "tareas select visibles" ON public.tareas
  FOR SELECT TO authenticated
  USING (public.has_module('tareas') AND
    (NOT privada OR creado_por = auth.uid() OR asignado_a = auth.uid()));

CREATE POLICY "tareas insert propias" ON public.tareas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module('tareas') AND creado_por = auth.uid());

CREATE POLICY "tareas update participantes" ON public.tareas
  FOR UPDATE TO authenticated
  USING (public.has_module('tareas') AND
    (creado_por = auth.uid() OR asignado_a = auth.uid()))
  WITH CHECK (public.has_module('tareas') AND
    (creado_por = auth.uid() OR asignado_a = auth.uid()));

CREATE POLICY "tareas delete solo creador" ON public.tareas
  FOR DELETE TO authenticated
  USING (public.has_module('tareas') AND creado_por = auth.uid());

-- RLS controla filas; el trigger restringe los campos que cambia el asignado.
-- Se compara con OLD para impedir que cambie el creador y obtenga sus permisos.
CREATE FUNCTION public.proteger_edicion_tarea() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.creado_por IS DISTINCT FROM OLD.creado_por THEN
    RAISE EXCEPTION 'No se puede cambiar el creador de una tarea' USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS DISTINCT FROM OLD.creado_por AND
    (to_jsonb(NEW) - ARRAY['estado', 'completado_at', 'updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['estado', 'completado_at', 'updated_at']) THEN
    RAISE EXCEPTION 'Solo el creador puede editar la tarea; el asignado puede completar o reabrir'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER proteger_edicion_tarea_trigger BEFORE UPDATE ON public.tareas
  FOR EACH ROW EXECUTE FUNCTION public.proteger_edicion_tarea();

COMMIT;
