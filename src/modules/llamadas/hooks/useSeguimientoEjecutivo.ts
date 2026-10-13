import { useQuery } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '../../../lib/supabase'
import type { LlamadaHistorico, SeguimientoCalibracionRow } from '../../../types'

// Llamadas archivadas que marcó el ejecutivo. llamadas_*.usuario guarda el
// nombre (full_name) de quien marcó el estado, no su id — por eso se filtra
// por nombre. Las del día en curso se suman desde el diario en el componente.
export function useSeguimientoLlamadas(nombre: string | null, desde: string, hasta: string) {
  return useQuery({
    queryKey: ['seguimiento-ejecutivo', 'llamadas', nombre, desde, hasta],
    queryFn: () => fetchAllRows<LlamadaHistorico>('llamadas_historico', q => q
      .eq('usuario', nombre)
      .gte('fecha_dia', desde)
      .lte('fecha_dia', hasta)
      .order('fecha_dia', { ascending: true })),
    enabled: !!nombre && !!desde && !!hasta,
  })
}

// Cambios del ejecutivo en órdenes de calibración — vía RPC solo-admin
// (ver migración 20261013_seguimiento_ejecutivo.sql).
export function useSeguimientoCalibraciones(usuarioId: string | null, desde: string, hasta: string) {
  return useQuery({
    queryKey: ['seguimiento-ejecutivo', 'calibraciones', usuarioId, desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('seguimiento_ejecutivo_calibraciones', {
        _usuario_id: usuarioId, _desde: desde, _hasta: hasta,
      })
      if (error) throw error
      return (data ?? []) as SeguimientoCalibracionRow[]
    },
    enabled: !!usuarioId && !!desde && !!hasta,
  })
}
