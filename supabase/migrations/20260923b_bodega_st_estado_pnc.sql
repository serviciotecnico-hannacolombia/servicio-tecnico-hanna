-- Bodega ST: nuevo estado "Producto No Conforme" (Bodega PNC), destino final
-- del equipo cuando se determina que no es apto y se envía a disposición final.

ALTER TABLE bodega_st_registros DROP CONSTRAINT IF EXISTS bodega_st_registros_estado_check;

ALTER TABLE bodega_st_registros ADD CONSTRAINT bodega_st_registros_estado_check CHECK (estado IN (
  'en_diagnostico', 'en_reparacion', 'incompleto_espera_partes', 'restaurado_listo',
  'producto_no_conforme'
));
