import { useQuery } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '../../../lib/supabase'
import type { LlamadaHistorico, LlamadaCierre } from '../../../types'

export function useHistorial(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['llamadas-historico', desde, hasta],
    queryFn: () => fetchAllRows<LlamadaHistorico>('llamadas_historico', q => q
      .gte('fecha_dia', desde)
      .lte('fecha_dia', hasta)
      .order('fecha_dia', { ascending: true })
      .order('hora',      { ascending: true })),
    enabled: !!desde && !!hasta,
  })
}

export function useCierres(desde: string, hasta: string) {
  return useQuery({
    queryKey: ['llamadas-cierres', desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llamadas_cierres')
        .select('*')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha', { ascending: false })
      if (error) throw error
      return data as LlamadaCierre[]
    },
    enabled: !!desde && !!hasta,
  })
}
