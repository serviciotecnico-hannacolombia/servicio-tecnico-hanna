import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import type { Role, ModuleKey, CapabilityKey } from '../../../types'

const KEY = ['admin', 'roles']

interface RoleModuleRow { role_id: string; module_key: ModuleKey }
interface RoleCapabilityRow { role_id: string; capability_key: CapabilityKey }

export function useRoles() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [{ data: roles, error: rolesErr }, { data: roleModules, error: rmErr }, { data: roleCaps, error: rcErr }] =
        await Promise.all([
          supabase.from('roles').select('*').order('created_at', { ascending: true }),
          supabase.from('role_modules').select('role_id, module_key'),
          supabase.from('role_capabilities').select('role_id, capability_key'),
        ])
      if (rolesErr) throw rolesErr
      if (rmErr) throw rmErr
      if (rcErr) throw rcErr

      const modulesByRole = new Map<string, Set<ModuleKey>>()
      for (const row of (roleModules ?? []) as RoleModuleRow[]) {
        if (!modulesByRole.has(row.role_id)) modulesByRole.set(row.role_id, new Set())
        modulesByRole.get(row.role_id)!.add(row.module_key)
      }

      const capabilitiesByRole = new Map<string, Set<CapabilityKey>>()
      for (const row of (roleCaps ?? []) as RoleCapabilityRow[]) {
        if (!capabilitiesByRole.has(row.role_id)) capabilitiesByRole.set(row.role_id, new Set())
        capabilitiesByRole.get(row.role_id)!.add(row.capability_key)
      }

      return { roles: (roles ?? []) as Role[], modulesByRole, capabilitiesByRole }
    },
  })

  const roles = data?.roles ?? []
  const modulesByRole = data?.modulesByRole ?? new Map<string, Set<ModuleKey>>()
  const capabilitiesByRole = data?.capabilitiesByRole ?? new Map<string, Set<CapabilityKey>>()

  const createRole = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('roles').insert({ name })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const renameRole = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('roles').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roles').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') throw new Error('No puedes eliminar un rol que todavía tiene usuarios asignados')
        throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const setModuleGrant = useMutation({
    mutationFn: async ({ roleId, moduleKey, granted }: { roleId: string; moduleKey: ModuleKey; granted: boolean }) => {
      if (granted) {
        const { error } = await supabase.from('role_modules').upsert({ role_id: roleId, module_key: moduleKey })
        if (error) throw error
      } else {
        const { error } = await supabase.from('role_modules').delete().eq('role_id', roleId).eq('module_key', moduleKey)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  const setCapabilityGrant = useMutation({
    mutationFn: async ({ roleId, capabilityKey, granted }: { roleId: string; capabilityKey: CapabilityKey; granted: boolean }) => {
      if (granted) {
        const { error } = await supabase.from('role_capabilities').upsert({ role_id: roleId, capability_key: capabilityKey })
        if (error) throw error
      } else {
        const { error } = await supabase.from('role_capabilities').delete().eq('role_id', roleId).eq('capability_key', capabilityKey)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })

  return {
    roles, modulesByRole, capabilitiesByRole, isLoading,
    createRole, renameRole, deleteRole, setModuleGrant, setCapabilityGrant,
  }
}
