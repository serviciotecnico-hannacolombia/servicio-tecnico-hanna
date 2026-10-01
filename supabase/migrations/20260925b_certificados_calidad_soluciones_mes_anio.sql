-- Los certificados de soluciones estándar solo traen mes y año de
-- vencimiento (nunca un día exacto), así que no podemos seguir guardando un
-- "date" completo que insinúe un día que no está garantizado. Se cambia a
-- texto "AAAA-MM" (lo que produce <input type="month"> en el formulario).

ALTER TABLE certificados_calidad_soluciones_patron
  ALTER COLUMN fecha_expiracion TYPE text USING to_char(fecha_expiracion, 'YYYY-MM');
