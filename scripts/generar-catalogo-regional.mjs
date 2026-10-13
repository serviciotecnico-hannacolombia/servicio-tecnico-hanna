// Genera la migración adicional a partir del Excel extraído y precios confirmados.
// node scripts/generar-catalogo-regional.mjs
import fs from 'node:fs'
const excel = JSON.parse(fs.readFileSync('supabase/data/mant-regional-excel.json','utf8'))
const confirmado = JSON.parse(fs.readFileSync('supabase/data/mant-regional-precios-confirmados.json','utf8'))
const q = v => v == null ? 'NULL' : `'${String(v).replaceAll("'","''")}'`
const refractometros = excel.equipos.filter(e=>/^HI 968\d{2}$/.test(e.referencia))
let sql = `-- Fuente Excel SHA256: ${excel.fuente_sha256}
-- Migración adicional; no volver a ejecutar las migraciones anteriores.
-- Añadir refractómetros HI 968XX al catálogo y su servicio In Situ de Bogotá.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mant_in_situ_codigos WHERE codigo='MANFT.02') THEN
    RAISE EXCEPTION 'MANFT.02 no existe en Bogotá. Revisar el código actual antes de asignar los refractómetros';
  END IF;
END $$;
INSERT INTO public.codigos_inet(codigo,familia,descripcion,codigo_mantenimiento_insitu) VALUES
${refractometros.map(e=>`  (${q(e.referencia)},${q(e.familia)},${q(e.descripcion)},'MANFT.02')`).join(',\n')}
ON CONFLICT (codigo) DO NOTHING;
UPDATE public.codigos_inet SET codigo_mantenimiento_insitu='MANFT.02'
WHERE codigo IN (${refractometros.map(e=>q(e.referencia)).join(',')}) AND codigo_mantenimiento_insitu IS NULL;
COMMIT;
`
fs.writeFileSync('supabase/migrations/20261013d_refractometros_in_situ.sql',sql)

