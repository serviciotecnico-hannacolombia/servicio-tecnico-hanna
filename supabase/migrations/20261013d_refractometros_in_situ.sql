-- Fuente Excel SHA256: 8569533d954b07ce75c6008bab112dd26ebfcffa2538734520ddad51e7dfc8ee
-- Migración adicional; no volver a ejecutar las migraciones anteriores.
-- Añadir refractómetros HI 968XX al catálogo y su servicio In Situ de Bogotá.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mant_in_situ_codigos WHERE codigo='MANFT.02') THEN
    RAISE EXCEPTION 'MANFT.02 no existe en Bogotá. Revisar el código actual antes de asignar los refractómetros';
  END IF;
END $$;
INSERT INTO public.codigos_inet(codigo,familia,descripcion,codigo_mantenimiento_insitu) VALUES
  ('HI 96800','p. Refractometers','Refracting Index refractometer - uncompensated readings (nD), temperature compensated to sucrose (nD20) and % Brix','MANFT.02'),
  ('HI 96801','p. Refractometers','Sugar in foods refractometer; sugar content Range: 0 to 85% Brix (% Brix)','MANFT.02'),
  ('HI 96802','p. Refractometers','Sugar in foods refractometer; sugar content Range: 0 to 85% (by weight) (% Fructose)','MANFT.02'),
  ('HI 96803','p. Refractometers','Sugar in foods refractometer; sugar content Range: 0 to 85% (by weight) (% Glucose)','MANFT.02'),
  ('HI 96804','p. Refractometers','Sugar in foods refractometer; sugar content Range: 0 to 85% (by weight) (%Invert Sugar)','MANFT.02'),
  ('HI 96811','p. Refractometers','Sugar in wine refractometer; sugar content Range: 0 to 50 % Brix','MANFT.02'),
  ('HI 96812','p. Refractometers','Sugar in wine refractometer; sugar content Range: 0 to 27 °Baumé','MANFT.02'),
  ('HI 96813','p. Refractometers','Sugar in wine refractometer; sugar content Range: 0 to 50 % Brix; 0.0-25.0 % V/V Potential Alcohol','MANFT.02'),
  ('HI 96814','p. Refractometers','Sugar in wine refractometer; sugar content Range: 0 to 50 % Brix; 0-230° Oechsle; 0-42° KMW','MANFT.02'),
  ('HI 96816','p. Refractometers','Sugar in wine refractometer; sugar content Range: 4.9 to 56.8 %v/v Potential Alcohol (10 to 75 %Brix)','MANFT.02'),
  ('HI 96821','p. Refractometers','Sodium chloride measurement for the food industry Range: (g/100 g)  0-28, (g/100 mL) 0-34, Specific Gravity 1.000 to 1.216, °Baumé 0-26, Temp 0 to 80 °C (32 to 176 °F)','MANFT.02'),
  ('HI 96822','p. Refractometers','Seawater analysis refractometer, Range: PSU 0 to 50, ppt 0 to 150, Specific Gravity (20/20) 1.000 to 1.114, Temperature 0 to 80°C (32 to 176°F)','MANFT.02'),
  ('HI 96831','p. Refractometers','Refractometer for ethylene glycol, Range:  0 to 100 %Volume 0 to -50 °C (32 to -58 °F) Freezing Point','MANFT.02'),
  ('HI 96832','p. Refractometers','Refractometer for propylene glycol, Range: 0 to 100 %Volume 0 to -51 °C (32 to -59.8 °F) Freezing Point','MANFT.02'),
  ('HI 96841','p. Refractometers','Refractometer for beer, Plato 0-30','MANFT.02')
ON CONFLICT (codigo) DO NOTHING;
UPDATE public.codigos_inet SET codigo_mantenimiento_insitu='MANFT.02'
WHERE codigo IN ('HI 96800','HI 96801','HI 96802','HI 96803','HI 96804','HI 96811','HI 96812','HI 96813','HI 96814','HI 96816','HI 96821','HI 96822','HI 96831','HI 96832','HI 96841') AND codigo_mantenimiento_insitu IS NULL;
COMMIT;
