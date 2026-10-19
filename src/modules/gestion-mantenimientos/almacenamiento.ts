import { supabase, fetchAllRows } from '../../lib/supabase'
import { validarNuevaSolicitud, validarSeguimiento, type SolicitudMantenimiento, type NuevaSolicitud, type EstadoMantenimiento } from './modelo'
export const VISTA_PREVIA_LOCAL = import.meta.env.DEV
export const AVISO_GESTION_LOCAL = 'Vista previa local: los registros se guardan solo en este navegador y usuario. No se sincronizan con la base de datos. Exporta un respaldo antes de cambiar de equipo o borrar datos del navegador.'
const clave = (usuario:string) => 'hanna-gestion-mantenimientos-preview-v1:'+usuario
function leerLocal(usuario:string):SolicitudMantenimiento[] {
  const raw=localStorage.getItem(clave(usuario))
  if (!raw) return []
  const parsed=JSON.parse(raw)
  if (!Array.isArray(parsed)) throw Error('El respaldo local no es válido; expórtalo antes de restablecerlo.')
  return parsed
}
function escribirLocal(usuario:string,filas:SolicitudMantenimiento[]) {localStorage.setItem(clave(usuario),JSON.stringify(filas))}
function errorGuardado(error:{message:string,code?:string}):never {
  if (['42P01','PGRST205','PGRST202'].includes(error.code??'')) throw Error('Gestión aún no está instalada en la base de datos. Aplica el SQL preparado antes de guardar en producción.')
  throw Error(error.message)
}
export async function listarSolicitudes(usuario:string) {
  if (VISTA_PREVIA_LOCAL) return leerLocal(usuario).sort((a,b)=>b.created_at.localeCompare(a.created_at))
  try {return await fetchAllRows<SolicitudMantenimiento>('gestion_mantenimientos',q=>q.order('created_at',{ascending:false}))} catch(e) {errorGuardado(e as {message:string,code?:string})}
}
export async function crearSolicitud(s:NuevaSolicitud,usuario:string,nombre:string) {
  validarNuevaSolicitud(s)
  const estado=s.cotizacion.trim()?'cotizada':'pendiente'
  if (VISTA_PREVIA_LOCAL) {
    const fecha=new Date().toISOString()
    const registro:SolicitudMantenimiento={id:crypto.randomUUID(),cliente:s.cliente.trim(),origen:s.origen.trim(),destino:s.destino.trim(),cotizacion:s.cotizacion.trim()||null,estado,calculo:structuredClone(s.calculo),historial:[{fecha,usuario:nombre,estado,cotizacion:s.cotizacion.trim()||null,nota:s.nota.trim()||'Solicitud creada'}],creado_por:usuario,creado_por_nombre:nombre,created_at:fecha,updated_at:fecha,revision:1}
    escribirLocal(usuario,[registro,...leerLocal(usuario)])
    return registro
  }
  const {data,error}=await supabase.rpc('gestion_mantenimiento_crear',{p_cliente:s.cliente.trim(),p_origen:s.origen.trim(),p_destino:s.destino.trim(),p_cotizacion:s.cotizacion.trim()||null,p_calculo:s.calculo,p_nota:s.nota.trim()})
  if(error)errorGuardado(error)
  return data as SolicitudMantenimiento
}
export async function actualizarSolicitud(s:SolicitudMantenimiento,estado:EstadoMantenimiento,cotizacion:string,nota:string,usuario:string,nombre:string) {
  validarSeguimiento(estado,cotizacion,nota)
  if(VISTA_PREVIA_LOCAL) {
    const filas=leerLocal(usuario),actual=filas.find(f=>f.id===s.id)
    if(!actual||actual.revision!==s.revision)throw Error('La solicitud cambió en otra ventana. Recarga y vuelve a intentar.')
    const fecha=new Date().toISOString()
    const nueva={...actual,estado,cotizacion:cotizacion.trim()||null,updated_at:fecha,revision:actual.revision+1,historial:[...actual.historial,{fecha,usuario:nombre,estado,cotizacion:cotizacion.trim()||null,nota:nota.trim()||'Seguimiento actualizado'}]}
    escribirLocal(usuario,filas.map(f=>f.id===s.id?nueva:f))
    return nueva
  }
  const {data,error}=await supabase.rpc('gestion_mantenimiento_actualizar',{p_id:s.id,p_revision:s.revision,p_estado:estado,p_cotizacion:cotizacion.trim()||null,p_nota:nota.trim()})
  if(error)errorGuardado(error)
  return data as SolicitudMantenimiento
}
