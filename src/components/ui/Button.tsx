import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost' | 'link'
  size?: 'sm' | 'md'
  children: ReactNode
}

const VARIANTS: Record<string, CSSProperties> = {
  primary: { background: 'var(--accent)',      color: '#fff',          border: 'none' },
  danger:  { background: 'var(--red)',         color: '#fff',          border: 'none' },
  ghost:   { background: 'transparent',        color: 'var(--text)',   border: '1px solid var(--border)' },
  link:    { background: 'transparent',        color: 'var(--accent)', border: 'none', padding: '0', fontWeight: 500 },
}

export function Button({ variant = 'primary', size = 'md', style, children, ...props }: ButtonProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--sans)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity .15s, background .15s',
    padding: size === 'sm' ? '5px 12px' : '8px 18px',
    fontSize: size === 'sm' ? '0.8rem' : '0.875rem',
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
  }

  return (
    <button
      style={{ ...base, ...VARIANTS[variant], ...style }}
      onMouseEnter={e => { if (!props.disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
      {...props}
    >
      {children}
    </button>
  )
}
