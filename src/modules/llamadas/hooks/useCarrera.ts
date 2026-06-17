import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

const fecha = new Date().toISOString().split('T')[0]

export function useCarrera() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['carrera', fecha],
    queryFn: async () => {
      const { data } = await supabase
        .from('carrera_config')
        .select('usuario')
        .eq('fecha_dia', fecha)
        .maybeSingle()
      return (data?.usuario ?? null) as string | null
    },
  })

  const setCarrera = useMutation({
    mutationFn: async (usuario: string) => {
      const { error } = await supabase
        .from('carrera_config')
        .upsert({ fecha_dia: fecha, usuario }, { onConflict: 'fecha_dia' })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['carrera', fecha] }),
  })

  return { ...query, setCarrera }
}
