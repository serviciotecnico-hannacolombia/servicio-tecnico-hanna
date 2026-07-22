import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type { EquipoMantenimiento, EventoMantenimiento, Periodicidad } from '../../../types'

export function useEquiposMantenimiento() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['equipos_mantenimiento', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipos_mantenimiento').select('*').order('proxima_fecha', { ascending: true })
      if (error) throw error
      return data as EquipoMantenimiento[]
    },
    enabled: !!user,
  })
}

export function useEventosMantenimiento(equipoId: string | null) {
  return useQuery({
    queryKey: ['eventos_mantenimiento', equipoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventos_mantenimiento').select('*').eq('equipo_id', equipoId as string)
        .order('fecha_recepcion', { ascending: false })
      if (error) throw error
      return data as EventoMantenimiento[]
    },
    enabled: !!equipoId,
  })
}

export function useInvalidateMantenimiento() {
  const qc = useQueryClient()
  const { user } = useUser()
  return {
    equipos: () => qc.invalidateQueries({ queryKey: ['equipos_mantenimiento', user?.id] }),
    eventos: (equipoId: string) => qc.invalidateQueries({ queryKey: ['eventos_mantenimiento', equipoId] }),
  }
}

const MESES_POR_PERIODICIDAD: Record<Periodicidad, number> = {
  trimestral: 3,
  semestral: 6,
  anual: 12,
}

export function calcularProximaFecha(periodicidad: Periodicidad, desdeISO: string): string {
  const [y, m, d] = desdeISO.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setMonth(date.getMonth() + MESES_POR_PERIODICIDAD[periodicidad])
  return date.toISOString().slice(0, 10)
}

function hoyISO(): string { return new Date().toISOString().slice(0, 10) }

export function estaVencido(e: Pick<EquipoMantenimiento, 'proxima_fecha' | 'estado'>): boolean {
  return e.estado === 'activo' && e.proxima_fecha < hoyISO()
}

export function proximoAVencer(e: Pick<EquipoMantenimiento, 'proxima_fecha' | 'estado'>, dias = 30): boolean {
  if (e.estado !== 'activo' || estaVencido(e)) return false
  const limite = new Date()
  limite.setDate(limite.getDate() + dias)
  return e.proxima_fecha <= limite.toISOString().slice(0, 10)
}
