import {normalizar,type Intervencion} from './intervenciones'
export interface CodigoEstadistica {codigo:string;familia:string|null;codigo_mantenimiento_insitu:string|null}
export function agruparIntervenciones<T>(filas:T[],valor:(r:T)=>string) {
 const grupos=new Map<string,{nombre:string;cantidad:number}>()
 for(const r of filas){const nombre=valor(r).trim()||'Sin dato',clave=normalizar(nombre),actual=grupos.get(clave);if(actual)actual.cantidad++;else grupos.set(clave,{nombre,cantidad:1})}
 return [...grupos.values()].sort((a,b)=>b.cantidad-a.cantidad||a.nombre.localeCompare(b.nombre,'es'))
}
export function catalogoEstadisticas(codigos:CodigoEstadistica[]) {
 return new Map(codigos.map(c=>[normalizar(c.codigo),c]))
}
export function codigoServicio(r:Intervencion,catalogo:ReturnType<typeof catalogoEstadisticas>) {
 if(r.tipo&&r.tipo!=='preventivo')return 'No aplica'
 return catalogo.get(normalizar(r.referencia))?.codigo_mantenimiento_insitu?.trim()||'Sin código asociado'
}
