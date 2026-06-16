type Color = 'accent' | 'green' | 'yellow' | 'red' | 'purple'

const COLOR_MAP: Record<Color, string> = {
  accent: 'var(--accent)',
  green:  'var(--green)',
  yellow: 'var(--yellow)',
  red:    'var(--red)',
  purple: 'var(--purple)',
}

interface StatCardProps {
  value: number | string
  label: string
  sublabel?: string
  color?: Color
}

export function StatCard({ value, label, sublabel, color = 'accent' }: StatCardProps) {
  const c = COLOR_MAP[color]
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      borderLeft: `4px solid ${c}`,
      padding: '16px 20px',
      boxShadow: 'var(--shadow)',
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontSize: '1.9rem', fontWeight: 700, color: c, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        color: 'var(--muted)',
        marginTop: '5px',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontFamily: 'var(--mono)',
      }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>
          {sublabel}
        </div>
      )}
    </div>
  )
}
