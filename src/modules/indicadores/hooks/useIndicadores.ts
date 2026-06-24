import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { useUser } from '../../../hooks/useUser'
import type { CategoriaIndicador, IndicadorMeta, IndicadorReal } from '../../../types'

export function useIndicadores(anio: number) {
  const qc = useQueryClient()
  const { displayName } = useUser()

  const metasQuery = useQuery({
    queryKey: ['indicadores-metas', anio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicadores_metas')
        .select('*')
        .eq('anio', anio)
        .order('mes')
      if (error) throw error
      return data as IndicadorMeta[]
    },
  })

  const realesQuery = useQuery({
    queryKey: ['indicadores-reales', anio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicadores_reales')
        .select('*')
        .eq('anio', anio)
      if (error) throw error
      return data as IndicadorReal[]
    },
  })

  const registrarReal = useMutation({
    mutationFn: async ({
      categoria, mes, valor_real,
    }: { categoria: CategoriaIndicador; mes: number; valor_real: number }) => {
      const { error } = await supabase
        .from('indicadores_reales')
        .upsert(
          { anio, categoria, mes, valor_real, actualizado_por: displayName, updated_at: new Date().toISOString() },
          { onConflict: 'anio,categoria,mes' }
        )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indicadores-reales', anio] }),
  })

  const guardarMetas = useMutation({
    mutationFn: async (
      rows: { anio: number; categoria: CategoriaIndicador; mes: number; meta: number; porcentaje?: number | null }[]
    ) => {
      const { error } = await supabase
        .from('indicadores_metas')
        .upsert(
          rows.map(r => ({ ...r, updated_at: new Date().toISOString() })),
          { onConflict: 'anio,categoria,mes' }
        )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['indicadores-metas', anio] }),
  })

  return {
    metas: metasQuery.data ?? [],
    reales: realesQuery.data ?? [],
    isLoading: metasQuery.isLoading || realesQuery.isLoading,
    registrarReal,
    guardarMetas,
  }
}
