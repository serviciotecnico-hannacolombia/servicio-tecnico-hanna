import type { Garantia } from '../../../types'

export interface VistaProps {
  garantia: Garantia
  puedeEditar: boolean
  soloLectura?: boolean
  onActualizar: (overrides: Partial<Garantia>, mensaje: string) => Promise<boolean>
}
