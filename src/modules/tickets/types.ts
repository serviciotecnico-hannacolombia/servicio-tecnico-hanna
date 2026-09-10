export type TicketOrigen = 'control_calidad' | 'orden_trabajo'

export type TicketEstado =
  | 'exportacion_garantia' | 'consulta_resuelta' | 'pendiente_feedback'
  | 'exportacion' | 'denegada_garantia' | 'en_espera' | 'cambio_garantia'

export interface TicketFabrica {
  id?: string
  numero?: number
  nombre: string
  creado_por?: string | null
  codigo?: string
  serial?: string
  equipo_nombre?: string
  origen?: TicketOrigen | null
  estado?: TicketEstado | null
  nota_estado?: string

  // Trazabilidad equipo madre/hijo: un electrodo o sonda (equipo hijo) que
  // falla se reporta con sus propios código/serial, pero sin el equipo
  // madre al que pertenecía se pierde el rastro de qué equipo completo
  // quedó afectado.
  es_equipo_hijo?: boolean
  equipo_madre_codigo?: string
  equipo_madre_serial?: string
  equipo_madre_nombre?: string

  created_at?: string
}

export const ORIGEN_LABEL: Record<TicketOrigen, string> = {
  control_calidad: 'Control de Calidad',
  orden_trabajo: 'Orden de Trabajo',
}

export const ORIGEN_COLOR: Record<TicketOrigen, { bg: string; text: string; border: string }> = {
  control_calidad: { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
  orden_trabajo: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
}

export const ESTADO_LABEL: Record<TicketEstado, string> = {
  exportacion_garantia: 'Exportación/garantía',
  consulta_resuelta: 'Consulta resuelta',
  pendiente_feedback: 'Pendiente feedback',
  exportacion: 'Exportación',
  denegada_garantia: 'Denegada garantía',
  en_espera: 'En espera',
  cambio_garantia: 'Cambio garantía',
}

export const ESTADO_COLOR: Record<TicketEstado, { bg: string; text: string; border: string }> = {
  exportacion_garantia: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  consulta_resuelta: { bg: '#f2ecff', text: '#7c3aed', border: '#c4b5fd' },
  pendiente_feedback: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  exportacion: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  denegada_garantia: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  en_espera: { bg: '#fffbeb', text: '#b45309', border: '#fcd34d' },
  cambio_garantia: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
}

// Ejemplo contextual del cuadro de texto "Detalle del estado" — cada estado
// suele traer una acción o justificación distinta de fábrica, así que el
// placeholder guía qué información dejar según el caso.
export const ESTADO_NOTA_PLACEHOLDER: Record<TicketEstado, string> = {
  exportacion_garantia: 'Ej: Equipo aprobado para exportación por garantía, a la espera de guía de envío',
  consulta_resuelta: 'Ej: Fábrica enviará equipo o sonda ya que se encuentra en garantía',
  pendiente_feedback: 'Ej: Fábrica solicitó probar la sonda en pH 7 por 3 días y comentar los resultados obtenidos',
  exportacion: 'Ej: Se exporta el equipo a fábrica para revisión, sin cubrir garantía',
  denegada_garantia: 'Ej: Fábrica denegó la garantía por mal uso, se informa al cliente',
  en_espera: 'Ej: A la espera de respuesta de fábrica, sin novedades aún',
  cambio_garantia: 'Ej: Fábrica autorizó cambio del equipo/sonda por garantía',
}
