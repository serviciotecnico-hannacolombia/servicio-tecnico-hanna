import { usePermisosInSitu } from '../gestion-mantenimientos/usePermisosInSitu'
import { useUser } from '../../hooks/useUser'
import { puedeUsarPersonalizado } from './accesoPersonalizado'

export function useAccesoPersonalizado() {
  const { data, isError } = usePermisosInSitu()
  const { profile, hasModule } = useUser()
  return puedeUsarPersonalizado(!!profile?.activo, hasModule('mant_in_situ_regional'), !isError && data?.personalizado_regional === true)
}
