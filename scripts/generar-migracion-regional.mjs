// node scripts/generar-migracion-regional.mjs
import fs from 'node:fs'
const datos = JSON.parse(fs.readFileSync('supabase/data/mant-in-situ-regional.json','utf8'))
const valor = v => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'","''")}'`
const insertar = (tabla, columnas, filas) => `INSERT INTO public.${tabla} (${columnas.join(',')}) VALUES\n${filas.map(f=>'  ('+f.map(valor).join(',')+')').join(',\n')};\n`
let sql = `-- Datos extraídos del HTML; rutas consultadas desde oficinas con OSRM.\n-- Consulta: ${datos.consultado_at}. Distancia de ida <= 60 km, sin margen.\n-- Los peajes importados son referencia histórica; confirmar cada ruta antes de cotizar.\nBEGIN;\n`
sql += `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mant_in_situ_config WHERE id=1)
    OR NOT EXISTS (SELECT 1 FROM public.mant_in_situ_codigos) THEN
    RAISE EXCEPTION 'Configura jornada y precios de Mant. In Situ antes de copiar los valores regionales';
  END IF;
END $$;\n`
sql += insertar('mant_regional_sedes',['id','nombre','codigo','direccion','lat','lng','fuente'],datos.sedes.map(s=>[s.id,s.nombre,s.codigo,s.direccion,s.lat,s.lng,s.fuente]))
sql += insertar('mant_regional_destinos',['sede_id','codigo','departamento','municipio','lat','lng','ida_km','ida_min','regreso_km','regreso_min','consultado_at'],datos.destinos.map(d=>[d.sede_id,d.codigo,d.departamento,d.municipio,d.lat,d.lng,d.ida_km,d.ida_min,d.regreso_km,d.regreso_min,datos.consultado_at]))
sql += insertar('mant_regional_peajes',['nombre','fuente','tarifa_categoria_i','lat','lng','sector','sentido','actualizado'],datos.peajes.map(p=>[p.nombre,p.fuente,p.tarifaCategoriaI,p.latitud,p.longitud,p.sector,p.sentido,p.actualizado]))
sql += `
-- Copias iniciales independientes. Cambiar precios regionales no modifica Bogotá.
INSERT INTO public.mant_regional_config
 SELECT s.id,c.jornada_horas,c.costo_km,c.rendimiento_km_galon,c.precio_galon,c.margen_recorrido_pct,c.descripcion_servicio,now()
 FROM public.mant_regional_sedes s CROSS JOIN public.mant_in_situ_config c WHERE c.id=1;
INSERT INTO public.mant_regional_codigos(sede_id,codigo,precio,horas)
 SELECT s.id,c.codigo,c.precio,c.horas FROM public.mant_regional_sedes s CROSS JOIN public.mant_in_situ_codigos c;
INSERT INTO public.mant_regional_equipos(sede_id,referencia,codigo,horas,precio,descripcion_servicio)
 SELECT s.id,i.codigo,i.codigo_mantenimiento_insitu,e.horas,e.precio,e.descripcion_servicio
 FROM public.mant_regional_sedes s CROSS JOIN public.codigos_inet i
 JOIN public.mant_in_situ_codigos c ON c.codigo=i.codigo_mantenimiento_insitu
 LEFT JOIN public.mant_in_situ_equipos e ON e.referencia=i.codigo;
COMMIT;
`
fs.writeFileSync('supabase/migrations/20261013c_mant_in_situ_regional_datos.sql',sql)
console.log(`${datos.destinos.length} rutas, ${datos.peajes.length} peajes de referencia`)
