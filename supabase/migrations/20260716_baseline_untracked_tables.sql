-- ============================================================
-- Baseline: tablas que existían en la BD remota pero nunca se
-- habían versionado en supabase/migrations/ (se crearon a mano
-- desde el SQL editor de Supabase). Este archivo documenta el
-- estado real actual para que el historial de migraciones quede
-- completo y reproducible; no cambia comportamiento.
--
-- Deliberadamente NO recrea las políticas RLS actuales de estas
-- tablas (todas "USING (true)", algunas duplicadas/redundantes):
-- la migración 20260716c_rls_module_gating.sql las reemplaza por
-- completo justo después, en el mismo despliegue.
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  full_name    text,
  role         text NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  activo       boolean NOT NULL DEFAULT true,
  avatar_emoji text,
  avatar_color text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tarifas_envio (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero         int,
  departamento   text NOT NULL,
  ciudad         text NOT NULL,
  promesa        text,
  tarifa_hasta_2m int,
  tarifa_2m_3m    int,
  tarifa_3m_4m    int,
  tarifa_4m_5m    int,
  tarifa_5m_6m    int,
  tarifa_mas_6m   int,
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (ciudad, departamento)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tarifas_ciudad_depto ON tarifas_envio (ciudad, departamento);
CREATE INDEX IF NOT EXISTS idx_tarifas_ciudad ON tarifas_envio (lower(ciudad));
CREATE INDEX IF NOT EXISTS idx_tarifas_depto  ON tarifas_envio (departamento);

CREATE TABLE IF NOT EXISTS codigos_inet (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                text NOT NULL,
  familia               text,
  descripcion           text,
  codigo_mantenimiento  text,
  codigo_calibracion    text,
  created_at            timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_codigos_inet_codigo ON codigos_inet (codigo);

CREATE TABLE IF NOT EXISTS codigos_sp_price (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL,
  product         text NOT NULL,
  description     text,
  precio_a_cobrar numeric NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS codigos_sp_price_code_idx    ON codigos_sp_price (code);
CREATE INDEX IF NOT EXISTS codigos_sp_price_product_idx ON codigos_sp_price (product);

CREATE TABLE IF NOT EXISTS consumibles_llegada (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  fecha       date NOT NULL,
  qr          text NOT NULL,
  nombre      text,
  ref         text,
  lote        text,
  venc        text,
  responsable text,
  ubicacion   text NOT NULL,
  obs         text,
  vol         text
);

CREATE TABLE IF NOT EXISTS consumibles_destape (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  fecha       date NOT NULL,
  qr          text NOT NULL,
  llegada_id  bigint REFERENCES consumibles_llegada(id) ON DELETE SET NULL,
  ref         text,
  nombre      text,
  lote        text,
  responsable text,
  ubicacion   text NOT NULL,
  obs         text
);

CREATE TABLE IF NOT EXISTS indicadores_metas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio       int NOT NULL,
  categoria  text NOT NULL CHECK (categoria IN ('mantenimiento','calibracion','codigos_hanna')),
  mes        int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  meta       bigint NOT NULL,
  porcentaje numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (anio, categoria, mes)
);

CREATE TABLE IF NOT EXISTS indicadores_reales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio            int NOT NULL,
  categoria       text NOT NULL CHECK (categoria IN ('mantenimiento','calibracion','codigos_hanna')),
  mes             int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor_real      bigint NOT NULL DEFAULT 0,
  actualizado_por text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (anio, categoria, mes)
);

CREATE TABLE IF NOT EXISTS llamadas_diario (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otst       text NOT NULL,
  cliente    text,
  ingeniero  text,
  garantia   text NOT NULL DEFAULT 'NO' CHECK (garantia IN ('SI','NO')),
  estado     text NOT NULL DEFAULT '' CHECK (estado IN ('CIERRE','CONTACTADO','SIN CONTACTO','NO LLAMADO','')),
  hora       text,
  usuario    text,
  fecha_dia  date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS llamadas_historico (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  otst         text NOT NULL,
  cliente      text,
  ingeniero    text,
  garantia     text NOT NULL DEFAULT 'NO' CHECK (garantia IN ('SI','NO')),
  estado       text,
  hora         text,
  usuario      text,
  fecha_dia    date,
  archivado_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carrera_config (
  fecha_dia date PRIMARY KEY,
  usuario   text NOT NULL
);

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas_envio         ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_inet          ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_sp_price      ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumibles_llegada   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumibles_destape   ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicadores_metas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicadores_reales    ENABLE ROW LEVEL SECURITY;
ALTER TABLE llamadas_diario       ENABLE ROW LEVEL SECURITY;
ALTER TABLE llamadas_historico    ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrera_config        ENABLE ROW LEVEL SECURITY;

-- Trigger de auth.users no relacionado con roles (mantiene full_name
-- sincronizado con user_metadata) — se deja intacto.
CREATE OR REPLACE FUNCTION handle_user_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
begin
  update public.profiles
  set full_name = coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  where id = new.id;
  return new;
end;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_update();
