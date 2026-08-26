// Vista dedicada para el estado "En calibración" (flujo de sitio: in situ /
// sede Hanna Dorado): muestra el mismo resumen que "Visita programada" y
// solo pide la fecha de fin de calibración antes de pasar a "Control de
// calidad" — con un cálculo de guía (+10 días) para la fecha estimada de
// entrega de certificados in situ.
import { useState } from 'react'
import { toast } from 'sonner'
import { FlaskConical } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, fmtFecha } from '../ui'
import { MODALIDAD_LABEL, sumarDias } from '../hooks/useCalibraciones'
import { linkOtst, parseOtstCodes } from './CamposCompartidos'
import type { OrdenCalibracion } from '../../../types'

export function VistaEnCalibracionSitio({ form, puedeEditar, soloLectura, saving, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [fechaFin, setFechaFin] = useState(form.certificado_fecha_fin || '')
  const otstCodigos = parseOtstCodes(form.otst)
  const fechaFinMostrada = soloLectura ? (form.certificado_fecha_fin || '') : fechaFin
  const fechaEstimadaCertificados = fechaFinMostrada ? sumarDias(fechaFinMostrada, 10) : null

  function confirmar() {
    if (!fechaFin) { toast.error('Ingresa la fecha de fin de la calibración'); return }
    onAvanzar({ estado: 'control_calidad', certificado_fecha_fin: fechaFin })
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
        <FlaskConical size={16} /> {soloLectura ? 'Revisando "En calibración" (solo lectura)' : 'Equipo en calibración — resumen de la orden'}
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
          <FG label="Llegada del metrólogo(a)">
            <div style={{ ...INP, color: form.fecha_llegada_metrologo ? 'var(--text)' : 'var(--muted)' }}>
              {form.fecha_llegada_metrologo ? fmtFecha(form.fecha_llegada_metrologo) : '—'}
            </div>
          </FG>
        </Grid2>
      </Seccion>

      <Seccion titulo="Calibración">
        <Grid2>
          <FG label="Fecha de fin de la calibración" required>
            <input
              type="date"
              value={fechaFinMostrada}
              onChange={e => setFechaFin(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </Grid2>
        {fechaEstimadaCertificados && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            Fecha estimada de certificados In Situ (guía, +10 días): <strong style={{ color: 'var(--text)' }}>{fmtFecha(fechaEstimadaCertificados)}</strong>
          </div>
        )}
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Control de calidad →'}</button>
        </div>
      )}
    </div>
  )
}
