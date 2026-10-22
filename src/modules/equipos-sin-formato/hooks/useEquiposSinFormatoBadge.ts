import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'

// Contador para el badge del Sidebar — sin formato abiertos (no ingresados
// ni anulados) donde el usuario logueado es el asesor. La key empieza por
// 'equipos_sin_formato' para que se refresque con las mismas invalidaciones
// que la lista (useEquiposSinFormato).
export function useEquiposSinFormatoBadgeCount(): number {
  const { user, hasModule } = useUser()
  const { data } = useQuery({
    queryKey: ['equipos_sin_formato', 'badge', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipos_sin_formato').select('id')
        .ilike('asesor_correo', user!.email!)
        .neq('estado', 'ingresado')
        .eq('anulada', false)
      if (error) throw error
      return data
    },
    enabled: !!user?.email && hasModule('equipos_sin_formato'),
    refetchInterval: 60_000,
  })
  return data?.length ?? 0
}
