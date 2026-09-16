import { useRef, useState } from 'react'

// Envuelve el ícono de Percy (el gato del favicon) y muestra un globo de
// texto tipo caricatura al pasar el mouse. Usa position:fixed calculado con
// getBoundingClientRect en vez de absolute, para que el globo no quede
// recortado por el overflow:hidden del sidebar (que lo necesita para la
// animación de colapsar el ancho).
export function PercyBubble({ src, alt, size, mensaje }: {
  src: string
  alt: string
  size: number
  mensaje: string
}) {
  const ref = useRef<HTMLImageElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const mostrar = () => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({ top: rect.bottom + 10, left: rect.left + rect.width / 2 })
  }
  const ocultar = () => setPos(null)

  return (
    <>
      <img
        ref={ref}
        src={src}
        alt={alt}
        onMouseEnter={mostrar}
        onMouseLeave={ocultar}
        style={{ height: size, width: 'auto', display: 'block', flexShrink: 0, cursor: 'default' }}
      />
      {pos && (
        <div
          role="tooltip"
          style={{
            position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '8px 14px', boxShadow: 'var(--shadow-lg)', fontSize: 12.5, fontWeight: 600,
            color: 'var(--text)', whiteSpace: 'nowrap', zIndex: 2000, pointerEvents: 'none',
            animation: 'fadeIn .15s ease',
          }}
        >
          {mensaje}
          <div style={{
            position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%) rotate(45deg)',
            width: 10, height: 10, background: 'var(--surface)',
            borderLeft: '1px solid var(--border)', borderTop: '1px solid var(--border)',
          }} />
        </div>
      )}
    </>
  )
}
