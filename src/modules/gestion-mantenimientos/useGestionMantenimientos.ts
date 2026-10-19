import {useQuery,useQueryClient} from '@tanstack/react-query'
import {useUser} from '../../hooks/useUser'
import {useAccesoPersonalizado} from '../mant-in-situ-regional/useAccesoPersonalizado'
import {listarSolicitudes,crearSolicitud,actualizarSolicitud,VISTA_PREVIA_LOCAL} from './almacenamiento'
import type {NuevaSolicitud,SolicitudMantenimiento,EstadoMantenimiento} from './modelo'
export function useGestionMantenimientos() {
  const {user,displayName,hasModule}=useUser()
  const tecnico=useAccesoPersonalizado()
  const autorizado=tecnico&&(VISTA_PREVIA_LOCAL||hasModule('gestion_mantenimientos'))
  const qc=useQueryClient(),key=['gestion-mantenimientos',user?.id,VISTA_PREVIA_LOCAL]
  const consulta=useQuery({queryKey:key,enabled:autorizado&&!!user,queryFn:()=>listarSolicitudes(user!.id)})
  async function guardar(s:NuevaSolicitud) {
    if(!autorizado||!user)throw Error('No tienes permiso para guardar solicitudes.')
    const r=await crearSolicitud(s,user.id,displayName||user.email||user.id)
    await qc.invalidateQueries({queryKey:key});return r
  }
  async function actualizar(s:SolicitudMantenimiento,estado:EstadoMantenimiento,cotizacion:string,nota:string) {
    if(!autorizado||!user)throw Error('No tienes permiso para actualizar solicitudes.')
    try {return await actualizarSolicitud(s,estado,cotizacion,nota,user.id,displayName||user.email||user.id)} finally {await qc.invalidateQueries({queryKey:key})}
  }
  return {...consulta,autorizado,guardar,actualizar}
}
