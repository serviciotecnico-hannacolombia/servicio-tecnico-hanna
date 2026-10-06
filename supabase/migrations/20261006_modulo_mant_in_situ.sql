-- ============================================================
-- Módulo: Mant. In Situ (cotizador de mantenimiento en las instalaciones
-- del cliente — Bogotá y alrededores). Migra los datos del HTML
-- "HANNA_Bogota_y_alrededores" (antes vivían en el navegador).
--
-- El catálogo de equipos es codigos_inet (módulo Códigos): referencia,
-- nombre, familia y código de mantenimiento. Este módulo solo guarda lo
-- propio del servicio in situ:
--   · mant_in_situ_codigos  → precio y horas estándar por código
--   · mant_in_situ_equipos  → excepciones por referencia (código, horas,
--                             precio o descripción distintos)
--   · mant_in_situ_config   → jornada, vehículo, combustible, origen y
--                             descripción general del servicio
--   · destinos / peajes     → rutas desde HANNA El Dorado y peajes por
--                             sentido
--
-- Fórmula del cotizador (la del HTML, a implementar en la fase 2):
--   horas_viaje  = (ida_min + regreso_min) / 60 × (1 + margen%)
--   km_visita    = (ida_km + regreso_km) × (1 + margen%)
--   días         = ⌈horas_mantenimiento / (jornada − horas_viaje)⌉
--   vehículo     = km_visita × días × costo_km
--   combustible  = km_visita × días ÷ rendimiento × precio_galon
--   peajes       = (peaje_manual_valor ó suma de peajes ida + regreso) × días
--   Bogotá (11001) solo cobra el servicio. Los extras se reparten entre
--   los equipos en proporción a su precio base.
--
-- Acceso: consulta ST, Ventas, Jefe de Ventas, Líderes y Admin; configura
-- quien tenga mant_in_situ_editar (ST y Admin).
-- ============================================================

