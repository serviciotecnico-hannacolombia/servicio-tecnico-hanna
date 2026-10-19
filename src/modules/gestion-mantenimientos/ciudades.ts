export interface CiudadGuardada {codigo:string,departamento:string,municipio:string}
export interface UbicacionSolicitud extends CiudadGuardada {detalle:string}
export function unificarCiudades(...listas:CiudadGuardada[][]) {
  const mapa=new Map<string,CiudadGuardada>()
  for(const lista of listas)for(const c of lista)if(c.codigo&&c.departamento&&c.municipio)mapa.set(c.codigo,{codigo:c.codigo,departamento:c.departamento,municipio:c.municipio})
  return [...mapa.values()].sort((a,b)=>a.departamento.localeCompare(b.departamento,'es')||a.municipio.localeCompare(b.municipio,'es'))
}
export function filtrarCiudades(ciudades:CiudadGuardada[],departamento:string,busqueda='') {
  const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  return ciudades.filter(c=>(!departamento||c.departamento===departamento)&&norm(c.municipio+' '+c.departamento+' '+c.codigo).includes(norm(busqueda)))
}
export function textoUbicacion(c:CiudadGuardada,detalle:string) {
  return c.municipio+', '+c.departamento+(detalle.trim()?' · '+detalle.trim():'')
}
