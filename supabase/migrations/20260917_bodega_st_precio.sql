-- Bodega ST: campo de precio por equipo para consolidar el valor total en bodega.

ALTER TABLE bodega_st_registros ADD COLUMN IF NOT EXISTS precio numeric;
