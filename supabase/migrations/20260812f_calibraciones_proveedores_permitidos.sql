-- ============================================================
-- Calibraciones: agrega proveedores_permitidos al catálogo RV CALIBR
-- — igual patrón que modalidades_permitidas, pero para restringir qué
-- laboratorio puede hacer cada servicio (ej. RV CALIBR.2 — Volumen es
-- exclusivo de METRONIKA SAS). Un array vacío/NULL significa "sin
-- restricción" (cualquier proveedor), para no bloquear ítems futuros
-- que no se hayan configurado todavía.
-- ============================================================

ALTER TABLE rv_calibr_catalogo ADD COLUMN IF NOT EXISTS proveedores_permitidos text[];

UPDATE rv_calibr_catalogo SET proveedores_permitidos = ARRAY['METRONIKA SAS']
  WHERE codigo = 'RV CALIBR.2';

UPDATE rv_calibr_catalogo SET proveedores_permitidos = ARRAY['METROLOGICAL CENTER SAS', 'METRILAB LTDA', 'CONAMET S.A.S.']
  WHERE codigo <> 'RV CALIBR.2';
