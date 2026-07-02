import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import type { LlamadaDiario } from '../../../types'

const fecha = new Date().toISOString().split('T')[0]

export function useLlamadasDiario() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['llamadas-diario', fecha],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llamadas_diario')
        .select('*')
        .eq('fecha_dia', fecha)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as LlamadaDiario[]
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('llamadas-diario-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'llamadas_diario' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          qc.setQueryData(['llamadas-diario', fecha], (old: LlamadaDiario[] | undefined) => {
            if (!old) return old
            return old.map(l => l.id === (payload.new as LlamadaDiario).id ? { ...l, ...(payload.new as LlamadaDiario) } : l)
          })
        } else {
          qc.invalidateQueries({ queryKey: ['llamadas-diario', fecha] })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])

  const importCSV = useMutation({
    mutationFn: async ({ rows, replace }: {
      rows: { otst: string; cliente: string; ingeniero: string; garantia: 'SI' | 'NO' }[]
      replace: boolean
    }) => {
      if (replace) {
        const { error: de } = await supabase.from('llamadas_diario').delete().eq('fecha_dia', fecha)
        if (de) throw de
      }
      const inserts = rows.map(r => ({ ...r, estado: '' as const, hora: '', usuario: '', fecha_dia: fecha }))
      const { error } = await supabase.from('llamadas_diario').insert(inserts)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['llamadas-diario', fecha] }),
  })

  const addLlamada = useMutation({
    mutationFn: async (payload: Pick<LlamadaDiario, 'otst' | 'cliente' | 'ingeniero' | 'garantia' | 'estado' | 'usuario'>) => {
      const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
      const { error } = await supabase.from('llamadas_diario').insert({ ...payload, hora, fecha_dia: fecha })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['llamadas-diario', fecha] }),
  })

  const updateEstado = useMutation({
    mutationFn: async ({ id, estado, usuario }: { id: string; estado: LlamadaDiario['estado']; usuario: string }) => {
      const hora = estado
        ? new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
        : ''
      const { error } = await supabase
        .from('llamadas_diario')
        .update({ estado, usuario: estado ? usuario : '', hora, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return { id, estado, usuario: estado ? usuario : '', hora }
    },
    onSuccess: ({ id, estado, usuario, hora }) => {
      qc.setQueryData(['llamadas-diario', fecha], (old: LlamadaDiario[] | undefined) => {
        if (!old) return old
        return old.map(l => l.id === id ? { ...l, estado, usuario, hora } : l)
      })
    },
  })

  const marcarVaciosNoLlamado = useMutation({
    mutationFn: async (usuario: string) => {
      const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
      const { error } = await supabase
        .from('llamadas_diario')
        .update({ estado: 'NO LLAMADO', usuario, hora, updated_at: new Date().toISOString() })
        .eq('fecha_dia', fecha)
        .eq('estado', '')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['llamadas-diario', fecha] }),
  })

  const deleteLlamada = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('llamadas_diario').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['llamadas-diario', fecha] }),
  })

  const limpiarDia = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('llamadas_diario').delete().eq('fecha_dia', fecha)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['llamadas-diario', fecha] }),
  })

  const archivarDia = useMutation({
    mutationFn: async (llamadas: LlamadaDiario[]) => {
      const historico = llamadas.map(({ id: _i, created_at: _c, updated_at: _u, ...rest }) => ({
        ...rest,
        archivado_at: new Date().toISOString(),
      }))
      const { error: ie } = await supabase.from('llamadas_historico').insert(historico)
      if (ie) throw ie
      const { error: de } = await supabase.from('llamadas_diario').delete().eq('fecha_dia', fecha)
      if (de) throw de
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['llamadas-diario', fecha] }),
  })

  return { ...query, importCSV, addLlamada, updateEstado, marcarVaciosNoLlamado, deleteLlamada, archivarDia, limpiarDia }
}
