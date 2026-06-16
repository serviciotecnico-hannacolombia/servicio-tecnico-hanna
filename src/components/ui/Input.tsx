import type { CSSProperties, InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: ReactNode
  wrapStyle?: CSSProperties
}

export function Input({ label, icon, style, wrapStyle, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...wrapStyle }}>
      {label && (
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            display: 'flex',
            pointerEvents: 'none',
          }}>
            {icon}
          </span>
        )}
        <input
          style={{
            width: '100%',
            padding: icon ? '8px 12px 8px 36px' : '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontFamily: 'var(--sans)',
            fontSize: '0.875rem',
            ...style,
          }}
          {...props}
        />
      </div>
    </div>
  )
}
