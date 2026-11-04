import {usePermisosInSitu} from './usePermisosInSitu'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {useUser} from '../../hooks/useUser'
import {supabase,fetchAllRows} from '../../lib/supabase'
import {normalizarPermisos,permisosIniciales,type PermisosInSitu} from './permisosInSitu'
import {CONFIGURACION_ALERTAS,validarConfiguracion,actualizarUmbralesIniciales,type ConfiguracionAlertas} from './configuracionAlertas'
const local=import.meta.env.DEV,clave='hanna-alertas-in-situ-config-v1'
interface PerfilDestino {id:string;nombre:string;activo:boolean;permisos_iniciales?:PermisosInSitu}
export function useAlertasInSitu(habilitado=true) {
 const {user}=useUser()
 const acceso=usePermisosInSitu(),qc=useQueryClient()
 const config=useQuery({queryKey:['alertas-in-situ-config',user?.id,local],enabled:habilitado&&!!user&&(acceso.permisos.ver||acceso.permisos.gestionar_accesos),queryFn:async():Promise<ConfiguracionAlertas>=>{
  if(local){const raw=localStorage.getItem(clave);const c=raw?JSON.parse(raw):structuredClone(CONFIGURACION_ALERTAS);validarConfiguracion(c);return actualizarUmbralesIniciales(c)}
  const {data,error}=await supabase.rpc('intervenciones_alertas_configuracion');if(error)throw Error('Falta instalar la configuración de alertas o no tienes permiso.');return actualizarUmbralesIniciales(data)
 }})
 const administrador=acceso.permisos.administrador,puedeAdministrarAccesos=administrador||acceso.permisos.gestionar_accesos,puedeConfigurarSemaforo=administrador||acceso.permisos.semaforo
 const perfiles=useQuery({queryKey:['alertas-in-situ-perfiles',user?.id],enabled:habilitado&&puedeAdministrarAccesos,queryFn:async():Promise<PerfilDestino[]>=>{
  if(local){const [{data,error},{data:roles,error:errorRoles},{data:personalizado,error:errorPersonalizado}]=await Promise.all([supabase.from('profiles').select('id,full_name,email,activo,role_id').order('full_name'),supabase.from('roles').select('id,name'),supabase.from('role_capabilities').select('role_id').eq('capability_key','mant_in_situ_personalizado')]);if(error||errorRoles||errorPersonalizado)throw Error('No se pudo consultar los perfiles y sus roles.');return (data??[]).map(p=>{const rol=roles?.find(r=>r.id===p.role_id)?.name??'';const tecnico=rol.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()==='servicio tecnico';return {id:p.id,nombre:p.full_name||p.email||p.id,activo:p.activo,permisos_iniciales:normalizarPermisos({...permisosIniciales(p.full_name||p.email||p.id),personalizado_regional:!!personalizado?.some(c=>c.role_id===p.role_id),solicitudes_ver:tecnico,solicitudes_crear:tecnico,solicitudes_editar:tecnico,solicitudes_exportar:tecnico,consultas_ver:tecnico,consultas_exportar:tecnico})}})}
  const {data,error}=await supabase.rpc('intervenciones_alertas_perfiles');if(error)throw Error(error.message);return data
 }})
 const leidos=useQuery({queryKey:['alertas-in-situ-leidos',user?.id,local],enabled:habilitado&&!!user&&acceso.permisos.buzon,queryFn:async():Promise<string[]>=>{
  if(local)return JSON.parse(localStorage.getItem(clave+':leidos:'+user!.id)??'[]')
  try{const data=await fetchAllRows<{clave:string}>('intervenciones_alertas_leidas',q=>q.eq('usuario_id',user!.id).order('leida_at').order('clave'));return data.map(x=>x.clave)}catch{throw Error('No se pudo cargar el estado de lectura.')}
 }})
 async function guardar(c:ConfiguracionAlertas) {
  if(!puedeConfigurarSemaforo)throw Error('No tienes permiso para configurar el semáforo.')
  validarConfiguracion(c)
  if(local)localStorage.setItem(clave,JSON.stringify(c))
  else {const {error}=await supabase.rpc('intervenciones_alertas_configurar',{p_config:c});if(error)throw Error(error.message)}
  await qc.invalidateQueries({queryKey:['alertas-in-situ-config']})
 }
 async function marcar(claves:string[]) {
  if(!user)return
  if(local){const prev=JSON.parse(localStorage.getItem(clave+':leidos:'+user.id)??'[]');localStorage.setItem(clave+':leidos:'+user.id,JSON.stringify([...new Set([...prev,...claves])]))}
  else {const {error}=await supabase.rpc('intervenciones_alertas_marcar',{p_claves:claves});if(error)throw Error(error.message)}
  await qc.invalidateQueries({queryKey:['alertas-in-situ-leidos',user.id]})
 }
 async function marcarSinLeer(claves:string[]) {
  if(!user)return
  if(local){const prev:string[]=JSON.parse(localStorage.getItem(clave+':leidos:'+user.id)??'[]');const quitar=new Set(claves);localStorage.setItem(clave+':leidos:'+user.id,JSON.stringify(prev.filter(k=>!quitar.has(k))))}
  else {const {error}=await supabase.rpc('intervenciones_alertas_sin_leer',{p_claves:claves});if(error)throw Error(error.message)}
  await qc.invalidateQueries({queryKey:['alertas-in-situ-leidos',user.id]})
 }
 return {config,perfiles,leidos,guardar,marcar,marcarSinLeer,administrador,puedeAdministrarAccesos,puedeConfigurarSemaforo}
}
