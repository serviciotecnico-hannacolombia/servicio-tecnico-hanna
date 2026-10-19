import {useQuery} from '@tanstack/react-query'
import {useUser} from '../../hooks/useUser'
import {supabase} from '../../lib/supabase'
import {esRolServicioTecnico} from '../mant-in-situ-regional/personalizado'
export function useAccesoConsultas() {
 const {profile,hasCapability}=useUser()
 const rol=useQuery({queryKey:['rol-registro-consultas',profile?.id,profile?.role_id],enabled:!!profile?.activo&&!!profile?.role_id,queryFn:async()=>{
  const {data,error}=await supabase.from('roles').select('name').eq('id',profile!.role_id!).single()
  if(error)throw error
  return data.name as string
 }})
 return !!profile?.activo&&esRolServicioTecnico(rol.data)&&(import.meta.env.DEV||hasCapability('mant_consultas_reportes'))
}
