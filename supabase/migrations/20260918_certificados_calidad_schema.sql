-- ============================================================
-- Módulo "Certificados de Calidad"
--
-- Los certificados de calidad se generan obligatoriamente desde la
-- plataforma/intranet del fabricante: no se puede reemplazar ese flujo.
-- Este módulo es un "borrador acelerador" interno: guarda plantillas
-- reutilizables por referencia de equipo (mediciones, checklist, soluciones
-- patrón) y un catálogo de archivos para copiar/pegar y descargar más
-- rápido al llenar el formulario real.
-- ============================================================

-- Plantillas por referencia de equipo (ej. "HI 701", "PCA 320-1").
-- No se relaciona con codigos_catalogo/codigos_inet: esos son catálogos de
-- partes/precios de otro dominio y las referencias de certificados de
-- calidad no siempre coinciden 1:1 con ellos.
CREATE TABLE IF NOT EXISTS certificados_calidad_plantillas (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                 text NOT NULL,
  nombre                 text,
  categoria              text,
  mediciones_html        text,
  test_funcional_items   text[] NOT NULL DEFAULT '{}',
  embalaje_items         text[] NOT NULL DEFAULT '{}',
  control_estetico_items text[] NOT NULL DEFAULT '{}',
  notas_generales        text,
  activo                 boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  updated_by             uuid REFERENCES profiles(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificados_calidad_plantillas_codigo
  ON certificados_calidad_plantillas (codigo);
CREATE INDEX IF NOT EXISTS idx_certificados_calidad_plantillas_categoria
  ON certificados_calidad_plantillas (categoria);

-- Catálogo de soluciones estándar / equipos patrón, independiente de las
-- plantillas: se relacionan por categoría porque los mismos buffers de pH
-- (por ejemplo) sirven para cualquier equipo de esa categoría.
CREATE TABLE IF NOT EXISTS certificados_calidad_soluciones_patron (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria         text NOT NULL,
  codigo            text,
  lote              text,
  fecha_expiracion  date,
  descripcion       text,
  activo            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid REFERENCES profiles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_certificados_calidad_soluciones_categoria
  ON certificados_calidad_soluciones_patron (categoria);

-- Metadata de archivos en Storage (ver 20260918b_certificados_calidad_storage.sql).
-- Un archivo puede ser compartido por categoría (ej. "estándares pH", usado
-- por cualquier plantilla de esa categoría) y/o específico de una plantilla.
CREATE TABLE IF NOT EXISTS certificados_calidad_archivos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id   uuid REFERENCES certificados_calidad_plantillas(id) ON DELETE CASCADE,
  categoria      text,
  nombre_archivo text NOT NULL,
  storage_path   text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT certificados_calidad_archivos_target_chk
    CHECK (plantilla_id IS NOT NULL OR categoria IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_certificados_calidad_archivos_plantilla
  ON certificados_calidad_archivos (plantilla_id);
CREATE INDEX IF NOT EXISTS idx_certificados_calidad_archivos_categoria
  ON certificados_calidad_archivos (categoria);

-- Historial de certificados armados con el módulo (borrador interno, no
-- reemplaza el certificado oficial que solo existe en la plataforma externa).
CREATE TABLE IF NOT EXISTS certificados_calidad_generados (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_doc     text,
  numero_doc   text,
  nit          text,
  razon_social text,
  equipos      jsonb NOT NULL DEFAULT '[]',
  soluciones   jsonb NOT NULL DEFAULT '[]',
  mediciones   text,
  checklist    jsonb NOT NULL DEFAULT '{}',
  tecnico      text,
  fecha        date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES profiles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_certificados_calidad_generados_created_at
  ON certificados_calidad_generados (created_at DESC);

ALTER TABLE certificados_calidad_plantillas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificados_calidad_soluciones_patron  ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificados_calidad_archivos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificados_calidad_generados          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificados_calidad_plantillas select" ON certificados_calidad_plantillas
  FOR SELECT TO authenticated USING (has_module('certificados_calidad'));
CREATE POLICY "certificados_calidad_plantillas write" ON certificados_calidad_plantillas
  FOR ALL TO authenticated
  USING (has_module('certificados_calidad')) WITH CHECK (has_module('certificados_calidad'));

CREATE POLICY "certificados_calidad_soluciones select" ON certificados_calidad_soluciones_patron
  FOR SELECT TO authenticated USING (has_module('certificados_calidad'));
CREATE POLICY "certificados_calidad_soluciones write" ON certificados_calidad_soluciones_patron
  FOR ALL TO authenticated
  USING (has_module('certificados_calidad')) WITH CHECK (has_module('certificados_calidad'));

CREATE POLICY "certificados_calidad_archivos select" ON certificados_calidad_archivos
  FOR SELECT TO authenticated USING (has_module('certificados_calidad'));
CREATE POLICY "certificados_calidad_archivos write" ON certificados_calidad_archivos
  FOR ALL TO authenticated
  USING (has_module('certificados_calidad')) WITH CHECK (has_module('certificados_calidad'));

CREATE POLICY "certificados_calidad_generados select" ON certificados_calidad_generados
  FOR SELECT TO authenticated USING (has_module('certificados_calidad'));
CREATE POLICY "certificados_calidad_generados write" ON certificados_calidad_generados
  FOR ALL TO authenticated
  USING (has_module('certificados_calidad')) WITH CHECK (has_module('certificados_calidad'));
