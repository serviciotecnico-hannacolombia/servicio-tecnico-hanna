CREATE TABLE IF NOT EXISTS void_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id TEXT UNIQUE NOT NULL,
  qr_equipo TEXT,
  void_blanco TEXT,
  void_gris TEXT,
  libro TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bodega_st_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id TEXT UNIQUE NOT NULL,
  qr_equipo TEXT,
  referencia TEXT,
  numero_serie TEXT,
  nombre_equipo TEXT,
  estado TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);