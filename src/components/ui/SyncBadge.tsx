interface SyncBadgeProps {
  status: 'ok' | 'loading' | 'error' | 'demo'
  text: string
}

const STYLES: Record<string, { bg: string; color: string; border: string }> = {
  ok:      { bg: 'var(--green-bg)',  color: 'var(--green)',  border: 'var(--green-border)'  },
  loading: { bg: 'var(--accent-bg)', color: 'var(--accent)', border: 'var(--accent)'        },
  error:   { bg: 'var(--red-bg)',    color: 'var(--red)',    border: 'var(--red-border)'    },
  demo:    { bg: 'var(--yellow-bg)', color: 'var(--yellow)', border: 'var(--yellow-border)' },
}

export function SyncBadge({ status, text }: SyncBadgeProps) {
  const s = STYLES[status]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 11px',
      borderRadius: '999px',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      fontSize: '0.72rem',
      fontWeight: 600,
      letterSpacing: '0.03em',
    }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: s.color,
        animation: status === 'loading' ? 'pulse 1.2s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }} />
      {text}
    </span>
  )
}
