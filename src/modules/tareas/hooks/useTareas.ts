import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type { Tarea } from '../../../types'
import { esUrgente } from '../plazos'
export { estaVencida, venceHoy, venceManana, esPrioritaria, esUrgente } from '../plazos'

// RLS devuelve las públicas y las privadas creadas por mí o asignadas a mí,
// siempre que mi usuario esté activo y tenga acceso al módulo.
export function useTareas() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['tareas', user?.id],
    queryFn: () => fetchAllRows<Tarea>('tareas', q => q.order('fecha_vencimiento', { ascending: true, nullsFirst: false })),
    enabled: !!user,
    refetchInterval: 60_000,
  })
}

export function useInvalidateTareas() {
  const qc = useQueryClient()
  const { user } = useUser()
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: ['tareas', user?.id] }),
    qc.invalidateQueries({ queryKey: ['tareas_badge', user?.id] }),
  ])
}

// Un único total de pendientes relacionadas conmigo; urgentes es un subconjunto.
export function useTareasBadgeCount(): { pendientes: number, urgentes: number } {
  const { user, hasModule } = useUser()
  const { data } = useQuery({
    queryKey: ['tareas_badge', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tareas').select('*')
        .eq('estado', 'pendiente')
        .or(`asignado_a.eq.${user!.id},creado_por.eq.${user!.id}`)
      if (error) throw error
      return data as Pick<Tarea, 'asignado_a' | 'creado_por' | 'fecha_vencimiento' | 'estado' | 'importante' | 'urgente'>[]
    },
    enabled: !!user && hasModule('tareas'),
    refetchInterval: 60_000,
  })
  if (!data || !user) return { pendientes: 0, urgentes: 0 }
  return {
    pendientes: data.length,
    urgentes: data.filter(t => esUrgente(t)).length,
  }
}
