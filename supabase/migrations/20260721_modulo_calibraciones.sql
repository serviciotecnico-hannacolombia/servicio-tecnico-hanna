-- ============================================================
-- Módulo: Calibraciones (gestión de calibración acreditada ONAC,
-- reemplaza el seguimiento manual en Notion — ver I.ST.0X)
-- Acceso completo: Servicio Técnico, Admin, Líderes, Logística
-- Acceso solo lectura (filtrado a sus propias órdenes): Ventas
-- ============================================================

-- ── Catálogo de servicios RV CALIBR ─────────────────────────────────────────
-- Editable desde la app (pestaña "Catálogo"). Las reglas de modalidad no son
-- fijas en código: viven aquí como datos para que Servicio Técnico las pueda
-- ajustar si cambia el alcance de acreditación del laboratorio.

CREATE TABLE IF NOT EXISTS rv_calibr_catalogo (
  codigo                    text PRIMARY KEY,
  magnitud                  text NOT NULL,
  descripcion               text NOT NULL,
  modalidades_permitidas    text[] NOT NULL,
  solo_laboratorio_externo  boolean NOT NULL DEFAULT false,
  envio_exclusivo_tcc       boolean NOT NULL DEFAULT false,
  activo                    boolean NOT NULL DEFAULT true
);

INSERT INTO rv_calibr_catalogo (codigo, magnitud, descripcion, modalidades_permitidas, solo_laboratorio_externo, envio_exclusivo_tcc) VALUES
  ('RV CALIBR.1',  'Temperatura',       'Termómetros de contacto -100°C a 1100°C en 1 punto',                        ARRAY['laboratorio_externo','in_situ','sede_hanna_dorado'], false, false),
  ('RV CALIBR.2',  'Volumen',           'Buretas de tituladores, 0,5 mL a 100 mL. Envío ida y regreso exclusivo TCC, junto con la bomba dosificadora', ARRAY['laboratorio_externo'], true, true),
  ('RV CALIBR.3',  'Temperatura',       'Termómetros de contacto -100°C a 1100°C en 3 puntos',                       ARRAY['laboratorio_externo','in_situ','sede_hanna_dorado'], false, false),
  ('RV CALIBR.4',  'Espectrofotometría','Espectrofotometría / Fotometría visible y fotómetros',                     ARRAY['laboratorio_externo','in_situ','sede_hanna_dorado'], false, false),
  ('RV CALIBR.5',  'pH',                'Potencial de Hidrógeno (pH), 1 o 3 puntos MRC',                            ARRAY['laboratorio_externo','in_situ','sede_hanna_dorado'], false, false),
  ('RV CALIBR.6',  'pH',                'Potencial de Hidrógeno (pH), 4 o 5 puntos MRC',                            ARRAY['laboratorio_externo','in_situ','sede_hanna_dorado'], false, false),
  ('RV CALIBR.7',  'Conductividad',     'Conductividad, 1 o 3 puntos MRC',                                          ARRAY['laboratorio_externo','in_situ','sede_hanna_dorado'], false, false),
  ('RV CALIBR.8',  'Conductividad',     'Conductividad, 4 o 6 puntos MRC',                                          ARRAY['laboratorio_externo','in_situ','sede_hanna_dorado'], false, false),
  ('RV CALIBR.9',  'Cloro',             'Concentración de sustancia — Medidores de Cloro, 5 puntos MRC',            ARRAY['laboratorio_externo'], true, false),
  ('RV CALIBR.10', 'Oxígeno Disuelto',  'Concentración de sustancia — Medidor de Oxígeno Disuelto (OD), 3 puntos',  ARRAY['laboratorio_externo'], true, false),
  ('RV CALIBR.11', 'Turbidimetría',     'Turbidímetros, 5 puntos MRC',                                              ARRAY['laboratorio_externo','in_situ','sede_hanna_dorado'], false, false),
  ('RV CALIBR.12', 'Multiparámetro',    'Paquete Multiparámetro: pH + Conductividad + Temperatura',                 ARRAY['laboratorio_externo','in_situ'], false, false),
  ('RV CALIBR.14', 'Temperatura',       'Caracterización de medios — Bloques termoreactores, 2 puntos',             ARRAY['in_situ'], false, false),
  ('RV CALIBR.15', 'Temperatura',       'Caracterización de medios — Bloques termoreactores, 2 o 3 puntos',         ARRAY['in_situ'], false, false)
ON CONFLICT (codigo) DO NOTHING;

