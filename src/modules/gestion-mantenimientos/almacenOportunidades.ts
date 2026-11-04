import {supabase,fetchAllRows} from '../../lib/supabase'
import {listarIntervenciones} from './almacenIntervenciones'
import {validarOportunidad,validarCierre,validarIdentificacionOportunidad,validarOrigenManual,type IdentificacionOportunidad,type NuevaOportunidad,type Oportunidad,type EstadoOportunidad} from './oportunidades'
const local=import.meta.env.DEV,clave=(u:string)=>'hanna-oportunidades-preview-v1:'+u
export async function listarOportunidades(usuario:string):Promise<Oportunidad[]>{if(local)return JSON.parse(localStorage.getItem(clave(usuario))??'[]');try{return await fetchAllRows<Oportunidad>('intervenciones_oportunidades',q=>q.order('created_at',{ascending:false}).order('id'))}catch{throw Error('No se pudieron cargar oportunidades. Verifica la instalación de su SQL.')}}
export async function crearOportunidad(o:NuevaOportunidad,usuario:string,nombre:string):Promise<Oportunidad>{
 validarOportunidad(o)
 if(local){const filas=await listarOportunidades(usuario),prev=filas.find(r=>r.id===o.id);if(prev){if(prev.intervencion_id!==o.intervencion_id||prev.titulo!==o.titulo.trim()||prev.necesidad!==o.necesidad.trim()||prev.asesor!==o.asesor.trim()||prev.os!==o.os||prev.numero_oportunidad!==o.numero_oportunidad.trim()||(!o.intervencion_id&&(prev.cliente!==(o.cliente??'').trim()||prev.referencia!==(o.referencia??'').trim()||prev.serial!==(o.serial??'').trim()||prev.tipo_origen!==o.tipo_origen)))throw Error('El identificador corresponde a otra oportunidad.');return prev}
  if(filas.some(r=>(r.numero_oportunidad??'').trim().toLowerCase()===o.numero_oportunidad.trim().toLowerCase()))throw Error('Ya existe una oportunidad con ese número.')
  const r=o.intervencion_id?(await listarIntervenciones(usuario)).find(r=>r.id===o.intervencion_id):null;if(o.intervencion_id&&!r)throw Error('La intervención de origen no existe.')
  const fecha=new Date().toISOString(),nuevo:Oportunidad={...o,os:o.os,numero_oportunidad:o.numero_oportunidad.trim(),titulo:o.titulo.trim(),necesidad:o.necesidad.trim(),asesor:o.asesor.trim(),cliente:r?.cliente??o.cliente!.trim(),referencia:r?.referencia??(o.referencia??'').trim(),serial:r?.serial??(o.serial??'').trim(),tipo_origen:r?.tipo??o.tipo_origen!,estado:'pendiente',cotizacion:null,valor:null,revision:1,created_at:fecha,historial:[{fecha,usuario:nombre,estado:'pendiente',cotizacion:null,valor:null,nota:'Oportunidad registrada: pendiente de cotizar en la intranet principal de HANNA'}]}
  localStorage.setItem(clave(usuario),JSON.stringify([nuevo,...filas]));return nuevo
 }
 const {data,error}=await supabase.rpc('intervenciones_oportunidad_crear',{p_datos:o});if(error)throw Error(error.message);return data
}
export async function actualizarOportunidad(o:Oportunidad,estado:EstadoOportunidad,cotizacion:string,nota:string,valor:number|null,usuario:string,nombre:string,identificacion?:IdentificacionOportunidad):Promise<Oportunidad>{
 validarCierre(estado,cotizacion,nota,valor)
 const datos=identificacion??{os:o.os??'',numero_oportunidad:o.numero_oportunidad??'',intervencion_id:o.intervencion_id,cliente:o.cliente,referencia:o.referencia,serial:o.serial,tipo_origen:o.tipo_origen}
 validarIdentificacionOportunidad(datos.os,datos.numero_oportunidad)
 if(!datos.intervencion_id)validarOrigenManual(datos)
 if(o.cotizacion&&!cotizacion.trim())throw Error('Conserva el número de cotización ya asociado para no perder la trazabilidad.')
 if(local){
  const filas=await listarOportunidades(usuario),actual=filas.find(r=>r.id===o.id)
  if(!actual||actual.revision!==o.revision)throw Error('La oportunidad cambió. Recarga antes de continuar.')
  if(filas.some(r=>r.id!==o.id&&(r.numero_oportunidad??'').trim().toLowerCase()===datos.numero_oportunidad.trim().toLowerCase()))throw Error('Ya existe una oportunidad con ese número.')
  const origen=datos.intervencion_id?(await listarIntervenciones(usuario)).find(r=>r.id===datos.intervencion_id):null
  if(datos.intervencion_id&&!origen)throw Error('La intervención de origen no existe.')
  const identidad={...datos,numero_oportunidad:datos.numero_oportunidad.trim(),cliente:origen?.cliente??datos.cliente.trim(),referencia:origen?.referencia??datos.referencia.trim(),serial:origen?.serial??datos.serial.trim(),tipo_origen:origen?.tipo??datos.tipo_origen}
  const nuevo={...actual,...identidad,estado,cotizacion:cotizacion.trim()||null,valor,revision:actual.revision+1,historial:[...actual.historial,{fecha:new Date().toISOString(),usuario:nombre,estado,cotizacion:cotizacion.trim()||null,valor,nota:nota.trim()||'Seguimiento actualizado',cambios:{antes:{os:actual.os??null,numero_oportunidad:actual.numero_oportunidad??null,intervencion_id:actual.intervencion_id},despues:identidad}}]}
  localStorage.setItem(clave(usuario),JSON.stringify(filas.map(r=>r.id===o.id?nuevo:r)));return nuevo
 }
 const {data,error}=await supabase.rpc('intervenciones_oportunidad_seguir',{p_id:o.id,p_revision:o.revision,p_datos:{...datos,estado,cotizacion:cotizacion.trim()||null,nota:nota.trim(),valor}});if(error)throw Error(error.message);return data
}
