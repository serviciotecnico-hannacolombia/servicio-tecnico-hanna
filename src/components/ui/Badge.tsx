import type { EstadoLlamada } from '../../types'

interface BadgeConfig {
  bg: string
  color: string
  border: string
  label: string
}

const CONFIG: Record<string, BadgeConfig> = {
  CIERRE:           { bg: 'var(--purple-bg)',  color: 'var(--purple)', border: 'var(--purple)',        label: 'CIERRE' },
  CONTACTADO:       { bg: 'var(--green-bg)',   color: 'var(--green)',  border: 'var(--green-border)',  label: 'CONTACTADO' },
  'SIN CONTACTO':   { bg: 'var(--yellow-bg)',  color: 'var(--yellow)', border: 'var(--yellow-border)', label: 'SIN CONTACTO' },
  'NO LLAMADO':     { bg: 'var(--red-bg)',     color: 'var(--red)',    border: 'var(--red-border)',    label: 'NO LLAMADO' },
  '':               { bg: 'var(--surface2)',   color: 'var(--muted)',  border: 'var(--border)',        label: '—' },
}

interface BadgeProps {
  estado: EstadoLlamada
}

export function Badge({ estado }: BadgeProps) {
  const cfg = CONFIG[estado] ?? CONFIG['']
  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: 'var(--radius-sm)',
      padding: '2px 10px',
      fontSize: '0.72rem',
      fontWeight: 600,
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>
      {cfg.label}
    </span>
  )
}
