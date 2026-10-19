import {useQuery} from '@tanstack/react-query'
import {fetchAllRows} from '../../lib/supabase'
import {useUser} from '../../hooks/useUser'
import respaldo from './ciudades-guardadas.json'
import {unificarCiudades,type CiudadGuardada} from './ciudades'
export function useCiudadesGuardadas(enabled:boolean) {
  const {user}=useUser()
  return useQuery({
    queryKey:['gestion-ciudades-guardadas',user?.id],enabled:enabled&&!!user,staleTime:5*60_000,
    placeholderData:{ciudades:unificarCiudades(respaldo),aviso:''},
    queryFn:async()=>{
      const resultados=await Promise.allSettled([
        fetchAllRows<CiudadGuardada>('mant_in_situ_destinos',q=>q.order('codigo')),
        fetchAllRows<CiudadGuardada>('mant_regional_destinos',q=>q.order('codigo')),
      ])
      const listas=resultados.flatMap(r=>r.status==='fulfilled'?[r.value]:[])
      return {ciudades:unificarCiudades(respaldo,...listas),aviso:resultados.some(r=>r.status==='rejected')?'No se pudieron actualizar todos los catálogos. Se muestran las ciudades guardadas disponibles.':''}
    },
  })
}
