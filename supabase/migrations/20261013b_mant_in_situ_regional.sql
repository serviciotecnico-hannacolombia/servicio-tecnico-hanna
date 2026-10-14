-- Ejecutar una sola vez antes del frontend; luego aplicar 20261013c (datos).
BEGIN;
CREATE TABLE public.mant_regional_sedes (
  id text PRIMARY KEY, nombre text NOT NULL, codigo text NOT NULL UNIQUE,
  direccion text NOT NULL, lat double precision NOT NULL, lng double precision NOT NULL,
  fuente text NOT NULL
);
CREATE TABLE public.mant_regional_config (
  sede_id text PRIMARY KEY REFERENCES public.mant_regional_sedes(id),
  jornada_horas numeric NOT NULL CHECK (jornada_horas > 0),
  costo_km numeric NOT NULL CHECK (costo_km >= 0),
  rendimiento_km_galon numeric NOT NULL CHECK (rendimiento_km_galon > 0),
  precio_galon numeric NOT NULL CHECK (precio_galon >= 0),
  margen_recorrido_pct numeric NOT NULL CHECK (margen_recorrido_pct >= 0),
  descripcion_servicio text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mant_regional_codigos (
  sede_id text REFERENCES public.mant_regional_sedes(id), codigo text,
  precio numeric NOT NULL CHECK (precio > 0), horas numeric NOT NULL CHECK (horas > 0),
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (sede_id,codigo)
);
CREATE TABLE public.mant_regional_equipos (
  sede_id text REFERENCES public.mant_regional_sedes(id), referencia text,
  codigo text NOT NULL, horas numeric CHECK (horas > 0), precio numeric CHECK (precio > 0),
  descripcion_servicio text, PRIMARY KEY (sede_id,referencia),
  FOREIGN KEY (sede_id,codigo) REFERENCES public.mant_regional_codigos(sede_id,codigo) ON UPDATE CASCADE
);
CREATE TABLE public.mant_regional_destinos (
  sede_id text REFERENCES public.mant_regional_sedes(id), codigo text,
  departamento text NOT NULL, municipio text NOT NULL, lat double precision NOT NULL, lng double precision NOT NULL,
  ida_km numeric NOT NULL CHECK (ida_km >= 0 AND ida_km <= 60), ida_min numeric NOT NULL CHECK (ida_min >= 0),
  regreso_km numeric NOT NULL CHECK (regreso_km >= 0), regreso_min numeric NOT NULL CHECK (regreso_min >= 0),
  peaje_manual_valor numeric CHECK (peaje_manual_valor >= 0), peaje_manual_motivo text,
  peajes_confirmados boolean NOT NULL DEFAULT false,
  CHECK (NOT peajes_confirmados OR (peaje_manual_valor IS NOT NULL AND length(trim(coalesce(peaje_manual_motivo,''))) > 0)),
  activo boolean NOT NULL DEFAULT true, consultado_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (sede_id,codigo)
);
-- Catálogo del HTML de referencia; no representa peajes asignados a una ruta.
CREATE TABLE public.mant_regional_peajes (
  nombre text PRIMARY KEY, fuente text, tarifa_categoria_i numeric NOT NULL CHECK (tarifa_categoria_i >= 0),
  lat double precision, lng double precision, sector text, sentido text, actualizado date
);

INSERT INTO public.modules(key) VALUES ('mant_in_situ_regional');
INSERT INTO public.capabilities(key) VALUES ('mant_in_situ_regional_editar');
INSERT INTO public.role_modules(role_id,module_key)
  SELECT role_id,'mant_in_situ_regional' FROM public.role_modules WHERE module_key='mant_in_situ';
INSERT INTO public.role_capabilities(role_id,capability_key)
  SELECT role_id,'mant_in_situ_regional_editar' FROM public.role_capabilities WHERE capability_key='mant_in_situ_editar';

DO $$ DECLARE tabla text; BEGIN
  FOREACH tabla IN ARRAY ARRAY['mant_regional_sedes','mant_regional_config','mant_regional_codigos',
    'mant_regional_equipos','mant_regional_destinos','mant_regional_peajes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tabla);
    EXECUTE format('CREATE POLICY "regional lectura" ON public.%I FOR SELECT TO authenticated USING (public.has_module(''mant_in_situ_regional''))',tabla);
    -- Las coordenadas y rutas se precalculan, no se cambian desde el navegador.
    IF tabla <> 'mant_regional_sedes' THEN
      EXECUTE format('CREATE POLICY "regional escritura" ON public.%I FOR ALL TO authenticated USING (public.has_module(''mant_in_situ_regional'') AND public.has_capability(''mant_in_situ_regional_editar'')) WITH CHECK (public.has_module(''mant_in_situ_regional'') AND public.has_capability(''mant_in_situ_regional_editar''))',tabla);
    END IF;
  END LOOP;
END $$;
CREATE POLICY "codigos_inet lectura regional" ON public.codigos_inet FOR SELECT TO authenticated
  USING (public.has_module('mant_in_situ_regional'));
COMMIT;
