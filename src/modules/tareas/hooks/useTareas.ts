import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type { Tarea } from '../../../types'

// RLS ya limita las filas a las creadas por mí o asignadas a mí — nunca
// tareas entre otros dos usuarios.
export function useTareas() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['tareas', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tareas').select('*').order('fecha_vencimiento', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data as Tarea[]
    },
    enabled: !!user,
    refetchInterval: 60_000,
  })
}

export function useInvalidateTareas() {
  const qc = useQueryClient()
  const { user } = useUser()
  return () => qc.invalidateQueries({ queryKey: ['tareas', user?.id] })
}

function hoyISO(): string { return new Date().toISOString().slice(0, 10) }
function mananaISO(): string {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function estaVencida(t: Pick<Tarea, 'fecha_vencimiento' | 'estado'>): boolean {
  return t.estado === 'pendiente' && !!t.fecha_vencimiento && t.fecha_vencimiento < hoyISO()
}

export function venceManana(t: Pick<Tarea, 'fecha_vencimiento' | 'estado'>): boolean {
  return t.estado === 'pendiente' && t.fecha_vencimiento === mananaISO()
}

// Urgente = le falta un día para vencer, o ya está vencida.
export function esUrgente(t: Pick<Tarea, 'fecha_vencimiento' | 'estado'>): boolean {
  return estaVencida(t) || venceManana(t)
}

// Badge del sidebar: entre mis tareas (asignadas a mí o creadas por mí para
// otros), las que están a un día de vencer o ya vencieron.
export function useTareasBadgeCount(): number {
  const { user, hasModule } = useUser()
  const { data } = useQuery({
    queryKey: ['tareas_badge', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tareas').select('asignado_a, creado_por, fecha_vencimiento, estado')
        .eq('estado', 'pendiente')
      if (error) throw error
      return data as Pick<Tarea, 'asignado_a' | 'creado_por' | 'fecha_vencimiento' | 'estado'>[]
    },
    enabled: !!user && hasModule('tareas'),
    refetchInterval: 60_000,
  })
  if (!data || !user) return 0
  return data.filter(t => (t.asignado_a === user.id || t.creado_por === user.id) && esUrgente(t)).length
}
