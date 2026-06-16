interface SpinnerProps {
  size?: number
  color?: string
}

export function Spinner({ size = 24, color = 'var(--accent)' }: SpinnerProps) {
  return (
    <div style={{
      width: size,
      height: size,
      border: `2px solid var(--border)`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
      flexShrink: 0,
    }} />
  )
}
