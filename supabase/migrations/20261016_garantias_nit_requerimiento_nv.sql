-- ============================================================
-- Garantías: NIT del cliente (obligatorio en el formulario de las
-- garantías nuevas; las existentes quedan en NULL) y N° de requerimiento
-- SACI con el que se solicita la NV en la ruta sin stock. Ambos campos
-- se auditan en garantias_historial.
-- ============================================================

ALTER TABLE garantias
  ADD COLUMN IF NOT EXISTS nit              text,
  ADD COLUMN IF NOT EXISTS requerimiento_nv text;

-- Misma función de 20260930_modulo_garantias.sql + nit y requerimiento_nv.
-- Los triggers ya apuntan a log_garantias(), no hace falta recrearlos.
CREATE OR REPLACE FUNCTION log_garantias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'creacion', NEW.cliente);
    RETURN NEW;
  END IF;

  IF NEW.nit IS DISTINCT FROM OLD.nit THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'nit', OLD.nit, NEW.nit);
  END IF;
  IF NEW.cliente IS DISTINCT FROM OLD.cliente THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'cliente', OLD.cliente, NEW.cliente);
  END IF;
  IF NEW.referencia IS DISTINCT FROM OLD.referencia THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'referencia', OLD.referencia, NEW.referencia);
  END IF;
  IF NEW.otst IS DISTINCT FROM OLD.otst THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'otst', OLD.otst, NEW.otst);
  END IF;
  IF NEW.asesor_correo IS DISTINCT FROM OLD.asesor_correo THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'asesor_correo', OLD.asesor_correo, NEW.asesor_correo);
  END IF;
  IF NEW.hay_stock IS DISTINCT FROM OLD.hay_stock THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'hay_stock', OLD.hay_stock::text, NEW.hay_stock::text);
  END IF;
  IF NEW.responsables IS DISTINCT FROM OLD.responsables THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'responsables', array_to_string(OLD.responsables, ','), array_to_string(NEW.responsables, ','));
  END IF;
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'estado', OLD.estado, NEW.estado);
  END IF;
  IF NEW.numero_nv IS DISTINCT FROM OLD.numero_nv THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'numero_nv', OLD.numero_nv, NEW.numero_nv);
  END IF;
  IF NEW.requerimiento_nv IS DISTINCT FROM OLD.requerimiento_nv THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'requerimiento_nv', OLD.requerimiento_nv, NEW.requerimiento_nv);
  END IF;
  IF NEW.fecha_seguimiento IS DISTINCT FROM OLD.fecha_seguimiento THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'fecha_seguimiento', OLD.fecha_seguimiento::text, NEW.fecha_seguimiento::text);
  END IF;
  IF NEW.numero_pnc IS DISTINCT FROM OLD.numero_pnc THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'numero_pnc', OLD.numero_pnc, NEW.numero_pnc);
  END IF;
  IF NEW.fecha_limite_entrega IS DISTINCT FROM OLD.fecha_limite_entrega THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'fecha_limite_entrega', OLD.fecha_limite_entrega::text, NEW.fecha_limite_entrega::text);
  END IF;
  IF NEW.anulada IS DISTINCT FROM OLD.anulada THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'anulada', OLD.anulada::text, NEW.anulada::text);
  END IF;
  IF NEW.motivo_anulacion IS DISTINCT FROM OLD.motivo_anulacion THEN
    INSERT INTO garantias_historial (garantia_id, usuario_id, campo, valor_anterior, valor_nuevo)
    VALUES (NEW.id, auth.uid(), 'motivo_anulacion', OLD.motivo_anulacion, NEW.motivo_anulacion);
  END IF;
  RETURN NEW;
END;
$$;
