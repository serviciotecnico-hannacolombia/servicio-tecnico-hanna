-- ============================================================
-- Calibraciones: directorio de asesores comerciales. Se usa para
-- relacionar el correo_asesor de una orden con un asesor conocido
-- (nombre, plataforma) — gestionable desde la pestaña "Asesores".
-- ============================================================

CREATE TABLE IF NOT EXISTS calibraciones_asesores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  correo      text NOT NULL UNIQUE,
  plataforma  text,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calibraciones_asesores_correo ON calibraciones_asesores (correo);

ALTER TABLE calibraciones_asesores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calibraciones_asesores select"
  ON calibraciones_asesores FOR SELECT TO authenticated
  USING (has_module('calibraciones'));

CREATE POLICY "calibraciones_asesores write"
  ON calibraciones_asesores FOR ALL TO authenticated
  USING (has_module('calibraciones') AND has_capability('calibraciones_editar'))
  WITH CHECK (has_module('calibraciones') AND has_capability('calibraciones_editar'));

-- ── Seed inicial (Nombre, Correo, Plataforma) ───────────────────────────────

INSERT INTO calibraciones_asesores (nombre, correo, plataforma) VALUES
  ('Luisa Suarez',              'luisa@hannacolombia.com',              'Preferente'),
  ('Carolina Herrera',          'carolina.herrera@hannacolombia.com',   'Nuevos negocios'),
  ('Valentina Rozo',            'valentina@hannacolombia.com',          'Nuevos negocios'),
  ('Paola Murillo',             'paola.murillo@hannacolombia.com',      'Preferente'),
  ('Wilmar Muñoz',              'wilmar@hannacolombia.com',             'Nuevos negocios'),
  ('George Riaño',              'george@hannacolombia.com',             'Televentas'),
  ('Andres Cardona',            'andres.cardona@hannacolombia.com',     'Preferente'),
  ('Alejandra Garcia',          'alejandra@hannacolombia.com',          'Televentas'),
  ('Adriana Llano',             'adriana@hannacolombia.com',            'Televentas'),
  ('Jennifer Ariza',            'jennifer.ariza@hannacolombia.com',     'Preferente'),
  ('Carolina Bohorquez Peña',   'carolina@hannacolombia.com',           'Nuevos negocios'),
  ('Nicolas Ruiz',              'nicolas.ruiz@hannacolombia.com',       'Preferente'),
  ('Jessica Agudelo Carmona',   'jessica@hannacolombia.com',            'Preferente'),
  ('Briyith Rodriguez',         'briyith@hannacolombia.com',            'Preferente'),
  ('Mauricio Casañas',          'mauricio.casanas@hannacolombia.com',   'Preferente'),
  ('Wilmer Rubio',              'distribuidores@hannacolombia.com',     'Canal Indirecto Y Cooperativo'),
  ('Andrea Cortés',             'andrea.cortes@hannacolombia.com',      'Preferente'),
  ('Deisy Gomez',               'deisy@hannacolombia.com',              'Nuevos negocios'),
  ('Ventas',                    'ventas@hannacolombia.com',             NULL),
  ('Angie Maryan Sequeda',      'angie.sequeda@hannacolombia.com',      'Televentas'),
  ('Laura Osorio',              'laura.osorio@hannacolombia.com',       'Televentas'),
  ('Luisa Veloza',              'luisa.veloza@hannacolombia.com',       'Educación'),
  ('Angie Cano',                'angie@hannacolombia.com',              'Preferente'),
  ('Sharon Cuesta',             'sharon@hannacolombia.com',             'Nuevos negocios'),
  ('Elina Madrid',              'elina@hannacolombia.com',              'Preferente'),
  ('Isabella Vera',             'isabela@hannacolombia.com',            'Nuevos negocios'),
  ('Natalia Rodríguez',         'natalia.rodriguez@hannacolombia.com',  'Televentas'),
  ('Christian Sanchez',         'christian@hannacolombia.com',          'Televentas'),
  ('Alejandra Bohorquez',       'alejandra.bohorquez@hannacolombia.com','Nuevos negocios'),
  ('Karol Pardo',               'karol@hannacolombia.com',              'Nuevos negocios'),
  ('Linda Navarro',             'linda@hannacolombia.com',              'Nuevos negocios'),
  ('Tatiana Castro',            'tatiana.castro@hannacolombia.com',     'Nuevos negocios'),
  ('Geraldine Beleño',          'geraldine@hannacolombia.com',          'Territory'),
  ('Sebastián Hoyos',           'sebastian.hoyos@hannacolombia.com',    'Preferente'),
  ('Zharith Lopez',             'zharith@hannacolombia.com',            'Televentas'),
  ('Omar Hurtado',              'omar@hannacolombia.com',               'Nuevos negocios'),
  ('Johana Hernandez',          'johana.hernandez@hannacolombia.com',   NULL)
ON CONFLICT (correo) DO NOTHING;
