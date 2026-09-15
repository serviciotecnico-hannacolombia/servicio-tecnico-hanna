// Stepper navegable de las 4 etapas — mismo componente/estilo que el
// Stepper de Calibraciones (OrdenCalibracionDetailPage.tsx): pasos ya
// completados con check, el actual resaltado, y se puede hacer clic en
// cualquier paso ya alcanzado para verlo en modo solo lectura.
import { Fragment } from 'react'
import { ESTADO_LABEL_SF } from './hooks/useEquiposSinFormato'
import type { EstadoEquipoSinFormato } from '../../types'

export const FLUJO_SF: { key: EstadoEquipoSinFormato }[] = [
  { key: 'recibido' }, { key: 'pendiente' }, { key: 'preingresado' }, { key: 'ingresado' },
]

export function StepperSF({ estado, idxActual, idxMostrado, onSeleccionar }: {
  estado: EstadoEquipoSinFormato
  idxActual: number
  idxMostrado: number
  onSeleccionar: (idx: number | null) => void
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '0 4px' }}>
        {FLUJO_SF.map((s, i) => {
          const navegable = i <= idxActual
          const esMostrado = i === idxMostrado
          return (
            <Fragment key={s.key}>
              <div
                onClick={() => navegable && onSeleccionar(i === idxActual ? null : i)}
                onMouseEnter={e => { if (navegable) (e.currentTarget as HTMLElement).style.opacity = '0.65' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto', width: 96,
                  cursor: navegable ? 'pointer' : 'default', opacity: 1, transition: 'opacity .12s',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i <= idxActual ? 'var(--accent)' : 'var(--surface2)',
                  color: i <= idxActual ? '#fff' : 'var(--muted)',
                  border: esMostrado ? '2px solid var(--text)' : `1px solid ${i <= idxActual ? 'var(--accent)' : 'var(--border)'}`,
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {i < idxActual ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 10, color: i <= idxActual ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--mono)',
                  textAlign: 'center', fontWeight: esMostrado ? 700 : 400,
                }}>
                  {i === idxActual ? ESTADO_LABEL_SF[estado] : ESTADO_LABEL_SF[s.key]}
                </span>
              </div>
              {i < FLUJO_SF.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < idxActual ? 'var(--accent)' : 'var(--border)', marginTop: 13 }} />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
