import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import type { Profile, UserRole } from '../../../types'

const KEY = ['admin', 'users']

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
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
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

  const createUser = useMutation({
    mutationFn: async (payload: { email: string; full_name: string; role: UserRole; password: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', ...payload },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error ?? 'Error al crear usuario')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete', userId },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error ?? 'Error al eliminar usuario')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  return { users, isLoading, updateRole, toggleActivo, createUser, deleteUser }
}
