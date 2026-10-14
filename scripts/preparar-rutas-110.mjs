// Consulta única y cacheada; no interviene durante las cotizaciones.
import fs from 'node:fs'
import { detectarPeajes, normalizar } from './rutas-peajes.mjs'
const html=fs.readFileSync(process.argv[2],'utf8')
const extraer=n=>{const l=html.split('\n').find(l=>l.includes(`const ${n} =`));return JSON.parse(l.slice(l.indexOf('=')+1).trim().replace(/;$/,''))}
const ciudades=extraer('CITY_DATABASE'),peajes=extraer('TOLL_DATABASE')
if(fs.existsSync('supabase/data/peajes-complementarios.json')) peajes.push(...JSON.parse(fs.readFileSync('supabase/data/peajes-complementarios.json','utf8')))
const origenes=JSON.parse(fs.readFileSync('supabase/data/mant-in-situ-regional.json','utf8')).sedes
const reglas=fs.existsSync('supabase/data/reglas-peajes.json')?JSON.parse(fs.readFileSync('supabase/data/reglas-peajes.json','utf8')):{}
for(const p of peajes) {
  const regla=reglas[normalizar(p.nombre)]
  if(regla?.latitud!=null) { p.latitud=regla.latitud; p.longitud=regla.longitud }
}
const casetas=JSON.parse(fs.readFileSync('supabase/data/peajes-osm.json','utf8').replace(/^\uFEFF/,'' )).elements
const cache='.cache/rutas-110'
fs.mkdirSync(cache,{recursive:true})
const pausa=()=>new Promise(r=>setTimeout(r,1100))
async function consulta(clave,url) {
  const archivo=`${cache}/${clave}.json`
  if(fs.existsSync(archivo)) return JSON.parse(fs.readFileSync(archivo,'utf8'))
  let error
  for(let intento=0;intento<3;intento++) {
    try {const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(`HTTP ${r.status}`);const d=await r.json();if(d.code!=='Ok')throw Error(d.code);fs.writeFileSync(archivo,JSON.stringify(d));await pausa();return d}
    catch(e){error=e;await pausa()}
  }
  throw error
}
function distancia(s,m) {
  const rad=x=>x*Math.PI/180
  const v=Math.sin(rad(m.latitud-s.lat)/2)**2+Math.cos(rad(s.lat))*Math.cos(rad(m.latitud))*Math.sin(rad(m.longitud-s.lng)/2)**2
  return 6371*2*Math.atan2(Math.sqrt(v),Math.sqrt(1-v))
}
const destinos=[]
for(const sede of origenes) {
  const candidatos=ciudades.filter(m=>distancia(sede,m)<=110)
  for(let start=0;start<candidatos.length;start+=70) {
    const grupo=candidatos.slice(start,start+70)
    const coords=[[sede.lng,sede.lat],...grupo.map(m=>[m.longitud,m.latitud])].map(p=>p.join(',')).join(';')
    const ida=await consulta(`${sede.id}-tabla-${start}-ida`,`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=distance,duration`)
    for(let i=0;i<grupo.length;i++) {
      if(ida.distances[0][i+1]==null || ida.distances[0][i+1]>110000)continue
      const m=grupo[i],coordsIda=`${sede.lng},${sede.lat};${m.longitud},${m.latitud}`,coordsVuelta=`${m.longitud},${m.latitud};${sede.lng},${sede.lat}`
      const ri=(await consulta(`${sede.id}-${m.codigo}-ida`,`https://router.project-osrm.org/route/v1/driving/${coordsIda}?overview=full&geometries=geojson`)).routes[0]
      const rv=(await consulta(`${sede.id}-${m.codigo}-regreso`,`https://router.project-osrm.org/route/v1/driving/${coordsVuelta}?overview=full&geometries=geojson`)).routes[0]
      if(ri.distance>110000) continue
      const pi=detectarPeajes(ri.geometry.coordinates,peajes,reglas,casetas),pv=detectarPeajes(rv.geometry.coordinates,peajes,reglas,casetas)
      destinos.push({sede_id:sede.id,codigo:m.codigo,departamento:m.departamento,municipio:m.municipio,lat:m.latitud,lng:m.longitud,
        ida_km:ri.distance/1000,ida_min:ri.duration/60,regreso_km:rv.distance/1000,regreso_min:rv.duration/60,
        pasos:[...pi.pasos.map(p=>({...p,sentido:'ida'})),...pv.pasos.map(p=>({...p,sentido:'regreso'}))],
        pendientes:[...pi.pendientes.map(p=>({...p,sentido:'ida'})),...pv.pendientes.map(p=>({...p,sentido:'regreso'}))]})
      if(destinos.length%10===0)console.log(`${destinos.length} rutas completas; última: ${sede.nombre} → ${m.municipio}`)
    }
  }
  console.log(`Terminada ${sede.nombre}: ${destinos.filter(d=>d.sede_id===sede.id).length} destinos`)
}
const usados=new Set(destinos.flatMap(d=>[...d.pasos,...d.pendientes].map(p=>normalizar(p.nombre))))
const tarifas=peajes.filter(p=>usados.has(normalizar(reglas[normalizar(p.nombre)]?.nombre??p.nombre)))
fs.writeFileSync('supabase/data/rutas-regionales-110.json',JSON.stringify({consultado_at:new Date().toISOString(),limite_km:110,
  motor:'OpenStreetMap/OSRM',sedes:origenes,destinos,peajes:tarifas},null,2)+'\n')
console.log(`FINAL: ${destinos.length} rutas; ${destinos.filter(d=>d.pendientes.length).length} con ambigüedades de peajes`)
