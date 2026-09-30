// Constantes de estilo del módulo Garantías (separadas de ui.tsx para no romper Fast Refresh).
import type { EstadoGarantia } from '../../types'

export const B_ESTADO_GAR: Record<EstadoGarantia, React.CSSProperties> = {
  pnc_pendiente: { background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)' },
  nv: { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)' },
  importacion: { background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)' },
  informe: { background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)' },
  finalizada: { background: 'var(--green-bg, #dcfce7)', border: '1px solid var(--green-border, #86efac)', color: 'var(--green, #16a34a)' },
}

export const CARD_TITULO: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 14 }
