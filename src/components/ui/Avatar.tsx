interface AvatarProps {
  name: string
  emoji?: string | null
  color?: string | null
  size?: number
  ring?: boolean
  style?: React.CSSProperties
}

export function Avatar({ name, emoji, color, size = 32, ring = false, style }: AvatarProps) {
  const bg = color ?? 'linear-gradient(135deg, var(--accent), var(--accent2))'

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        boxShadow: ring ? '0 0 0 2.5px #fde68a' : undefined,
        fontSize: emoji ? size * 0.55 : undefined,
        lineHeight: 1,
        userSelect: 'none',
        transition: 'transform .1s',
        ...style,
      }}
    >
      {emoji ? (
        emoji
      ) : (
        <span style={{ fontSize: size * 0.36, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
          {(name || '?').slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  )
}
