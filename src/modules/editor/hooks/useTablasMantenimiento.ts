import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type { FilaTablaMantenimiento, TablaMantenimiento } from '../../../types'

export function useTablasMantenimiento() {
  const { user } = useUser()
  return useQuery({
    queryKey: ['tablas_mantenimiento'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tablas_mantenimiento').select('*').order('equipo')
      if (error) throw error
      return data as TablaMantenimiento[]
    },
    enabled: !!user,
  })
}

export function useInvalidateTablasMantenimiento() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['tablas_mantenimiento'] })
}

export async function crearTablaMantenimiento(payload: { equipo: string, parametro: string | null, filas: FilaTablaMantenimiento[], creadoPor: string | null }) {
  return supabase.from('tablas_mantenimiento').insert({
    equipo: payload.equipo, parametro: payload.parametro, filas: payload.filas, creado_por: payload.creadoPor,
  })
}

export async function actualizarTablaMantenimiento(id: string, payload: { equipo: string, parametro: string | null, filas: FilaTablaMantenimiento[] }) {
  return supabase.from('tablas_mantenimiento')
    .update({ equipo: payload.equipo, parametro: payload.parametro, filas: payload.filas, updated_at: new Date().toISOString() })
    .eq('id', id)
}

export async function eliminarTablaMantenimiento(id: string) {
  return supabase.from('tablas_mantenimiento').delete().eq('id', id)
}

// Misma tabla HTML tanto para la miniatura del picker como para lo que se
// inserta en el editor — una sola fuente de verdad.
export function renderTablaHTML(equipo: string, filas: FilaTablaMantenimiento[]): string {
  const filasHtml = filas.map(f =>
    `  <tr>\n    <td>${f.lectura}</td>\n    <td>${f.estandar}</td>\n    <td>${f.tolerancia}</td>\n  </tr>`
  ).join('\n')
  return `<table border="1" align="center">\n  <tr>\n    <th>${equipo}</th>\n    <th>Sol. Estándar</th>\n    <th>Tolerancia</th>\n  </tr>\n${filasHtml}\n</table>`
}
