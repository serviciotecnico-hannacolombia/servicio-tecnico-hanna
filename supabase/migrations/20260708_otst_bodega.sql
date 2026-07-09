-- ============================================================
-- Módulo: Bodega OTST (gestión de ubicación de equipos)
-- ============================================================

CREATE TABLE IF NOT EXISTS otst_bodega (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otst          text NOT NULL,
  correo_cliente text,
  mes_ingreso   int  NOT NULL CHECK (mes_ingreso BETWEEN 1 AND 12),
  anio_ingreso  int  NOT NULL,
  columna       char(1) NOT NULL CHECK (columna BETWEEN 'A' AND 'H'),
  fila          int  NOT NULL CHECK (fila BETWEEN 1 AND 4),
  subcolumna    int  NOT NULL CHECK (subcolumna BETWEEN 1 AND 2),
  estado        text NOT NULL DEFAULT 'en_bodega' CHECK (estado IN ('en_bodega','contactado','retirado')),
  nota          text,
  usuario       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otst_bodega_otst    ON otst_bodega (otst);
CREATE INDEX IF NOT EXISTS idx_otst_bodega_estado  ON otst_bodega (estado);

CREATE TABLE IF NOT EXISTS otst_bodega_movimientos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otst_id            uuid NOT NULL REFERENCES otst_bodega(id) ON DELETE CASCADE,
  tipo               text NOT NULL CHECK (tipo IN ('ingreso','traslado','contacto','retiro')),
  usuario            text,
  ubicacion_origen   text,
  ubicacion_destino  text,
  motivo             text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otst_bodega_mov_otst_id ON otst_bodega_movimientos (otst_id);

CREATE TABLE IF NOT EXISTS otst_bodega_zonas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes        int  NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio       int  NOT NULL,
  columnas   text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mes, anio)
);

CREATE TABLE IF NOT EXISTS otst_bodega_config (
  id            int PRIMARY KEY DEFAULT 1,
  umbral_meses  int NOT NULL DEFAULT 3,
  CONSTRAINT otst_bodega_config_single_row CHECK (id = 1)
);

INSERT INTO otst_bodega_config (id, umbral_meses) VALUES (1, 3)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE otst_bodega             ENABLE ROW LEVEL SECURITY;
ALTER TABLE otst_bodega_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE otst_bodega_zonas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE otst_bodega_config      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read otst_bodega"
  ON otst_bodega FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all otst_bodega"
  ON otst_bodega FOR ALL TO authenticated USING (true);

CREATE POLICY "auth read otst_bodega_movimientos"
  ON otst_bodega_movimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all otst_bodega_movimientos"
  ON otst_bodega_movimientos FOR ALL TO authenticated USING (true);

CREATE POLICY "auth read otst_bodega_zonas"
  ON otst_bodega_zonas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all otst_bodega_zonas"
  ON otst_bodega_zonas FOR ALL TO authenticated USING (true);

CREATE POLICY "auth read otst_bodega_config"
  ON otst_bodega_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth all otst_bodega_config"
  ON otst_bodega_config FOR ALL TO authenticated USING (true);
