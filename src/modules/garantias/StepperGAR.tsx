// Stepper navegable — mismo estilo que StepperSF (Equipos Sin Formato). Los
// pasos dependen de la ruta: con stock se salta NV/Importación; sin stock se
// salta "PNC pendiente" (el PNC se carga dentro de Importación).
import { Fragment } from 'react'
import type { PasoGarantia } from './hooks/useGarantias'

const LABEL_PASO: Record<PasoGarantia, string> = {
  registro: 'Registro',
  pnc_pendiente: 'PNC',
  nv: 'NV',
  importacion: 'Importación',
  informe: 'Informe',
  finalizada: 'Finalizada',
}

export function StepperGAR({ pasos, idxActual, idxMostrado, onSeleccionar }: {
  pasos: PasoGarantia[]
  idxActual: number
  idxMostrado: number
  onSeleccionar: (idx: number | null) => void
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '0 4px' }}>
        {pasos.map((paso, i) => {
          const navegable = i <= idxActual
          const esMostrado = i === idxMostrado
          const completado = i < idxActual || (paso === 'finalizada' && i === idxActual)
          return (
            <Fragment key={paso}>
              <div
                onClick={() => navegable && onSeleccionar(i === idxActual ? null : i)}
                onMouseEnter={e => { if (navegable) (e.currentTarget as HTMLElement).style.opacity = '0.65' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto', width: 96,
                  cursor: navegable ? 'pointer' : 'default', transition: 'opacity .12s',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i <= idxActual ? 'var(--accent)' : 'var(--surface2)',
                  color: i <= idxActual ? '#fff' : 'var(--muted)',
                  border: esMostrado ? '2px solid var(--text)' : `1px solid ${i <= idxActual ? 'var(--accent)' : 'var(--border)'}`,
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {completado ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 10, color: i <= idxActual ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--mono)',
                  textAlign: 'center', fontWeight: esMostrado ? 700 : 400,
                }}>
                  {paso === 'pnc_pendiente' && i === idxActual ? 'PNC pendiente' : LABEL_PASO[paso]}
                </span>
              </div>
              {i < pasos.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < idxActual ? 'var(--accent)' : 'var(--border)', marginTop: 13 }} />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
