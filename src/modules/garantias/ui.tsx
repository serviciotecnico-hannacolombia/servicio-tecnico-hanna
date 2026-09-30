// Estilos compartidos del módulo Garantías — reutiliza el molde de Equipos
// Sin Formato y los badges de semáforo de Calibraciones.
import { AlertTriangle, CalendarCheck } from 'lucide-react'
import { B_VENCIDA, B_PROXIMA, B_INFO } from '../calibraciones/ui'
import { fechaObjetivoGarantia, semaforoGarantia, fmtFecha, linkPnc } from './hooks/useGarantias'
import type { Garantia } from '../../types'

export { FG, INP, PRI, GHOST, EMPTY } from '../equipos-sin-formato/ui'
export { B_ESTADO_GAR, CARD_TITULO } from './estilos'

export function BannerEstado({ icon, children, tono = 'accent' }: { icon: React.ReactNode, children: React.ReactNode, tono?: 'accent' | 'green' | 'yellow' }) {
  const colores = {
    accent: { background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)' },
    green: { background: 'var(--green-bg, #dcfce7)', border: '1px solid var(--green-border, #86efac)', color: 'var(--green, #16a34a)' },
    yellow: { background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)' },
  }[tono]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)', marginBottom: 20, fontSize: 13, fontWeight: 600, ...colores }}>
      {icon} <span>{children}</span>
    </div>
  )
}

// Número de PNC como enlace a la intranet (mismo estilo que los OTST).
export function LinkPNC({ numero }: { numero: string | null }) {
  const url = linkPnc(numero)
  if (!url) return <strong>—</strong>
  return <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontWeight: 700, color: 'var(--accent)' }}>{numero}</a>
}

// Badge del semáforo: vencida / próxima (≤2 días) / al día, con la fecha objetivo.
export function SemaforoGarantia({ garantia }: { garantia: Pick<Garantia, 'estado' | 'fecha_seguimiento' | 'fecha_limite_entrega' | 'anulada'> }) {
  const nivel = semaforoGarantia(garantia)
  const objetivo = fechaObjetivoGarantia(garantia)
  if (!nivel || !objetivo) return <span style={{ color: 'var(--muted)' }}>—</span>
  const etiqueta = garantia.estado === 'nv' || garantia.estado === 'importacion' ? 'Seguimiento' : 'Entrega'
  const estilo = nivel === 'vencida' ? B_VENCIDA : nivel === 'proxima' ? B_PROXIMA : B_INFO
  return (
    <span style={estilo} title={`${etiqueta}: ${fmtFecha(objetivo)}`}>
      {nivel === 'ok'
        ? <CalendarCheck size={11} style={{ marginRight: 4 }} />
        : <AlertTriangle size={11} style={{ marginRight: 4 }} />}
      {etiqueta} {fmtFecha(objetivo)}
    </span>
  )
}
