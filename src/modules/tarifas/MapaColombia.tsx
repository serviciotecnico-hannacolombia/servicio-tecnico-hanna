// Mapa de Colombia por departamentos: ilumina el departamento de la ciudad
// seleccionada y marca la ciudad con un punto que pulsa. El mapa es un JSON
// estático (scripts/preparar-mapa-colombia.mjs) que se carga solo en esta
// página; si una ciudad no se reconoce, se ilumina solo el departamento.
import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { ubicarEnMapa, type MapaColombiaData } from './mapaNombres'
import type { TarifaEnvio } from '../../types'

const CSS = `
@keyframes mapa-pulso { 0% { r: 3; opacity: .7 } 100% { r: 14; opacity: 0 } }
.mapa-pulso { animation: mapa-pulso 1.6s ease-out infinite; transform-box: fill-box }
.mapa-depto { transition: fill .35s ease, stroke .35s ease }
`

export function MapaColombia({ ciudad }: { ciudad: TarifaEnvio | null }) {
  const [mapa, setMapa] = useState<MapaColombiaData | null>(null)

  useEffect(() => {
    let vivo = true
    import('./mapaColombia.json').then(m => { if (vivo) setMapa(m.default as MapaColombiaData) })
    return () => { vivo = false }
  }, [])

  const ubicacion = mapa && ciudad ? ubicarEnMapa(mapa, ciudad.departamento, ciudad.ciudad) : null
  const depSel = ubicacion?.departamento?.cod
  const punto = ubicacion?.municipio
  const r = mapa?.recuadroSai

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      padding: 20, boxShadow: 'var(--shadow)', position: 'sticky', top: 20,
    }}>
      <style>{CSS}</style>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: '0.68rem', textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        Ubicación
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {!mapa ? (
        <div style={{ aspectRatio: '500 / 680', borderRadius: 8, background: 'var(--surface2)' }} />
      ) : (
        <svg viewBox={mapa.viewBox} role="img" aria-label={ciudad ? `Mapa de Colombia: ${ciudad.ciudad}` : 'Mapa de Colombia'}
          style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '70vh' }}>
          {r && (
            <rect x={r.x - 3} y={r.y - 3} width={r.w + 6} height={r.h + 6} rx={4}
              fill="none" stroke="var(--border)" strokeDasharray="3 3" />
          )}
          {mapa.departamentos.map(d => {
            const activo = d.cod === depSel
            return (
              <path key={d.cod} d={d.d} className="mapa-depto"
                fill={activo ? 'var(--accent)' : 'var(--surface2)'}
                fillOpacity={activo ? 0.85 : 1}
                stroke={activo ? 'var(--accent)' : 'var(--border)'}
                strokeWidth={activo ? 1.2 : 0.7} strokeLinejoin="round">
                <title>{d.nombre}</title>
              </path>
            )
          })}
          {/* El departamento activo se redibuja encima para que su borde no quede tapado */}
          {depSel && mapa.departamentos.filter(d => d.cod === depSel).map(d => (
            <path key="activo" d={d.d} fill="none" stroke="var(--accent)" strokeWidth={1.4} strokeLinejoin="round" />
          ))}
          {punto && (
            <g key={`${punto.c}-${punto.n}`}>
              <circle cx={punto.x} cy={punto.y} r={3} fill="#f59e0b" className="mapa-pulso" />
              <circle cx={punto.x} cy={punto.y} r={4} fill="#f59e0b" stroke="#fff" strokeWidth={1.5} />
            </g>
          )}
        </svg>
      )}

      <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, minHeight: 20 }}>
        {ciudad ? (
          <>
            <MapPin size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span>
              <strong style={{ color: 'var(--text)' }}>{ciudad.ciudad}</strong>
              {ubicacion?.departamento && <> · {ubicacion.departamento.nombre}</>}
              {mapa && !punto && <> · <em>ubicación exacta no disponible</em></>}
            </span>
          </>
        ) : (
          <span>Busca una ciudad para verla en el mapa.</span>
        )}
      </div>
    </div>
  )
}
