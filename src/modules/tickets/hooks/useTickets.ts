import { useQuery } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '../../../lib/supabase'
import type { TicketAvance, TicketFabrica } from '../types'

export function useTickets() {
  return useQuery({
    queryKey: ['tickets_fabrica'],
    queryFn: () => fetchAllRows<TicketFabrica>('tickets_fabrica', q => q.order('numero', { ascending: false })),
  })
}

// Bitácora de un ticket, del más reciente al más antiguo.
export function useTicketAvances(ticketId: string | null) {
  return useQuery({
    queryKey: ['tickets_fabrica_avances', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets_fabrica_avances').select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as TicketAvance[]
    },
    enabled: !!ticketId,
  })
}

export async function agregarAvance(ticketId: string, texto: string, usuarioId: string) {
  const { error } = await supabase.from('tickets_fabrica_avances').insert({
    ticket_id: ticketId, usuario_id: usuarioId, tipo: 'avance', texto: texto.trim(),
  })
  if (error) throw error
}
