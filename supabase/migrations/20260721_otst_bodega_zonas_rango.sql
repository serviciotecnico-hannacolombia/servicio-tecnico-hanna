-- ============================================================
-- Bodega OTST: zonas de rotación como rango de meses
-- (antes solo permitía asignar columnas a un único mes/año)
-- ============================================================

ALTER TABLE otst_bodega_zonas RENAME COLUMN mes  TO mes_inicio;
ALTER TABLE otst_bodega_zonas RENAME COLUMN anio TO anio_inicio;

ALTER TABLE otst_bodega_zonas ADD COLUMN IF NOT EXISTS mes_fin  int;
ALTER TABLE otst_bodega_zonas ADD COLUMN IF NOT EXISTS anio_fin int;

UPDATE otst_bodega_zonas SET mes_fin = mes_inicio, anio_fin = anio_inicio WHERE mes_fin IS NULL;

ALTER TABLE otst_bodega_zonas ALTER COLUMN mes_fin  SET NOT NULL;
ALTER TABLE otst_bodega_zonas ALTER COLUMN anio_fin SET NOT NULL;

-- La unicidad por (mes, anio) ya no aplica: una misma zona puede
-- cubrir varios meses y pueden coexistir rangos superpuestos.
ALTER TABLE otst_bodega_zonas DROP CONSTRAINT IF EXISTS otst_bodega_zonas_mes_anio_key;

ALTER TABLE otst_bodega_zonas ADD CONSTRAINT otst_bodega_zonas_mes_fin_check CHECK (mes_fin BETWEEN 1 AND 12);
ALTER TABLE otst_bodega_zonas ADD CONSTRAINT otst_bodega_zonas_rango_check
  CHECK ((anio_fin * 12 + mes_fin) >= (anio_inicio * 12 + mes_inicio));
