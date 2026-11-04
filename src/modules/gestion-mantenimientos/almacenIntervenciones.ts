import {supabase,fetchAllRows} from '../../lib/supabase'
import {identidadIntervencion,validarIntervencion,type Intervencion} from './intervenciones'
const local=import.meta.env.DEV
const clave=(usuario:string)=>'hanna-intervenciones-preview-v1:'+usuario
async function precargarHistorico(usuario:string) {
 const marca=clave(usuario)+':base-2025'
 if(localStorage.getItem(marca))return
 const respuesta=await fetch('/__preview/intervenciones-2025',{cache:'no-store'})
 if(respuesta.status===404)return
 if(!respuesta.ok)throw Error('No se pudo cargar el histórico local de 2025. Reintenta.')
 const base:Intervencion[]=await respuesta.json()
 if(!Array.isArray(base))throw Error('El histórico de vista previa no es válido.')
 base.forEach(validarIntervencion)
 // Leer después del fetch preserva los cambios de otra consulta mientras se descargaba la base.
 const actuales:Intervencion[]=JSON.parse(localStorage.getItem(clave(usuario))??'[]')
 if(!Array.isArray(actuales))throw Error('El historial local no es válido.')
 const existentes=new Set(actuales.map(identidadIntervencion))
 for(const r of base){const k=identidadIntervencion(r);if(!existentes.has(k)){actuales.push(r);existentes.add(k)}}
 localStorage.setItem(clave(usuario),JSON.stringify(actuales))
 localStorage.setItem(marca,'1')
}
export async function listarIntervenciones(usuario:string):Promise<Intervencion[]> {
 if(local){await precargarHistorico(usuario);const r=JSON.parse(localStorage.getItem(clave(usuario))??'[]');if(!Array.isArray(r))throw Error('El historial local no es válido.');return r}
 try{return await fetchAllRows<Intervencion>('mantenimiento_intervenciones',q=>q.order('fecha',{ascending:false}).order('id'))}
 catch {throw Error('No se pudo cargar Reporte in situ. Verifica los permisos y que se haya instalado su SQL.')}
}
export async function guardarIntervenciones(nuevos:Intervencion[],usuario:string,nombre:string,modo:'importar'|'registrar'='importar') {
 nuevos.forEach(validarIntervencion)
 if(local){
  const actuales=await listarIntervenciones(usuario),claves=new Set(actuales.map(identidadIntervencion));let guardados=0
  for(const r of nuevos){const key=identidadIntervencion(r);if(claves.has(key))continue;claves.add(key);actuales.push({...r,historial:[{fecha:new Date().toISOString(),usuario:nombre,tipo:r.tipo,nota:'Registro incorporado'}]});guardados++}
  localStorage.setItem(clave(usuario),JSON.stringify(actuales));return guardados
 }
 const {data,error}=await supabase.rpc(modo==='registrar'?'intervenciones_crear':'intervenciones_importar',{p_registros:nuevos})
 if(error)throw Error(error.message)
 return data as number
}
export async function reclasificarIntervencion(r:Intervencion,tipo:Intervencion['tipo'],usuario:string,nombre:string) {
 validarIntervencion({...r,tipo})
 if(local){
  const registros=await listarIntervenciones(usuario),actual=registros.find(x=>x.id===r.id)
  if(!actual||actual.revision!==r.revision)throw Error('El registro cambió. Recarga antes de continuar.')
  const nuevo={...actual,tipo,motivo_atencion:tipo==='atencion'?actual.motivo_atencion:null,revision:actual.revision+1,historial:[...actual.historial,{fecha:new Date().toISOString(),usuario:nombre,tipo,nota:'Tipo de intervención actualizado'}]}
  localStorage.setItem(clave(usuario),JSON.stringify(registros.map(x=>x.id===r.id?nuevo:x)));return
 }
 const {error}=await supabase.rpc('intervenciones_reclasificar',{p_id:r.id,p_revision:r.revision,p_tipo:tipo})
 if(error)throw Error(error.message)
}

export async function editarIntervencion(r:Intervencion,usuario:string,nombre:string) {
 validarIntervencion(r)
 if(local){
  const filas=await listarIntervenciones(usuario),actual=filas.find(x=>x.id===r.id)
  if(!actual||actual.revision!==r.revision)throw Error('El registro cambió. Recarga antes de continuar.')
  if(filas.some(x=>x.id!==r.id&&identidadIntervencion(x)===identidadIntervencion(r)))throw Error('Ya existe una intervención con esos datos.')
  const campos=['referencia','serial','cliente','nit','asesor','contacto','telefono','fecha','departamento','ciudad','ubicacion','documento','periodicidad','informe','observaciones','zona','tipo','motivo_atencion'] as const
  const cambios=campos.filter(k=>actual[k]!==r[k]).map(k=>({campo:k,antes:actual[k],despues:r[k]}))
  const nuevo={...r,revision:actual.revision+1,historial:[...actual.historial,{fecha:new Date().toISOString(),usuario:nombre,tipo:r.tipo,nota:'Datos de la intervención actualizados',cambios}]}
  localStorage.setItem(clave(usuario),JSON.stringify(filas.map(x=>x.id===r.id?nuevo:x)));return
 }
 const {error}=await supabase.rpc('intervenciones_actualizar',{p_id:r.id,p_revision:r.revision,p_datos:r});if(error)throw Error(error.message)
}
export async function exportarIntervenciones(filas:Intervencion[]) {
 if(local)return filas
 const {data,error}=await supabase.rpc('intervenciones_exportar',{p_ids:filas.map(r=>r.id)});if(error)throw Error(error.message)
 return data as Intervencion[]
}
