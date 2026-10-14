// Consulta puntual: node scripts/preparar-regional.mjs <HTML original>
// Los resultados se versionan; la aplicación no consulta OSRM en uso normal.
import fs from 'node:fs'
import crypto from 'node:crypto'

const html = fs.readFileSync(process.argv[2], 'utf8')
function extraer(nombre) {
  const linea = html.split('\n').find(l => l.includes(`const ${nombre} =`))
  return JSON.parse(linea.slice(linea.indexOf('=') + 1).trim().replace(/;$/, ''))
}
const municipios = extraer('CITY_DATABASE')
const peajes = extraer('TOLL_DATABASE')
const sedes = [
  { id: 'barranquilla', nombre: 'Barranquilla', codigo: '08001', lat: 11.0042234, lng: -74.813282,
    direccion: 'Cra. 51B #80-58, Edificio Smart Office Center, Oficina 510, Barranquilla, Atlántico',
    fuente: 'https://www.waze.com/live-map/directions/co/atlantico/barranquilla/smart-office-center?to=place.ChIJUx4xWqYt9I4RuvIdhwWlzZU' },
  { id: 'bucaramanga', nombre: 'Bucaramanga', codigo: '68001', lat: 7.1203369, lng: -73.1161193,
    direccion: 'Carrera 27 #37-33, Green Gold Business Building, Oficina 519, Bucaramanga, Santander',
    fuente: 'https://hannacolombia.com/bucaramanga-asesoria/' },
  { id: 'cali', nombre: 'Cali', codigo: '76001', lat: 3.4348977, lng: -76.5469455,
    direccion: 'Cra. 35A #3BIS-16, San Fernando, Cali, Valle del Cauca',
    fuente: 'https://maps.app.goo.gl/WA5SbLDLnWFVyn8y7' },
  { id: 'medellin', nombre: 'Medellín', codigo: '05001', lat: 6.2011951, lng: -75.5732438,
    direccion: 'Cl. 3 Sur #43A-52, Conjunto inmobiliario 43 avenida PH, Oficina 805, El Poblado, Medellín, Antioquia',
    fuente: 'https://maps.app.goo.gl/mPp1VM6bwKmfjcwJ8' },
  { id: 'pereira', nombre: 'Pereira', codigo: '66001', lat: 4.800043239, lng: -75.691888687,
    direccion: 'Cl. 14 #23-72, Alturia Business Center, Oficina 904, Pereira, Risaralda',
    fuente: 'https://www.waze.com/es-419/live-map/directions?from=place.w.186318896.1863254496.12000105' },
]
const rad = d => d * Math.PI / 180
function distancia(a, b) {
  const v = Math.sin(rad(b.lat-a.lat)/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lng-a.lng)/2)**2
  return 6371 * 2 * Math.atan2(Math.sqrt(v), Math.sqrt(1-v))
}
async function consultar(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
  const data = await response.json()
  if (data.code !== 'Ok') throw new Error(JSON.stringify(data))
  return data
}
const destinos = []
for (const sede of sedes) {
  const candidatos = municipios.filter(m => distancia(sede, {lat:m.latitud,lng:m.longitud}) <= 60)
  const coordenadas = [[sede.lng,sede.lat], ...candidatos.map(m=>[m.longitud,m.latitud])].map(p=>p.join(',')).join(';')
  const tabla = await consultar(`https://router.project-osrm.org/table/v1/driving/${coordenadas}?annotations=distance,duration&sources=0`)
  await new Promise(r=>setTimeout(r,1100))
  const regreso = await consultar(`https://router.project-osrm.org/table/v1/driving/${coordenadas}?annotations=distance,duration&destinations=0`)
  for (let i=0;i<candidatos.length;i++) {
    const m=candidatos[i], metros=tabla.distances[0][i+1], vuelta=regreso.distances[i+1][0]
    if (metros==null || vuelta==null || metros>60000) continue
    destinos.push({sede_id:sede.id,codigo:m.codigo,departamento:m.departamento,municipio:m.municipio,
      lat:m.latitud,lng:m.longitud,ida_km:metros/1000,ida_min:tabla.durations[0][i+1]/60,
      regreso_km:vuelta/1000,regreso_min:regreso.durations[i+1][0]/60})
  }
  console.log(`${sede.nombre}: ${destinos.filter(d=>d.sede_id===sede.id).length} destinos a 60 km o menos`)
  await new Promise(r=>setTimeout(r,1100))
}
// Extraer peajes cercanos como catálogo de referencia; no implica que se cobren
// en una ruta. La asignación/total por destino requiere confirmación explícita.
const peajesRegionales=peajes.filter(p=>sedes.some(s=>distancia(s,{lat:p.latitud,lng:p.longitud})<=85))
const datos={fuente_html_sha256:crypto.createHash('sha256').update(html).digest('hex'),consultado_at:new Date().toISOString(),
  motor:'OpenStreetMap/OSRM',limite_km:60,criterio:'Distancia vial de ida desde la oficina hasta la cabecera municipal, sin margen',
  sedes,destinos,peajes:peajesRegionales}
fs.mkdirSync('supabase/data',{recursive:true})
fs.writeFileSync('supabase/data/mant-in-situ-regional.json',JSON.stringify(datos,null,2)+'\n')
