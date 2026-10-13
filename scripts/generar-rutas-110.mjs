import fs from 'node:fs'
const d=JSON.parse(fs.readFileSync('supabase/data/rutas-regionales-110.json','utf8'))
const q=v=>v==null?'NULL':typeof v==='number'?String(v):typeof v==='boolean'?String(v):`'${String(v).replaceAll("'","''")}'`
const reglas=JSON.parse(fs.readFileSync('supabase/data/reglas-peajes.json','utf8'))
const {normalizar}=await import('./rutas-peajes.mjs')
const tarifas=new Map()
for(const p of d.peajes) {
  const regla=reglas[normalizar(p.nombre)]??{}
  const nombre=regla.nombre??p.nombre
  tarifas.set(nombre,{...p,nombre,tarifaCategoriaI:regla.tarifa??p.tarifaCategoriaI,
    fuente_revision:regla.fuente??null,vigencia_hasta:regla.vigencia_hasta??null})
}
let sql=`-- ACTUALIZACIÓN REGIONAL: 110 km y peajes según ruta de oficina ida/regreso.
-- Requiere la instalación regional actual (catálogo común ya creado).
-- Se preservan los precios base y los ajustes manuales confirmados de peajes.
BEGIN;
ALTER TABLE public.mant_regional_config ADD COLUMN recargo_km_adicional numeric NOT NULL DEFAULT 300 CHECK(recargo_km_adicional>=0);
ALTER TABLE public.mant_regional_config ADD COLUMN recargo_solo_ida boolean NOT NULL DEFAULT true;
ALTER TABLE public.mant_regional_destinos DROP CONSTRAINT mant_regional_destinos_ida_km_check;
ALTER TABLE public.mant_regional_destinos ADD CONSTRAINT mant_regional_destinos_ida_km_check CHECK(ida_km>=0 AND ida_km<=110);
ALTER TABLE public.mant_regional_destinos ADD COLUMN peajes_ruta_verificados boolean NOT NULL DEFAULT false;
ALTER TABLE public.mant_regional_destinos ADD COLUMN revision_ruta jsonb;
ALTER TABLE public.mant_regional_peajes ADD COLUMN vigencia_hasta date;
ALTER TABLE public.mant_regional_peajes ADD COLUMN fuente_revision text;
CREATE TABLE public.mant_regional_pasos(
 sede_id text NOT NULL, destino_codigo text NOT NULL, peaje_nombre text NOT NULL REFERENCES public.mant_regional_peajes(nombre),
 sentido text NOT NULL CHECK(sentido IN ('ida','regreso')),
 PRIMARY KEY(sede_id,destino_codigo,peaje_nombre,sentido),
 FOREIGN KEY(sede_id,destino_codigo) REFERENCES public.mant_regional_destinos(sede_id,codigo) ON DELETE CASCADE
);
ALTER TABLE public.mant_regional_pasos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mant_regional_pasos TO authenticated;
CREATE POLICY "regional pasos lectura" ON public.mant_regional_pasos FOR SELECT TO authenticated USING(public.has_module('mant_in_situ_regional'));
CREATE POLICY "regional pasos escritura" ON public.mant_regional_pasos FOR ALL TO authenticated
 USING(public.has_module('mant_in_situ_regional') AND public.has_capability('mant_in_situ_regional_editar'))
 WITH CHECK(public.has_module('mant_in_situ_regional') AND public.has_capability('mant_in_situ_regional_editar'));
INSERT INTO public.mant_regional_peajes(nombre,fuente,tarifa_categoria_i,lat,lng,sector,sentido,actualizado,fuente_revision,vigencia_hasta) VALUES
${[...tarifas.values()].map(p=>'('+[p.nombre,p.fuente,p.tarifaCategoriaI,p.latitud,p.longitud,p.sector,p.sentido,p.actualizado,p.fuente_revision,p.vigencia_hasta].map(q).join(',')+')').join(',\n')}
ON CONFLICT(nombre) DO UPDATE SET fuente_revision=EXCLUDED.fuente_revision,vigencia_hasta=EXCLUDED.vigencia_hasta,
 tarifa_categoria_i=CASE WHEN EXCLUDED.nombre IN ('PAVAS','PAPIROS') THEN EXCLUDED.tarifa_categoria_i ELSE mant_regional_peajes.tarifa_categoria_i END;
INSERT INTO public.mant_regional_destinos(sede_id,codigo,departamento,municipio,lat,lng,ida_km,ida_min,regreso_km,regreso_min,consultado_at,peajes_ruta_verificados,revision_ruta) VALUES
${d.destinos.map(r=>'('+[r.sede_id,r.codigo,r.departamento,r.municipio,r.lat,r.lng,r.ida_km,r.ida_min,r.regreso_km,r.regreso_min,d.consultado_at,r.pendientes.length===0,JSON.stringify({motor:d.motor,consultado_at:d.consultado_at,pendientes:r.pendientes})].map(q).join(',')+')').join(',\n')}
ON CONFLICT(sede_id,codigo) DO UPDATE SET ida_km=EXCLUDED.ida_km,ida_min=EXCLUDED.ida_min,
 regreso_km=EXCLUDED.regreso_km,regreso_min=EXCLUDED.regreso_min,consultado_at=EXCLUDED.consultado_at,
 peajes_ruta_verificados=EXCLUDED.peajes_ruta_verificados,revision_ruta=EXCLUDED.revision_ruta;
`
const pasos=d.destinos.flatMap(r=>r.pasos.map(p=>[r.sede_id,r.codigo,p.nombre,p.sentido]))
if(pasos.length)sql+=`INSERT INTO public.mant_regional_pasos(sede_id,destino_codigo,peaje_nombre,sentido) VALUES\n${pasos.map(r=>'('+r.map(q).join(',')+')').join(',\n')}\nON CONFLICT DO NOTHING;\n`
sql+='COMMIT;\n'
fs.writeFileSync('supabase/migrations/20261013g_regional_rutas_110_peajes.sql',sql)
fs.writeFileSync('docs/sql/actualizar-regional-110-peajes.sql',sql)
console.log(`${d.destinos.length} rutas, ${pasos.length} pasos de peaje, ${d.destinos.filter(r=>r.pendientes.length).length} excepciones`)
