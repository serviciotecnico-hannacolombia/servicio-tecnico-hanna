import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  style?: CSSProperties
  bodyStyle?: CSSProperties
}

export function Card({ title, children, style, bodyStyle }: CardProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow)',
      overflow: 'hidden',
      ...style,
    }}>
      {title && (
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)',
          fontFamily: 'var(--mono)',
          fontSize: '0.68rem',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.09em',
          color: 'var(--muted)',
        }}>
          {title}
        </div>
      )}
      <div style={{ padding: '20px', ...bodyStyle }}>
        {children}
      </div>
    </div>
  )
}
