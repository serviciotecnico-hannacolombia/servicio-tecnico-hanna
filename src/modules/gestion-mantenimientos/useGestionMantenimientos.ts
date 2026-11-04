import {usePermisosInSitu} from './usePermisosInSitu'
import {useQuery,useQueryClient} from '@tanstack/react-query'
import {useUser} from '../../hooks/useUser'
import {useAccesoPersonalizado} from '../mant-in-situ-regional/useAccesoPersonalizado'
import {listarSolicitudes,clasificarSolicitud,crearSolicitud,actualizarSolicitud,VISTA_PREVIA_LOCAL} from './almacenamiento'
import type {NuevaSolicitud,SolicitudMantenimiento,EstadoMantenimiento} from './modelo'
export function useGestionMantenimientos() {
  const {user,displayName,hasModule}=useUser()
  const tecnico=useAccesoPersonalizado()
  const acceso=usePermisosInSitu(),legado=tecnico&&(VISTA_PREVIA_LOCAL||hasModule('gestion_mantenimientos'))
  const autorizado=!!acceso.data&&(acceso.permisos.configurado?acceso.permisos.solicitudes_ver:legado)
  const puedeCrear=!!acceso.data&&(acceso.permisos.configurado?acceso.permisos.solicitudes_crear:legado),puedeEditar=!!acceso.data&&(acceso.permisos.configurado?acceso.permisos.solicitudes_editar:legado),puedeExportar=!!acceso.data&&(acceso.permisos.configurado?acceso.permisos.solicitudes_exportar:legado)
  const qc=useQueryClient(),key=['gestion-mantenimientos',user?.id,VISTA_PREVIA_LOCAL]
  const consulta=useQuery({queryKey:key,enabled:autorizado&&!!user,queryFn:()=>listarSolicitudes(user!.id)})
  async function guardar(s:NuevaSolicitud) {
    if(!puedeCrear||!user)throw Error('No tienes permiso para guardar solicitudes.')
    const r=await crearSolicitud(s,user.id,displayName||user.email||user.id)
    await qc.invalidateQueries({queryKey:key});return r
  }
  async function actualizar(s:SolicitudMantenimiento,estado:EstadoMantenimiento,cotizacion:string,nota:string) {
    if(!puedeEditar||!user)throw Error('No tienes permiso para actualizar solicitudes.')
    try {return await actualizarSolicitud(s,estado,cotizacion,nota,user.id,displayName||user.email||user.id)} finally {await qc.invalidateQueries({queryKey:key})}
  }
  async function clasificar(s:SolicitudMantenimiento,prueba:boolean) {
   if(!puedeEditar||!user)throw Error('No tienes permiso para clasificar solicitudes.')
   try{return await clasificarSolicitud(s,prueba,user.id,displayName||user.email||user.id)}finally{await qc.invalidateQueries({queryKey:key})}
  }
  return {...consulta,clasificar,autorizado,puedeCrear,puedeEditar,puedeExportar,guardar,actualizar}
}
