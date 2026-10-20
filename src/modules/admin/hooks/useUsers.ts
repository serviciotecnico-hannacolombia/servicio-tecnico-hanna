import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import type { Profile } from '../../../types'

const KEY = ['admin', 'users']

// functions.invoke solo dice "non-2xx status code"; el motivo real viene en el body.
async function edgeErrorMessage(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json()
      if (body?.error) return body.error
    } catch { /* body no es JSON */ }
  }
  return error instanceof Error ? error.message : fallback
}

export function useUsers() {
  const qc = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Profile[]
    },
  })

  const updateRole = useMutation({
    mutationFn: async ({ id, role_id }: { id: string; role_id: string | null }) => {
      const { error } = await supabase.from('profiles').update({ role_id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const toggleActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from('profiles').update({ activo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const toggleEjecutivo = useMutation({
    mutationFn: async ({ id, es_ejecutivo }: { id: string; es_ejecutivo: boolean }) => {
      const { error } = await supabase.from('profiles').update({ es_ejecutivo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      qc.invalidateQueries({ queryKey: ['profiles'] })
    },
  })

  const createUser = useMutation({
    mutationFn: async (payload: { email: string; full_name: string; role_id: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', ...payload },
      })
      if (error) throw new Error(await edgeErrorMessage(error, 'Error al crear usuario'))
      if (!data?.success) throw new Error(data?.error ?? 'Error al crear usuario')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', userId },
      })
      if (error) throw new Error(await edgeErrorMessage(error, 'Error al eliminar usuario'))
      if (!data?.success) throw new Error(data?.error ?? 'Error al eliminar usuario')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  return { users, isLoading, updateRole, toggleActivo, toggleEjecutivo, createUser, deleteUser }
}
