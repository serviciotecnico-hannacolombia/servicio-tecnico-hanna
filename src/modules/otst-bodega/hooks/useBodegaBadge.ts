import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'

// Contador para el badge del Sidebar — pendientes de despacho abiertos
// (mismo patrón que useTareasBadgeCount/useCalibracionesBadgeCount).
export function useBodegaBadgeCount(): number {
  const { user, hasModule } = useUser()
  const { data } = useQuery({
    queryKey: ['bodega_despacho_badge', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('otst_bodega_pendientes').select('estado').eq('estado', 'pendiente')
      if (error) throw error
      return data
    },
    enabled: !!user && hasModule('bodega'),
    refetchInterval: 60_000,
  })
  return data?.length ?? 0
}
