import type { CSSProperties, SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  placeholder?: string
  wrapStyle?: CSSProperties
}

export function Select({ label, options, placeholder, style, wrapStyle, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...wrapStyle }}>
      {label && (
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
          {label}
        </label>
      )}
      <select
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontFamily: 'var(--sans)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          appearance: 'auto',
          ...style,
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
