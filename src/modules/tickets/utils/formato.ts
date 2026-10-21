// Formatos compartidos entre la lista y el detalle de Tickets a Fábrica.

export const TICKET_ID_PREFIJO = 'TID: '

// Los tickets importados de Notion guardan el prefijo largo "Ticket ID: ";
// se acorta solo para mostrar, sin tocar el dato guardado en la base.
export const formatNombre = (nombre: string) => nombre.replace(/^Ticket ID:\s*/i, TICKET_ID_PREFIJO)

// Número del ticket sin prefijo ("TID: " o "Ticket ID: ").
export const numeroTid = (nombre: string) => nombre.replace(/^(Ticket ID|TID):\s*/i, '').trim()

export function fmtFechaCorta(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

export function fmtFechaLarga(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

export function haceCuanto(iso?: string | null): string {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d} día${d !== 1 ? 's' : ''}`
  const m = Math.floor(d / 30)
  if (m < 12) return `hace ${m} mes${m !== 1 ? 'es' : ''}`
  const a = Math.floor(m / 12)
  return `hace ${a} año${a !== 1 ? 's' : ''}`
}
