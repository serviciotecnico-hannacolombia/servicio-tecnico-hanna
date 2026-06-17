import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) throw error
      return data as Profile[]
    },
    staleTime: 60_000,
  })
}

export function useProfileByName(name: string, profiles: Profile[] | undefined) {
  return profiles?.find(p => p.full_name === name) ?? null
}
