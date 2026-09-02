-- Módulos Control VOID y Bodega ST con auditoría completa.

CREATE TABLE IF NOT EXISTS void_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registro_id text UNIQUE,
  qr_equipo text NOT NULL, libro text,
  referencia text, numero_serie text, nombre_equipo text,
  void_blanco text NOT NULL, void_gris text NOT NULL, documento_referencia text,
  observaciones text, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS void_registros_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), void_id uuid,
  accion text NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores jsonb, datos_nuevos jsonb,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bodega_st_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registro_id text UNIQUE,
  qr_equipo text NOT NULL,
  referencia text NOT NULL, numero_serie text NOT NULL, nombre_equipo text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('en_diagnostico', 'en_reparacion', 'incompleto_espera_partes', 'restaurado_listo')),
  partes_requeridas text, reparaciones_realizadas text, tecnico_responsable text,
  ubicacion_estante text, bodega_destino text, observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bodega_st_registros_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bodega_st_id uuid,
  accion text NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  datos_anteriores jsonb, datos_nuevos jsonb,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION registrar_auditoria_void() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO void_registros_auditoria (void_id, accion, datos_anteriores, datos_nuevos, usuario_id)
  VALUES (CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION registrar_auditoria_bodega_st() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO bodega_st_registros_auditoria (bodega_st_id, accion, datos_anteriores, datos_nuevos, usuario_id)
  VALUES (CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS void_registros_auditoria_trigger ON void_registros;
CREATE TRIGGER void_registros_auditoria_trigger AFTER INSERT OR UPDATE OR DELETE ON void_registros
FOR EACH ROW EXECUTE FUNCTION registrar_auditoria_void();

DROP TRIGGER IF EXISTS bodega_st_registros_auditoria_trigger ON bodega_st_registros;
CREATE TRIGGER bodega_st_registros_auditoria_trigger AFTER INSERT OR UPDATE OR DELETE ON bodega_st_registros
FOR EACH ROW EXECUTE FUNCTION registrar_auditoria_bodega_st();

ALTER TABLE void_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE void_registros_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE bodega_st_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE bodega_st_registros_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth all void registros" ON void_registros FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read void auditoria" ON void_registros_auditoria FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all bodega st registros" ON bodega_st_registros FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth read bodega st auditoria" ON bodega_st_registros_auditoria FOR SELECT TO authenticated USING (true);