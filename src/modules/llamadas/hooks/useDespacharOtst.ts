import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '../../../lib/supabase'
import type { OtstBodegaPendiente } from '../../../types'

// Consulta liviana (solo lo necesario para el aviso de "ya está pendiente")
// contra la misma tabla que alimenta la pestaña Despacho de Bodega — no se
// importa nada de otst-bodega, cada módulo mantiene su propia consulta a la
// tabla compartida, igual que ya conviven calibraciones/otst-bodega.
export function usePendientesOtst() {
  return useQuery({
    queryKey: ['otst_bodega_pendientes_otst_estado'],
    queryFn: () => fetchAllRows<OtstBodegaPendiente>('otst_bodega_pendientes'),
  })
}

export function useDespacharOtst() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ otst, nota, solicitadoPor }: { otst: string, nota: string, solicitadoPor: string }) => {
      const { error } = await supabase.from('otst_bodega_pendientes').insert({
        otst,
        otst_id: null, // Llamadas no tiene cargada otst_bodega — mismo caso que "OTST aún no registrada en bodega" que ya maneja Bodega
        nota: nota.trim(),
        solicitado_por: solicitadoPor,
        estado: 'pendiente',
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['otst_bodega_pendientes_otst_estado'] }),
  })
}
