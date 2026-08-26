// Vista dedicada para el estado "Visita programada" (sede Hanna Dorado /
// in situ): muestra un resumen de solo lectura (OTST, RMV/FV, Modalidad,
// Proveedor, Fecha estimada de la visita) y solo pide la fecha de llegada
// del metrólogo(a) antes de pasar a "En calibración".
import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, fmtFecha } from '../ui'
import { MODALIDAD_LABEL } from '../hooks/useCalibraciones'
import { linkOtst, parseOtstCodes } from './CamposCompartidos'
import type { OrdenCalibracion } from '../../../types'

export function VistaVisitaProgramada({ form, puedeEditar, soloLectura, saving, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [fechaLlegada, setFechaLlegada] = useState(form.fecha_llegada_metrologo || '')
  const otstCodigos = parseOtstCodes(form.otst)

  function confirmar() {
    if (!fechaLlegada) { toast.error('Ingresa la fecha de llegada del metrólogo(a)'); return }
    onAvanzar({ estado: 'en_calibracion', fecha_llegada_metrologo: fechaLlegada })
  }

  function copiarRmvFv() {
    if (!form.rmv_fv) return
    navigator.clipboard.writeText(form.rmv_fv).then(() => toast.success('RMV/FV copiado al portapapeles'))
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <CalendarClock size={16} /> {soloLectura ? 'Revisando "Visita programada" (solo lectura)' : 'Visita programada — resumen de la orden'}
      </div>

      <Seccion titulo="Resumen">
        <Grid2>
          <FG label="Modalidad">
            <div style={{ ...INP, color: form.modalidad ? 'var(--text)' : 'var(--muted)' }}>
              {form.modalidad ? MODALIDAD_LABEL[form.modalidad] : '—'}
            </div>
          </FG>
          <FG label="Proveedor (laboratorio)">
            <div style={{ ...INP, color: form.proveedor ? 'var(--text)' : 'var(--muted)' }}>{form.proveedor || '—'}</div>
          </FG>
          {form.modalidad === 'in_situ' && (
            <FG label="Lugar de ejecución">
              <div style={{ ...INP, color: form.lugar_ejecucion ? 'var(--text)' : 'var(--muted)' }}>{form.lugar_ejecucion || '—'}</div>
            </FG>
          )}
          <FG label="RMV/FV">
            {form.rmv_fv ? (
              <div onClick={copiarRmvFv} title="Clic para copiar" style={{ ...INP, cursor: 'copy' }}>{form.rmv_fv}</div>
            ) : (
              <div style={{ ...INP, color: 'var(--muted)' }}>—</div>
            )}
          </FG>
          <FG label="OTST">
            {otstCodigos.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {otstCodigos.map(codigo => (
                  <a key={codigo} href={linkOtst(codigo)!} target="_blank" rel="noopener noreferrer" style={{
                    padding: '9px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--accent)', textDecoration: 'none', fontSize: 13, fontFamily: 'var(--sans)',
                  }}>{codigo} ↗</a>
                ))}
              </div>
            ) : (
              <div style={{ ...INP, color: 'var(--muted)' }}>Sin OTST</div>
            )}
          </FG>
          <FG label="Fecha estimada de la visita">
            <div style={{ ...INP, color: form.fecha_programada_envio ? 'var(--text)' : 'var(--muted)' }}>
              {form.fecha_programada_envio ? fmtFecha(form.fecha_programada_envio) : '—'}
            </div>
          </FG>
        </Grid2>
      </Seccion>

      <Seccion titulo="Llegada del metrólogo(a)">
        <Grid2>
          <FG label="Fecha de llegada del metrólogo(a)" required>
            <input
              type="date"
              value={soloLectura ? (form.fecha_llegada_metrologo || '') : fechaLlegada}
              onChange={e => setFechaLlegada(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </Grid2>
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ En calibración →'}</button>
        </div>
      )}
    </div>
  )
}
