// Detección sobre la geometría vial; nunca por distancia entre ciudades.
export const normalizar = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim()
export function cercania(punto, linea) {
  let mejor={metros:Infinity,dx:0,dy:0}
  const escala=111195, cos=Math.cos(punto.latitud*Math.PI/180)
  for(let i=1;i<linea.length;i++) {
    const a=linea[i-1],b=linea[i]
    const ax=(a[0]-punto.longitud)*escala*cos,ay=(a[1]-punto.latitud)*escala
    const bx=(b[0]-punto.longitud)*escala*cos,by=(b[1]-punto.latitud)*escala
    const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy
    const t=den?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/den)):0
    const metros=Math.hypot(ax+t*dx,ay+t*dy)
    if(metros<mejor.metros) mejor={metros,dx,dy}
  }
  return mejor
}
export function aplicaSentido(texto, tramo) {
  const s=normalizar(texto)
  if(/AMBOS|BIDIRECC/.test(s)) return true
  const norteSur=/NORTE\s+SUR/.test(s),surNorte=/SUR\s+NORTE/.test(s)
  const esteOeste=/ORIENTE\s+OCCIDENTE/.test(s),oesteEste=/OCCIDENTE\s+ORIENTE/.test(s)
  if(norteSur&&surNorte || esteOeste&&oesteEste) return true
  if(norteSur||surNorte) return norteSur ? tramo.dy<0 : tramo.dy>0
  if(esteOeste||oesteEste) return esteOeste ? tramo.dx<0 : tramo.dx>0
  if(s==='NORTE') return tramo.dy>0
  if(s==='SUR') return tramo.dy<0
  return null
}
export function detectarPeajes(linea, catalogo, reglas={}, casetas=[]) {
  const pasos=[],pendientes=[],vistos=new Set()
  let minLat=Infinity,maxLat=-Infinity,minLng=Infinity,maxLng=-Infinity
  for(const [lng,lat] of linea){minLat=Math.min(minLat,lat);maxLat=Math.max(maxLat,lat);minLng=Math.min(minLng,lng);maxLng=Math.max(maxLng,lng)}
  // Ubicar casetas reales y no confundir vías paralelas con el mismo corredor.
  const cruces=casetas.filter(n=>n.lat>=minLat-0.003 && n.lat<=maxLat+0.003 && n.lon>=minLng-0.003 && n.lon<=maxLng+0.003)
    .map(n=>({n,c:cercania({latitud:n.lat,longitud:n.lon},linea)})).filter(x=>x.c.metros<=30)
  const catalogoUbicado=catalogo.map(p=>{
    const nombres=normalizar(p.nombre).replace(/\s+0?\d+$/,'')
    const matches=cruces.map(x=>({...x,d:Math.hypot((x.n.lat-p.latitud)*111195,(x.n.lon-p.longitud)*111195*Math.cos(p.latitud*Math.PI/180))}))
      .filter(x=>x.d<1800 && (!x.n.tags?.name || normalizar(x.n.tags.name).includes(nombres)))
      .sort((a,b)=>a.d-b.d)
    return matches.length?{...p,latitud:matches[0].n.lat,longitud:matches[0].n.lon,caseta_osm:matches[0].n.id}:p
  })
  const cercanos=catalogoUbicado.filter(p=>p.latitud>=minLat-0.003 && p.latitud<=maxLat+0.003 && p.longitud>=minLng-0.003 && p.longitud<=maxLng+0.003)
  const candidatos=cercanos.map(p=>({p,c:cercania(p,linea)})).filter(x=>x.c.metros<=300).sort((a,b)=>a.c.metros-b.c.metros)
  for(const {p,c} of candidatos) {
    const regla=reglas[normalizar(p.nombre)]??{}
    if(regla.excluir) continue
    const nombre=regla.nombre??p.nombre
    if(vistos.has(normalizar(nombre))) continue
    const aplica=aplicaSentido(regla.sentido??p.sentido,c)
    if(aplica===false) continue
    vistos.add(normalizar(nombre))
    if((aplica==null&&!p.caseta_osm)||c.metros>120) pendientes.push({nombre,motivo:aplica==null?'Sentido de cobro sin determinar':'Coordenada próxima a la ruta, requiere validar el cruce',distancia_m:c.metros})
    else pasos.push({nombre,distancia_m:Math.round(c.metros),fuente:regla.fuente??p.fuente})
  }
  // Si la vía cruza una caseta que no se puede asociar a tarifa, no asumir cero.
  for(const {n} of cruces) {
    const cerca=catalogoUbicado.some(p=>{
      const metros=Math.hypot((n.lat-p.latitud)*111195,(n.lon-p.longitud)*111195*Math.cos(n.lat*Math.PI/180))
      return metros<200 || (metros<1800 && n.tags?.name && normalizar(n.tags.name).includes(normalizar(p.nombre)))
    })
    if(!cerca && !pendientes.some(p=>p.nombre===(n.tags?.name??`Caseta OSM ${n.id}`)))
      pendientes.push({nombre:n.tags?.name??`Caseta OSM ${n.id}`,motivo:'Caseta en la ruta sin tarifa asociada en el catálogo',osm_id:n.id})
  }
  return {pasos,pendientes}
}