-- ── Órdenes de calibración ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ordenes_calibracion (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  numero_oc                 text,
  cliente                   text NOT NULL,
  correo_cliente            text,
  asesor_id                 uuid REFERENCES profiles(id) ON DELETE SET NULL,
  correo_asesor             text,

  saci                      text,
  link_solicitud            text,
  otst                      text,
  link_otst                 text,
  codigo_recepcion          text,
  rmv_fv                    text,

  modalidad                 text CHECK (modalidad IN ('laboratorio_externo','in_situ','sede_hanna_dorado')),
  lugar_ejecucion            text,
  proveedor                 text,

  estado                    text NOT NULL DEFAULT 'oc_creada' CHECK (estado IN (
                               'oc_creada','para_enviar','en_mantenimiento_reparacion',
                               'en_programacion_visita','visita_programada','enviado',
                               'en_calibracion','en_retorno','novedad',
                               'recolectado_en_hanna','a_falta_certificado','terminado'
                             )),
  novedad_detalle           text,
  enviado_cliente_final     boolean NOT NULL DEFAULT false,

  fecha_programada_envio    date,
  fecha_envio               date,
  nota_envio                text,
  certificado_fecha_inicio  date,
  certificado_fecha_fin     date,
  fecha_salida_lab          date,
  fecha_retorno             date,
  nota_retorno              text,
  fecha_llegada_hanna       date,
  fecha_entrega_certificado date,

  carta_entrega             text,
  carta_certificado         text,
  parametros_nota           text,

  valor_oc_antes_iva        numeric(14,2),

  creado_por                uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ordenes_calibracion_estado         ON ordenes_calibracion (estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_calibracion_correo_asesor  ON ordenes_calibracion (correo_asesor);
CREATE INDEX IF NOT EXISTS idx_ordenes_calibracion_asesor_id      ON ordenes_calibracion (asesor_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_calibracion_cert_fecha_fin ON ordenes_calibracion (certificado_fecha_fin);

CREATE TABLE IF NOT EXISTS ordenes_calibracion_parametros (
  orden_id      uuid NOT NULL REFERENCES ordenes_calibracion(id) ON DELETE CASCADE,
  rv_calibr_codigo text NOT NULL REFERENCES rv_calibr_catalogo(codigo) ON DELETE RESTRICT,
  PRIMARY KEY (orden_id, rv_calibr_codigo)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Servicio Técnico/Líderes/Admin/Logística (capacidad calibraciones_editar):
-- acceso total. Ventas: solo lectura, solo de las órdenes donde su correo de
-- perfil coincide con correo_asesor (no requiere asesor_id resuelto).

ALTER TABLE rv_calibr_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_calibracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_calibracion_parametros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rv_calibr_catalogo select"
  ON rv_calibr_catalogo FOR SELECT TO authenticated
  USING (has_module('calibraciones'));

CREATE POLICY "rv_calibr_catalogo write"
  ON rv_calibr_catalogo FOR ALL TO authenticated
  USING (has_module('calibraciones') AND has_capability('calibraciones_editar'))
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));

CREATE POLICY "ordenes_calibracion select"
  ON ordenes_calibracion FOR SELECT TO authenticated
  USING (
    has_module('calibraciones') AND (
      has_capability('calibraciones_editar')
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.email = ordenes_calibracion.correo_asesor
      )
    )
  );

CREATE POLICY "ordenes_calibracion write"
  ON ordenes_calibracion FOR ALL TO authenticated
  USING (has_module('calibraciones') AND has_capability('calibraciones_editar'))
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));

CREATE POLICY "ordenes_calibracion_parametros select"
  ON ordenes_calibracion_parametros FOR SELECT TO authenticated
  USING (
    has_module('calibraciones') AND (
      has_capability('calibraciones_editar')
      OR EXISTS (
        SELECT 1 FROM ordenes_calibracion oc
        JOIN profiles p ON p.id = auth.uid()
        WHERE oc.id = ordenes_calibracion_parametros.orden_id AND p.email = oc.correo_asesor
      )
    )
  );

CREATE POLICY "ordenes_calibracion_parametros write"
  ON ordenes_calibracion_parametros FOR ALL TO authenticated
  USING (has_module('calibraciones') AND has_capability('calibraciones_editar'))
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));

-- ── Seed: módulo, capacidad y accesos por rol ───────────────────────────────

INSERT INTO modules (key) VALUES ('calibraciones')
ON CONFLICT (key) DO NOTHING;

INSERT INTO capabilities (key) VALUES ('calibraciones_editar')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_modules (role_id, module_key)
SELECT r.id, 'calibraciones' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin', 'Líderes', 'Logística', 'Ventas')
ON CONFLICT DO NOTHING;

INSERT INTO role_capabilities (role_id, capability_key)
SELECT r.id, 'calibraciones_editar' FROM roles r
WHERE r.name IN ('Servicio Técnico', 'Admin', 'Líderes', 'Logística')
ON CONFLICT DO NOTHING;
