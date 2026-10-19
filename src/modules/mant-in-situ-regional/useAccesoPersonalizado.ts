import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../hooks/useUser'
import { esRolServicioTecnico } from './personalizado'

export function useAccesoPersonalizado() {
  const { profile, hasModule } = useUser()
  const { data } = useQuery({
    queryKey: ['regional-rol-personalizado', profile?.id, profile?.role_id],
    enabled: !!profile?.activo && !!profile?.role_id && hasModule('mant_in_situ_regional'),
    queryFn: async () => {
      const { data, error } = await supabase.from('roles').select('name').eq('id', profile!.role_id!).single()
      if (error) throw error
      return data.name as string
    },
  })
  return !!profile?.activo && hasModule('mant_in_situ_regional') && esRolServicioTecnico(data)
}
