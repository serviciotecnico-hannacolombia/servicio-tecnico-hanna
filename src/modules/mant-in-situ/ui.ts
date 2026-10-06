// Estilos del módulo Mant. In Situ — los de la app (molde de Equipos Sin
// Formato), no los del HTML original.
export { FG, INP, PRI, GHOST, EMPTY } from '../equipos-sin-formato/ui'

export const TITULO_CARD: React.CSSProperties = { fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }

export const PASO: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, flexShrink: 0,
}

export const B_CHIP: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontFamily: 'var(--mono)',
  fontSize: 10.5, fontWeight: 600, background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)',
}

export const B_ALERTA: React.CSSProperties = { ...B_CHIP, background: 'var(--yellow-bg)', color: 'var(--yellow)', border: '1px solid var(--yellow-border)' }