CREATE TABLE IF NOT EXISTS mant_in_situ_config (
  id                    smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  jornada_horas         numeric NOT NULL CHECK (jornada_horas > 0),
  costo_km              numeric NOT NULL CHECK (costo_km >= 0),        -- uso y desgaste del vehículo (COP/km)
  rendimiento_km_galon  numeric NOT NULL CHECK (rendimiento_km_galon > 0),
  precio_galon          numeric NOT NULL CHECK (precio_galon >= 0),
  margen_recorrido_pct  numeric NOT NULL CHECK (margen_recorrido_pct >= 0), -- se aplica a cada sentido, en km y minutos
  descripcion_servicio  text NOT NULL DEFAULT '',                       -- texto general para el cliente
  origen_nombre         text NOT NULL,
  origen_direccion      text NOT NULL,
  origen_lat            double precision,
  origen_lng            double precision,
  rutas_consultadas_at  timestamptz,                                    -- fecha de la consulta de distancias (OSRM)
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mant_in_situ_codigos (
  codigo      text PRIMARY KEY,                       -- ej. MANTCHECKER.01
  precio      numeric NOT NULL CHECK (precio > 0),    -- precio base (COP)
  horas       numeric NOT NULL CHECK (horas > 0),     -- horas estándar de mantenimiento
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Sin FK a codigos_inet a propósito: si una referencia se borra o renombra
-- en Códigos, la excepción no debe impedirlo (simplemente deja de aplicar).
CREATE TABLE IF NOT EXISTS mant_in_situ_equipos (
  referencia            text PRIMARY KEY,             -- = codigos_inet.codigo
  codigo_mantenimiento  text REFERENCES mant_in_situ_codigos(codigo) ON UPDATE CASCADE,
  horas                 numeric CHECK (horas > 0),
  precio                numeric CHECK (precio > 0),
  descripcion_servicio  text,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mant_in_situ_destinos (
  codigo               text PRIMARY KEY,              -- código DANE del municipio
  departamento         text NOT NULL,
  municipio            text NOT NULL,
  lat                  double precision,
  lng                  double precision,
  ida_km               numeric,
  ida_min              numeric,
  regreso_km           numeric,
  regreso_min          numeric,
  peaje_manual_valor   numeric CHECK (peaje_manual_valor >= 0), -- total por visita (ida + regreso); null = usar los peajes de la ruta
  peaje_manual_motivo  text,
  revision_peajes      jsonb,                         -- nota de revisión con fuentes (cuando aplica)
  activo               boolean NOT NULL DEFAULT true,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mant_in_situ_peajes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              text NOT NULL UNIQUE,
  fuente              text,
  tarifa_categoria_i  numeric NOT NULL CHECK (tarifa_categoria_i >= 0),
  lat                 double precision,
  lng                 double precision,
  sector              text,
  sentido             text,
  actualizado         date,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mant_in_situ_destino_peajes (
  destino_codigo      text NOT NULL REFERENCES mant_in_situ_destinos(codigo) ON DELETE CASCADE,
  peaje_id            uuid NOT NULL REFERENCES mant_in_situ_peajes(id) ON DELETE CASCADE,
  sentido             text NOT NULL CHECK (sentido IN ('ida', 'regreso')),
  revision_requerida  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (destino_codigo, peaje_id, sentido)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mant_in_situ_config', 'mant_in_situ_codigos', 'mant_in_situ_equipos',
                           'mant_in_situ_destinos', 'mant_in_situ_peajes', 'mant_in_situ_destino_peajes']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || ' select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (has_module(''mant_in_situ''))', t || ' select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || ' write', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated
      USING (has_module(''mant_in_situ'') AND has_capability(''mant_in_situ_editar''))
      WITH CHECK (has_module(''mant_in_situ'') AND has_capability(''mant_in_situ_editar''))', t || ' write', t);
  END LOOP;
END $$;

-- El catálogo de equipos sale de codigos_inet, que hoy solo se puede leer
-- con el módulo Códigos. Esta política adicional (las permisivas se suman
-- con OR) deja leerlo a quien tenga Mant. In Situ, sin tocar la existente.
DROP POLICY IF EXISTS "codigos_inet select mant_in_situ" ON codigos_inet;
CREATE POLICY "codigos_inet select mant_in_situ" ON codigos_inet
  FOR SELECT TO authenticated USING (has_module('mant_in_situ'));

-- ── Seed: módulo, capability y accesos por rol ──────────────────────────────

INSERT INTO modules (key) VALUES ('mant_in_situ')
ON CONFLICT (key) DO NOTHING;

-- "Jefe de Ventas" se creó a mano desde el Admin — no-op si no existe.
INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'mant_in_situ' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Ventas', 'Jefe de Ventas', 'Líderes', 'Admin')
ON CONFLICT DO NOTHING;

INSERT INTO capabilities (key) VALUES ('mant_in_situ_editar')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'mant_in_situ_editar' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin')
ON CONFLICT DO NOTHING;


-- ── Datos migrados del HTML (generados por script, no editar a mano) ──

INSERT INTO mant_in_situ_config (id, jornada_horas, costo_km, rendimiento_km_galon, precio_galon, margen_recorrido_pct,
  descripcion_servicio, origen_nombre, origen_direccion, origen_lat, origen_lng, rutas_consultadas_at)
VALUES (1, 8, 473, 35, 15900, 5,
  'El servicio de mantenimiento in situ consiste en la atención técnica especializada directamente en las instalaciones del cliente, evitando el traslado de los equipos al laboratorio de servicio técnico. Durante la visita se realizan las actividades necesarias para verificar el estado general del instrumento y conservar su correcto funcionamiento, de acuerdo con las condiciones, características y alcance técnico de cada equipo.

Las actividades contempladas dentro del servicio incluyen:

- Inspección general del instrumento.
- Limpieza externa e interna, según aplique.
- Verificación del estado físico de componentes, conexiones y accesorios.
- Revisión del funcionamiento general del equipo.
- Revisión de la tarjeta electrónica, cuando aplique.
- Inspección y repaso de puntos de soldadura, cuando aplique.
- Verificación de sondas, sensores y electrodos asociados al instrumento, cuando aplique.
- Ejecución de ajustes básicos permitidos en campo.
- Identificación de anomalías, desgaste, deterioro o posibles fallas en los componentes.
- Realización de pruebas funcionales posteriores al mantenimiento.
- Registro de los hallazgos encontrados durante la intervención.
- Entrega de recomendaciones técnicas relacionadas con repuestos, consumibles, accesorios, reparaciones adicionales o futuras intervenciones.
- Instalación de etiqueta de mantenimiento con la información correspondiente al servicio realizado.
- Elaboración y entrega de informe digital de mantenimiento con el detalle de las actividades ejecutadas, hallazgos y recomendaciones técnicas.

Al finalizar el servicio, se informa al cliente sobre el estado general del instrumento y las recomendaciones necesarias para contribuir a su adecuado funcionamiento, conservación y seguimiento técnico.', 'HANNA El Dorado', 'Carrera 98 #25G-10, Centro Empresarial El Dorado, bodega 9, Bogotá', 4.6849445, -74.1293179, '2026-09-28T11:31:03.673Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO mant_in_situ_codigos (codigo, precio, horas) VALUES
  ('MANTCHECKER.01', 150000, 1),
  ('MANFT.02', 245000, 2),
  ('MANMINTI.02', 245000, 2),
  ('MANMUL.02', 390000, 3),
  ('MANPOI.02', 245000, 2),
  ('MANPOIC.02', 245000, 2),
  ('MANSAMPLER.02', 1400000, 5),
  ('MANTBL.02', 245000, 2),
  ('MANTBL12X.02', 450000, 4),
  ('MANTCONTROL.02', 450000, 4),
  ('MANTCT.02', 245000, 2),
  ('MANTIRIS.02', 450000, 4),
  ('MANTIT.02', 1400000, 6),
  ('MANTMC.02', 245000, 2),
  ('MANTOD.02', 245000, 2),
  ('MANTODC.02', 245000, 2),
  ('MANTPCA.02', 910000, 6),
  ('MANTR.02', 370000, 4)
ON CONFLICT (codigo) DO NOTHING;


-- Excepciones por referencia respecto a codigos_inet / el código / la descripción general.

INSERT INTO mant_in_situ_equipos (referencia, codigo_mantenimiento, horas, precio, descripcion_servicio) VALUES
  ('HI 981421-01', 'MANTBL.02', NULL, NULL, NULL),
  ('HI 981421-02', 'MANTBL.02', NULL, NULL, NULL),
  ('HI 98311', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 98312', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 983124', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 98318', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 6542-01', 'MANMUL.02', NULL, NULL, NULL),
  ('HI 6542-02', 'MANMUL.02', NULL, NULL, NULL),
  ('HI 6542P-01', 'MANMUL.02', NULL, NULL, NULL),
  ('HI 6542P-02', 'MANMUL.02', NULL, NULL, NULL),
  ('HI 3220-01', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 3220-02', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 3221-01', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 3221-02', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 3222-01', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 3222-02', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 6222-01', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 6222-02', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 6522-01', 'MANMUL.02', NULL, NULL, NULL),
  ('HI 6522-02', 'MANMUL.02', NULL, NULL, NULL),
  ('HI 9146-04', 'MANTOD.02', NULL, NULL, NULL),
  ('HI 9146-10', 'MANTOD.02', NULL, NULL, NULL),
  ('HI 9147-04', 'MANTOD.02', NULL, NULL, NULL),
  ('HI 9147-10', 'MANTOD.02', NULL, NULL, NULL),
  ('HI 9147-15', 'MANTOD.02', NULL, NULL, NULL),
  ('HI 98193', 'MANTOD.02', NULL, NULL, NULL),
  ('HI 8734', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 99300', 'MANTCT.02', NULL, NULL, NULL),
  ('HI 99301', 'MANTCT.02', NULL, NULL, NULL),
  ('HI 8424', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 9810-61', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 9811-51', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 9812-51', 'MANPOI.02', NULL, NULL, NULL),
  ('HI 83748-01', 'MANFT.02', NULL, NULL, NULL),
  ('HI 83748-02', 'MANFT.02', NULL, NULL, NULL),
  ('HI 97725', 'MANFT.02', NULL, NULL, NULL),
  ('HI 97725C', 'MANFT.02', NULL, NULL, NULL),
  ('HI 83414-01', 'MANFT.02', NULL, NULL, NULL),
  ('HI 83414-02', 'MANFT.02', NULL, NULL, NULL),
  ('HI 83749-01', 'MANFT.02', NULL, NULL, NULL),
  ('HI 83749-02', 'MANFT.02', NULL, NULL, NULL),
  ('HI 847492-01', 'MANFT.02', NULL, NULL, NULL),
  ('HI 847492-02', 'MANFT.02', NULL, NULL, NULL),
  ('HI 88703-01', 'MANFT.02', NULL, NULL, NULL),
  ('HI 88703-02', 'MANFT.02', NULL, NULL, NULL),
  ('HI 88713-01', 'MANFT.02', NULL, NULL, NULL),
  ('HI 88713-02', 'MANFT.02', NULL, NULL, NULL),
  ('HI 93102', 'MANFT.02', NULL, NULL, NULL),
  ('HI 93414-01', 'MANFT.02', NULL, NULL, NULL),
  ('HI 93414-02', 'MANFT.02', NULL, NULL, NULL),
  ('HI 93703-11', 'MANFT.02', NULL, NULL, NULL),
  ('HI 93703C', 'MANFT.02', NULL, NULL, NULL),
  ('HI 98703-01', 'MANFT.02', NULL, NULL, NULL),
  ('HI 98703-02', 'MANFT.02', NULL, NULL, NULL),
  ('HI 98713-01', 'MANFT.02', NULL, NULL, NULL),
  ('HI 98713-02', 'MANFT.02', NULL, NULL, NULL),
  ('HI 987134-02', 'MANFT.02', NULL, NULL, NULL),
  ('HI 935002', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 935005', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 93531', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 93531N', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 146-00', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 98517-12', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 98517-13', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 98517-15', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('HI 98517-30', 'MANTCHECKER.01', NULL, NULL, NULL),
  ('BL 983324-0', 'MANTMC.02', NULL, NULL, NULL),
  ('BL 7916-1', 'MANTMC.02', NULL, NULL, NULL),
  ('BL 7916-2', 'MANTMC.02', NULL, NULL, NULL),
  ('BL 7917-1', 'MANTMC.02', NULL, NULL, NULL),
  ('BL 7917-2', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 8614LN', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 8615LN', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 8936ALN', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 8936BL N', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 8936CLN', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 8936DLN', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 98143-01', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 98143-04', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 98143-20', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 98143-22', 'MANTMC.02', NULL, NULL, NULL),
  ('HI 839800-01', 'MANTR.02', NULL, NULL, NULL),
  ('HI 839800-02', 'MANTR.02', NULL, NULL, NULL)
ON CONFLICT (referencia) DO NOTHING;


INSERT INTO mant_in_situ_destinos (codigo, departamento, municipio, lat, lng, ida_km, ida_min, regreso_km, regreso_min, peaje_manual_valor, peaje_manual_motivo, revision_peajes) VALUES
  ('11001', 'BOGOTÁ, D.C.', 'BOGOTÁ, D.C.', 4.649251, -74.106992, 0, 0, 0, 0, NULL, NULL, NULL),
  ('25019', 'CUNDINAMARCA', 'ALBÁN', 4.878022, -74.438261, 50.8, 55.3, 49.3, 56.8, NULL, NULL, NULL),
  ('25099', 'CUNDINAMARCA', 'BOJACÁ', 4.737205, -74.344594, 31.1, 45.5, 31.5, 43.7, NULL, NULL, NULL),
  ('25123', 'CUNDINAMARCA', 'CACHIPAY', 4.730957, -74.435711, 54.7, 63.5, 53.8, 64.7, NULL, NULL, NULL),
  ('25126', 'CUNDINAMARCA', 'CAJICÁ', 4.920009, -74.02298, 38.9, 47.6, 40, 46.6, NULL, NULL, NULL),
  ('25151', 'CUNDINAMARCA', 'CÁQUEZA', 4.404112, -73.946473, 59.8, 55.8, 60.8, 57.4, NULL, NULL, '{"checkedAt": "2026-09-29", "effectiveFrom": "2026-01-16", "cityCodes": ["25151", "25178", "25845"], "station": "BOQUERÓN I", "categoryI": 20800, "note": "Ruta principal Bogotá–Chipaque–Cáqueza, con desvío a Une: un paso por Boquerón en cada sentido. Boquerón II es el punto de control del acceso alternativo; no se suma como una segunda estación de cobro en el mismo trayecto. No incluye Naranjal, situado después de estos destinos. Aplicación a la ruta habitual en operación normal; desvíos o rutas especiales requieren revisión.", "sources": [{"label": "COVIANDINA · tarifas 2026", "url": "https://coviandina.com/ubicacion-y-tarifas"}, {"label": "COVIANDINA · operación y sentidos de las estaciones", "url": "https://coviandina.com/distribucion-de-carriles-por-estacion"}]}'::jsonb),
  ('25175', 'CUNDINAMARCA', 'CHÍA', 4.866508, -74.05, 33.9, 40, 34.6, 42.9, NULL, NULL, NULL),
  ('25178', 'CUNDINAMARCA', 'CHIPAQUE', 4.442671, -74.044876, 43.9, 44.2, 45.4, 45.8, NULL, NULL, '{"checkedAt": "2026-09-29", "effectiveFrom": "2026-01-16", "cityCodes": ["25151", "25178", "25845"], "station": "BOQUERÓN I", "categoryI": 20800, "note": "Ruta principal Bogotá–Chipaque–Cáqueza, con desvío a Une: un paso por Boquerón en cada sentido. Boquerón II es el punto de control del acceso alternativo; no se suma como una segunda estación de cobro en el mismo trayecto. No incluye Naranjal, situado después de estos destinos. Aplicación a la ruta habitual en operación normal; desvíos o rutas especiales requieren revisión.", "sources": [{"label": "COVIANDINA · tarifas 2026", "url": "https://coviandina.com/ubicacion-y-tarifas"}, {"label": "COVIANDINA · operación y sentidos de las estaciones", "url": "https://coviandina.com/distribucion-de-carriles-por-estacion"}]}'::jsonb),
  ('25181', 'CUNDINAMARCA', 'CHOACHÍ', 4.527048, -73.922894, 53.8, 81.1, 53.6, 82.7, NULL, NULL, NULL),
  ('25214', 'CUNDINAMARCA', 'COTA', 4.812564, -74.102569, 24.9, 37.5, 21.4, 33.1, NULL, NULL, NULL),
  ('25260', 'CUNDINAMARCA', 'EL ROSAL', 4.850589, -74.263103, 31.9, 45.8, 34.2, 46.3, NULL, NULL, NULL),
  ('25269', 'CUNDINAMARCA', 'FACATATIVÁ', 4.813353, -74.350085, 34.7, 41.4, 33.6, 43.1, NULL, NULL, NULL),
  ('25286', 'CUNDINAMARCA', 'FUNZA', 4.710412, -74.201528, 11.5, 17.9, 11.9, 20.8, NULL, NULL, NULL),
  ('25295', 'CUNDINAMARCA', 'GACHANCIPÁ', 4.990947, -73.873464, 55.1, 58.5, 57.1, 61.4, NULL, NULL, NULL),
  ('25312', 'CUNDINAMARCA', 'GRANADA', 4.519763, -74.350766, 43.4, 52, 44.7, 53.6, NULL, NULL, NULL),
  ('25322', 'CUNDINAMARCA', 'GUASCA', 4.866719, -73.877143, 53.9, 65.7, 55.1, 67.3, NULL, NULL, NULL),
  ('25377', 'CUNDINAMARCA', 'LA CALERA', 4.721104, -73.968161, 30, 47.9, 30.9, 50.2, NULL, NULL, NULL),
  ('25430', 'CUNDINAMARCA', 'MADRID', 4.732791, -74.265854, 18.9, 26.5, 18.7, 27.5, NULL, NULL, NULL),
  ('25473', 'CUNDINAMARCA', 'MOSQUERA', 4.70653, -74.221154, 13.2, 19.7, 13.6, 21.2, NULL, NULL, NULL),
  ('25645', 'CUNDINAMARCA', 'SAN ANTONIO DEL TEQUENDAMA', 4.616138, -74.351443, 48.1, 58.6, 47.9, 57.9, NULL, NULL, NULL),
  ('25658', 'CUNDINAMARCA', 'SAN FRANCISCO', 4.972917, -74.289672, 57.7, 77.2, 60.4, 76.4, NULL, NULL, NULL),
  ('25740', 'CUNDINAMARCA', 'SIBATÉ', 4.492625, -74.257874, 32.4, 37, 34.6, 38.3, NULL, NULL, NULL),
  ('25754', 'CUNDINAMARCA', 'SOACHA', 4.579268, -74.215463, 20.4, 27.6, 22.2, 24.8, NULL, NULL, NULL),
  ('25758', 'CUNDINAMARCA', 'SOPÓ', 4.915395, -73.943328, 47.3, 51.4, 48.6, 54.9, NULL, NULL, NULL),
  ('25769', 'CUNDINAMARCA', 'SUBACHOQUE', 4.929118, -74.172773, 40.6, 60.9, 40.4, 60.6, NULL, NULL, NULL),
  ('25785', 'CUNDINAMARCA', 'TABIO', 4.916832, -74.096461, 38.3, 46.6, 38.2, 46.1, NULL, NULL, NULL),
  ('25797', 'CUNDINAMARCA', 'TENA', 4.655286, -74.389193, 47.5, 56.2, 47.4, 55.9, NULL, NULL, NULL),
  ('25799', 'CUNDINAMARCA', 'TENJO', 4.872014, -74.143724, 30.4, 37.8, 30.1, 36.9, NULL, NULL, NULL),
  ('25817', 'CUNDINAMARCA', 'TOCANCIPÁ', 4.964641, -73.91207, 49.7, 54.1, 51.7, 56.6, NULL, NULL, NULL),
  ('25845', 'CUNDINAMARCA', 'UNE', 4.40245, -74.025183, 51.3, 54.9, 52.4, 56.4, NULL, NULL, '{"checkedAt": "2026-09-29", "effectiveFrom": "2026-01-16", "cityCodes": ["25151", "25178", "25845"], "station": "BOQUERÓN I", "categoryI": 20800, "note": "Ruta principal Bogotá–Chipaque–Cáqueza, con desvío a Une: un paso por Boquerón en cada sentido. Boquerón II es el punto de control del acceso alternativo; no se suma como una segunda estación de cobro en el mismo trayecto. No incluye Naranjal, situado después de estos destinos. Aplicación a la ruta habitual en operación normal; desvíos o rutas especiales requieren revisión.", "sources": [{"label": "COVIANDINA · tarifas 2026", "url": "https://coviandina.com/ubicacion-y-tarifas"}, {"label": "COVIANDINA · operación y sentidos de las estaciones", "url": "https://coviandina.com/distribucion-de-carriles-por-estacion"}]}'::jsonb),
  ('25898', 'CUNDINAMARCA', 'ZIPACÓN', 4.759932, -74.379566, 39.5, 46.3, 38, 47.5, NULL, NULL, NULL),
  ('25899', 'CUNDINAMARCA', 'ZIPAQUIRÁ', 5.025477, -73.994444, 53.1, 60.2, 52.5, 61.5, NULL, NULL, NULL)
ON CONFLICT (codigo) DO NOTHING;


INSERT INTO mant_in_situ_peajes (nombre, fuente, tarifa_categoria_i, lat, lng, sector, sentido, actualizado) VALUES
  ('Río Bogotá', 'INVÍAS', 12400, 4.6987, -74.179344, 'Los Alpes - Madrid - Bogotá (Rio Bogotá)', 'Oriente - Occidente Bogotá - Faca', '2026-07-01'),
  ('EL CORZO', 'INVÍAS', 11800, 4.748722, -74.291145, 'El Corzo - Madrid', 'Occidente - Oriente Faca - Bogota', '2026-07-01'),
  ('ANDES', 'INVÍAS / ANI', 15200, 4.830003, -74.033081, 'Bogotá-La Caro-Tunja', 'Sur Norte Aplica Únicamente saliendo de Bogotá', '2026-01-16'),
  ('SIBERIA', 'INVÍAS / ANI', 15300, 4.780402, -74.185028, 'Villeta - Bogotá', 'Ambos sentidos de circulación', '2025-09-22'),
  ('BOQUERÓN I', 'COVIANDINA / ANI', 20800, 4.452599, -74.073395, 'Bogotá (El Portal) - Villavicencio', 'Occidente – Oriente // Oriente – Occidente', '2026-01-16'),
  ('MONDOÑEDO', 'INVÍAS', 11200, 4.638242, -74.293983, 'La Mesa - Mosquera', 'Norte - Sur // Sur Norte', '2026-07-01'),
  ('Los Patios', 'INVÍAS', 14800, 4.663374, -74.01058, 'Bogotá (Los Patios) - Guasca', 'Sur – Norte', '2026-07-01'),
  ('La Cabaña', 'INVÍAS / ANI', 14800, 4.809454, -73.945587, 'Bogotá (Los Patios) - Guasca', 'Norte – Sur', '2026-07-01'),
  ('CHUSACÁ', 'INVÍAS / ANI', 16100, 4.537452, -74.271805, 'Girardot - Silvania - Bogotá (Bosa)', 'Sur - Norte // Norte - Sur', '2026-01-16')
ON CONFLICT (nombre) DO NOTHING;


-- Pasos de peaje por destino y sentido (un peaje cuenta una vez por sentido, igual que el HTML).

INSERT INTO mant_in_situ_destino_peajes (destino_codigo, peaje_id, sentido, revision_requerida)
SELECT v.destino, p.id, v.sentido, v.revision FROM (VALUES
  ('25019', 'Río Bogotá', 'ida', true),
  ('25019', 'EL CORZO', 'regreso', true),
  ('25099', 'Río Bogotá', 'ida', true),
  ('25099', 'EL CORZO', 'regreso', true),
  ('25123', 'Río Bogotá', 'ida', true),
  ('25123', 'EL CORZO', 'regreso', true),
  ('25126', 'ANDES', 'ida', true),
  ('25151', 'BOQUERÓN I', 'ida', false),
  ('25151', 'BOQUERÓN I', 'regreso', false),
  ('25175', 'ANDES', 'ida', true),
  ('25178', 'BOQUERÓN I', 'ida', false),
  ('25178', 'BOQUERÓN I', 'regreso', false),
  ('25260', 'SIBERIA', 'ida', true),
  ('25260', 'SIBERIA', 'regreso', true),
  ('25269', 'Río Bogotá', 'ida', true),
  ('25269', 'EL CORZO', 'regreso', true),
  ('25286', 'Río Bogotá', 'ida', true),
  ('25295', 'ANDES', 'ida', true),
  ('25312', 'CHUSACÁ', 'ida', true),
  ('25312', 'CHUSACÁ', 'regreso', true),
  ('25322', 'La Cabaña', 'regreso', true),
  ('25377', 'Los Patios', 'ida', true),
  ('25430', 'Río Bogotá', 'ida', true),
  ('25473', 'Río Bogotá', 'ida', true),
  ('25645', 'Río Bogotá', 'ida', true),
  ('25645', 'MONDOÑEDO', 'ida', true),
  ('25645', 'MONDOÑEDO', 'regreso', true),
  ('25658', 'SIBERIA', 'ida', true),
  ('25658', 'SIBERIA', 'regreso', true),
  ('25758', 'ANDES', 'ida', true),
  ('25769', 'SIBERIA', 'ida', true),
  ('25769', 'SIBERIA', 'regreso', true),
  ('25797', 'Río Bogotá', 'ida', true),
  ('25797', 'MONDOÑEDO', 'ida', true),
  ('25797', 'MONDOÑEDO', 'regreso', true),
  ('25817', 'ANDES', 'ida', true),
  ('25845', 'BOQUERÓN I', 'ida', false),
  ('25845', 'BOQUERÓN I', 'regreso', false),
  ('25898', 'Río Bogotá', 'ida', true),
  ('25898', 'EL CORZO', 'regreso', true),
  ('25899', 'ANDES', 'ida', true)
) AS v(destino, nombre, sentido, revision)
JOIN mant_in_situ_peajes p ON p.nombre = v.nombre
ON CONFLICT DO NOTHING;
