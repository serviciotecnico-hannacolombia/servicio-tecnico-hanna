import { useQuery } from '@tanstack/react-query'
import { fetchAllRows } from '../../../lib/supabase'
import type { TicketFabrica } from '../types'

export function useTickets() {
  return useQuery({
    queryKey: ['tickets_fabrica'],
    queryFn: () => fetchAllRows<TicketFabrica>('tickets_fabrica', q => q.order('numero', { ascending: false })),
  })
}
