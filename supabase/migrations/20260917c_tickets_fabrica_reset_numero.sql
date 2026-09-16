-- Tickets a Fábrica: función para reiniciar el consecutivo "numero" (ID de la
-- intranet) a 1 tras un "Eliminar todos". La columna es GENERATED ALWAYS AS
-- IDENTITY, así que el secuencial no se reinicia solo al borrar filas — hay
-- que reiniciarlo explícitamente con ALTER TABLE, que supabase-js no puede
-- ejecutar directo (solo CRUD), de ahí esta función invocable por RPC.

CREATE OR REPLACE FUNCTION reset_tickets_fabrica_numero()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_module('tickets') THEN
    RAISE EXCEPTION 'No tienes acceso al módulo de Tickets';
  END IF;
  ALTER TABLE tickets_fabrica ALTER COLUMN numero RESTART WITH 1;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_tickets_fabrica_numero() TO authenticated;