// Un único catálogo regional. Migrar la estructura ya creada sin editar b/c,
// que el usuario puede haber ejecutado en Supabase.
sql = `-- Catálogo regional común a todas las sedes, confirmado por el usuario.
-- Aplicar después de 20261013b/c/d; una vez, antes del frontend actualizado.
BEGIN;
CREATE TABLE public.mant_regional_servicios (
  codigo text PRIMARY KEY, precio numeric NOT NULL CHECK(precio>0),
  horas numeric NOT NULL CHECK(horas>0), updated_at timestamptz NOT NULL DEFAULT now()
);
-- Los precios aprobados del Excel prevalecen sobre las copias provisionales.
DO $$ BEGIN
  IF EXISTS(SELECT codigo FROM public.mant_regional_codigos GROUP BY codigo
    HAVING count(DISTINCT horas)>1 OR
      (codigo NOT IN (${Object.keys(confirmado.codigos).map(q).join(',')}) AND count(DISTINCT precio)>1)) THEN
    RAISE EXCEPTION 'Hay tiempos distintos o precios no confirmados divergentes entre sedes; revisar antes de consolidar';
  END IF;
END $$;
INSERT INTO public.mant_regional_servicios(codigo,precio,horas)
SELECT codigo,min(precio),min(horas) FROM public.mant_regional_codigos GROUP BY codigo;
`
for (const [codigo, precio] of Object.entries(confirmado.codigos)) {
  if (codigo === 'MANT.TESTER.01' && confirmado.horas_tester == null) continue
  const horas = codigo === 'MANT.TESTER.01' ? String(confirmado.horas_tester) : `(SELECT horas FROM public.mant_in_situ_codigos WHERE codigo=${q(codigo)})`
  sql += `INSERT INTO public.mant_regional_servicios(codigo,precio,horas) VALUES(${q(codigo)},${precio},${horas})
ON CONFLICT(codigo) DO UPDATE SET precio=EXCLUDED.precio;
`
}
sql += `
ALTER TABLE public.mant_regional_servicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regional servicios lectura" ON public.mant_regional_servicios FOR SELECT TO authenticated USING(public.has_module('mant_in_situ_regional'));
CREATE POLICY "regional servicios escritura" ON public.mant_regional_servicios FOR ALL TO authenticated
USING(public.has_module('mant_in_situ_regional') AND public.has_capability('mant_in_situ_regional_editar'))
WITH CHECK(public.has_module('mant_in_situ_regional') AND public.has_capability('mant_in_situ_regional_editar'));
-- Asignaciones/tiempos de equipo también comunes, para que la base no varíe por sede.
CREATE TABLE public.mant_regional_referencias (
  referencia text PRIMARY KEY, codigo text NOT NULL REFERENCES public.mant_regional_servicios(codigo) ON UPDATE CASCADE,
  horas numeric CHECK(horas>0), precio numeric CHECK(precio>0), descripcion_servicio text
);
-- Evitar elegir silenciosamente una sede si hubo ediciones distintas antes de migrar.
DO $$ BEGIN
  IF EXISTS(SELECT referencia FROM public.mant_regional_equipos GROUP BY referencia
    HAVING count(DISTINCT ROW(codigo,horas,precio,descripcion_servicio))>1) THEN
    RAISE EXCEPTION 'Hay asignaciones regionales distintas entre sedes. Unificarlas antes de migrar el catálogo común';
  END IF;
END $$;
INSERT INTO public.mant_regional_referencias SELECT DISTINCT referencia,codigo,horas,precio,descripcion_servicio FROM public.mant_regional_equipos;
ALTER TABLE public.mant_regional_referencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regional referencias lectura" ON public.mant_regional_referencias FOR SELECT TO authenticated USING(public.has_module('mant_in_situ_regional'));
CREATE POLICY "regional referencias escritura" ON public.mant_regional_referencias FOR ALL TO authenticated
USING(public.has_module('mant_in_situ_regional') AND public.has_capability('mant_in_situ_regional_editar'))
WITH CHECK(public.has_module('mant_in_situ_regional') AND public.has_capability('mant_in_situ_regional_editar'));
DROP TABLE public.mant_regional_equipos;
DROP TABLE public.mant_regional_codigos;

-- Metadata del Excel solo para referencias que faltan; no sobrescribir Códigos.
INSERT INTO public.codigos_inet(codigo,familia,descripcion) VALUES
${excel.equipos.map(e=>`  (${q(e.referencia)},${q(e.familia)},${q(e.descripcion)})`).join(',\n')}
ON CONFLICT(codigo) DO NOTHING;

-- Catálogo regional explícito del Excel; no tocar códigos normales/In Situ Bogotá.
INSERT INTO public.mant_regional_referencias(referencia,codigo)
SELECT v.referencia,v.codigo FROM (VALUES
${excel.equipos.map(e=>`  (${q(e.referencia)},${q(e.codigo)})`).join(',\n')}
) AS v(referencia,codigo)
ON CONFLICT(referencia) DO UPDATE SET codigo=EXCLUDED.codigo,precio=NULL;

-- HI 839800: copiar asignación y tiempos de Bogotá; precio regional aprobado 900.000.
DO $$ BEGIN
  IF (SELECT count(*) FROM public.codigos_inet i JOIN public.mant_in_situ_codigos c
    ON c.codigo=i.codigo_mantenimiento_insitu WHERE i.codigo IN ('HI 839800-01','HI 839800-02'))<>2 THEN
    RAISE EXCEPTION 'Falta la asignación In Situ Bogotá de HI 839800-01/-02; revisar antes de copiar al regional';
  END IF;
END $$;
INSERT INTO public.mant_regional_servicios(codigo,precio,horas)
SELECT DISTINCT c.codigo,${confirmado.reactor_precio},c.horas FROM public.codigos_inet i
JOIN public.mant_in_situ_codigos c ON c.codigo=i.codigo_mantenimiento_insitu
WHERE i.codigo IN ('HI 839800-01','HI 839800-02')
ON CONFLICT(codigo) DO UPDATE SET precio=EXCLUDED.precio;
INSERT INTO public.mant_regional_referencias(referencia,codigo,horas,descripcion_servicio)
SELECT i.codigo,i.codigo_mantenimiento_insitu,e.horas,e.descripcion_servicio
FROM public.codigos_inet i
JOIN public.mant_in_situ_codigos c ON c.codigo=i.codigo_mantenimiento_insitu
LEFT JOIN public.mant_in_situ_equipos e ON e.referencia=i.codigo
WHERE i.codigo IN ('HI 839800-01','HI 839800-02')
ON CONFLICT(referencia) DO UPDATE SET codigo=EXCLUDED.codigo,precio=NULL,horas=EXCLUDED.horas;
COMMIT;
`
if (confirmado.horas_tester != null && confirmado.reactor_precio != null)
  fs.writeFileSync('supabase/migrations/20261013e_regional_catalogo_excel.sql',sql)
console.log(`${refractometros.length} refractómetros; catálogo regional: ${Object.keys(confirmado.codigos).length} precios confirmados`)
