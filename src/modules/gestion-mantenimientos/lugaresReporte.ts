import catalogo from './ciudades-guardadas.json'
export function claveLugar(valor:string) {
 const clave=valor.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
 return clave==='bogotadc'?'bogota':clave
}
const municipios=new Map(catalogo.map(c=>[claveLugar(c.municipio),c.municipio]))
const departamentos=new Map(catalogo.map(c=>[claveLugar(c.departamento),c.departamento]))
const limpiar=(v:string)=>v.replace(/\./g,'').replace(/\s+/g,' ').trim().toLocaleUpperCase('es-CO')
export function nombreCiudad(v:string) {return municipios.get(claveLugar(v))??limpiar(v)}
export function nombreDepartamento(v:string) {return departamentos.get(claveLugar(v))??limpiar(v)}
export function opcionesLugar(valores:string[],tipo:'ciudad'|'departamento'='ciudad') {
 const mapa=new Map<string,string>(),nombre=tipo==='ciudad'?nombreCiudad:nombreDepartamento
 for(const v of valores){const clave=claveLugar(v);if(!clave)continue;const actual=mapa.get(clave),candidato=nombre(v)
  // En nombres fuera del catálogo, conservar la variante que sí contiene tildes.
  const tildes=(s:string)=>(s.match(/[ÁÉÍÓÚÜÑ]/g)??[]).length
  if(!actual||tildes(candidato)>tildes(actual))mapa.set(clave,candidato)
 }
 return [...mapa].map(([clave,nombre])=>({clave,nombre})).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'))
}
