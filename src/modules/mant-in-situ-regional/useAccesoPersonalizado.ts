import { useUser } from '../../hooks/useUser'
import { puedeUsarPersonalizado } from './accesoPersonalizado'

export function useAccesoPersonalizado() {
  const { profile, hasModule, hasCapability } = useUser()
  return puedeUsarPersonalizado(!!profile?.activo, hasModule('mant_in_situ_regional'), hasCapability('mant_in_situ_personalizado'))
}
