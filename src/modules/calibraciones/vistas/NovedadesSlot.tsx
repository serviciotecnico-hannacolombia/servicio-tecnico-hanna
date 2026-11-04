// Hueco donde cada vista de etapa muestra las novedades abiertas de la orden:
// debajo de su "Resumen" y antes de los campos para pasar al siguiente
// estado. OrdenCalibracionDetailPage provee el contenido (NovedadesActivas).
import { createContext, useContext, type ReactNode } from 'react'

const NovedadesContext = createContext<ReactNode>(null)

export function NovedadesProvider({ contenido, children }: { contenido: ReactNode, children: ReactNode }) {
  return <NovedadesContext.Provider value={contenido}>{children}</NovedadesContext.Provider>
}

export function NovedadesSlot() {
  return <>{useContext(NovedadesContext)}</>
}
