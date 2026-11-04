import {useQuery,useQueryClient} from '@tanstack/react-query'
import {supabase} from '../../lib/supabase'
import {useUser} from '../../hooks/useUser'
import {mismoDestinatario} from './configuracionAlertas'
import {CLAVE_PERMISOS,SIN_PERMISOS,ACCESO_PROPIETARIO,normalizarPermisos,permisosIniciales,validarPermisos,type AccesoInSitu,type PermisosInSitu} from './permisosInSitu'
export function usePermisosInSitu() {
 const {user,profile,hasCapability}=useUser()
 const q=useQuery({queryKey:['permisos-in-situ',user?.id,profile?.full_name,profile?.activo],enabled:!!user&&!!profile?.activo,staleTime:0,refetchInterval:30000,queryFn:async():Promise<AccesoInSitu>=>{
  if(import.meta.env.DEV){const administrador=mismoDestinatario(profile?.full_name??'','Andrés Latorre');const registros=JSON.parse(localStorage.getItem(CLAVE_PERMISOS)??'{}');return {...(administrador?ACCESO_PROPIETARIO:normalizarPermisos({
   ...(registros[user!.id]??permisosIniciales(profile?.full_name??'')),
   personalizado_regional: registros[user!.id]?.personalizado_regional ?? hasCapability('mant_in_situ_personalizado')
  })),administrador,configurado:administrador||!!registros[user!.id]}}
  const {data,error}=await supabase.rpc('intervenciones_mis_permisos');if(error)throw Error('No se pudieron verificar los permisos de Gestión. Verifica la instalación de su SQL.');return {...normalizarPermisos(data),administrador:!!data.administrador,configurado:!!data.configurado}
 }})
 return {...q,permisos:q.data??{...SIN_PERMISOS,administrador:false,configurado:false}}
}
export function useAdministrarPermisosInSitu(habilitado:boolean) {
 const qc=useQueryClient(),{user}=useUser(),actor=usePermisosInSitu()
 const q=useQuery({queryKey:['permisos-in-situ-lista',user?.id],enabled:habilitado,queryFn:async():Promise<Record<string,Omit<PermisosInSitu,'personalizado_regional'> & {personalizado_regional?: boolean}>>=>{
  if(import.meta.env.DEV){const datos:Record<string,Partial<PermisosInSitu>>=JSON.parse(localStorage.getItem(CLAVE_PERMISOS)??'{}');return Object.fromEntries(Object.entries(datos).map(([k,p])=>[k,{...normalizarPermisos(p),personalizado_regional:p.personalizado_regional}]))}
  const {data,error}=await supabase.rpc('intervenciones_permisos_listar');if(error)throw Error(error.message);return data
 }})
 async function guardar(id:string,p:PermisosInSitu) {
  if(!habilitado||(!actor.permisos.administrador&&!actor.permisos.gestionar_accesos))throw Error('No tienes permiso para administrar accesos.');if(id===user?.id)throw Error('No puedes modificar tus propios permisos.');if(!actor.permisos.administrador&&(p.gestionar_accesos||q.data?.[id]?.gestionar_accesos))throw Error('Sólo el propietario puede delegar o modificar administradores de accesos.')
  validarPermisos(p)
  if(import.meta.env.DEV){const registros=JSON.parse(localStorage.getItem(CLAVE_PERMISOS)??'{}');localStorage.setItem(CLAVE_PERMISOS,JSON.stringify({...registros,[id]:p}))}
  else {const {error}=await supabase.rpc('intervenciones_permisos_guardar',{p_usuario:id,p_permisos:p});if(error)throw Error(error.message)}
  await qc.invalidateQueries({queryKey:['permisos-in-situ-lista']});await qc.invalidateQueries({queryKey:['permisos-in-situ']});await qc.invalidateQueries({queryKey:['alertas-in-situ-config']});await qc.invalidateQueries({queryKey:['gestion-mantenimientos']})
 }
 return {...q,guardar}
}
