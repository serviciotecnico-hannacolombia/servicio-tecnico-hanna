export type TicketOrigen = 'control_calidad' | 'orden_trabajo'

export type TicketEstado =
  | 'exportacion_garantia' | 'consulta_resuelta' | 'pendiente_feedback'
  | 'exportacion' | 'denegada_garantia' | 'en_espera' | 'cambio_garantia'
  | 'boletin_tecnico'

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
  // Detalle inicial: al crear el ticket se vuelve el primer avance de la
  // bitácora (trigger en BD). La UI ya no lo muestra ni lo edita.
  nota_estado?: string
  otst?: string | null

  // Trazabilidad equipo madre/hijo: un electrodo o sonda (equipo hijo) que
  // falla se reporta con sus propios código/serial, pero sin el equipo
  // madre al que pertenecía se pierde el rastro de qué equipo completo
  // quedó afectado.
  es_equipo_hijo?: boolean
  equipo_madre_codigo?: string
  equipo_madre_serial?: string
  equipo_madre_nombre?: string

  // Resumen del avance más reciente, mantenido por trigger — la lista lo
  // muestra sin cargar la bitácora completa de cada ticket.
  ultimo_avance?: string | null
  ultimo_avance_at?: string | null

  created_at?: string
  updated_at?: string
}

export type TicketAvanceTipo = 'avance' | 'estado' | 'otst'

export interface TicketAvance {
  id: string
  ticket_id: string
  usuario_id: string | null
  tipo: TicketAvanceTipo
  texto: string | null
  valor_anterior: string | null
  valor_nuevo: string | null
  created_at: string
}

export const ORIGEN_LABEL: Record<TicketOrigen, string> = {
  control_calidad: 'Control de Calidad',
  orden_trabajo: 'Orden de Trabajo',
}

// Versión corta para el badge de la tabla, donde el nombre completo se cortaba.
export const ORIGEN_CORTO: Record<TicketOrigen, string> = {
  control_calidad: 'Calidad',
  orden_trabajo: 'OT',
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
  boletin_tecnico: 'Boletín Técnico',
}

export const ESTADO_COLOR: Record<TicketEstado, { bg: string; text: string; border: string }> = {
  exportacion_garantia: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  consulta_resuelta: { bg: '#f2ecff', text: '#7c3aed', border: '#c4b5fd' },
  pendiente_feedback: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  exportacion: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  denegada_garantia: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' },
  en_espera: { bg: '#fffbeb', text: '#b45309', border: '#fcd34d' },
  cambio_garantia: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
  boletin_tecnico: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
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
  boletin_tecnico: 'Ej: Fábrica emitió boletín técnico informando falla conocida y procedimiento a seguir',
}
