interface ChipProps {
  label: string
  count?: number
  active?: boolean
  onClick: () => void
}

export function Chip({ label, count, active, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 14px',
        borderRadius: '999px',
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? 'var(--accent)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--muted)',
        fontSize: '0.8rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all .15s',
        fontFamily: 'var(--sans)',
        lineHeight: 1,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.22)' : 'var(--surface2)',
          color: active ? '#fff' : 'var(--muted)',
          borderRadius: '999px',
          padding: '1px 7px',
          fontSize: '0.7rem',
          fontWeight: 700,
        }}>
          {count}
        </span>
      )}
    </button>
  )
}
