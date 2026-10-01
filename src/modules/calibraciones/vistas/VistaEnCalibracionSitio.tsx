// Vista dedicada para el estado "En calibración" (flujo de sitio: in situ /
// sede Hanna Dorado): resumen de la orden (incluye cantidad de equipos y
// servicios RV CALIBR) y pide la fecha de fin de calibración, los códigos
// de calibración de referencia y el metrólogo(a) antes de pasar a "Control
// de calidad" — con un cálculo de guía (+10 días) para la fecha estimada de
// entrega de certificados in situ. El nombre del metrólogo se autocompleta
// con los ya usados en otras órdenes.
import { useState } from 'react'
import { toast } from 'sonner'
import { FlaskConical } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, B_INFO, fmtFecha } from '../ui'
import { MODALIDAD_LABEL, sumarDias } from '../hooks/useCalibraciones'
import { linkOtst, parseOtstCodes } from './CamposCompartidos'
import type { OrdenCalibracion, RvCalibrItem } from '../../../types'

export function VistaEnCalibracionSitio({ form, catalogo, codigosSel, metrologosSugeridos, puedeEditar, soloLectura, saving, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  catalogo: RvCalibrItem[]
  codigosSel: Set<string>
  metrologosSugeridos: string[]
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [fechaFin, setFechaFin] = useState(form.certificado_fecha_fin || '')
  const [codigosReferencia, setCodigosReferencia] = useState(form.codigos_referencia || '')
  const [metrologo, setMetrologo] = useState(form.nombre_metrologo || '')
  const serviciosSeleccionados = catalogo.filter(c => codigosSel.has(c.codigo))
  const otstCodigos = parseOtstCodes(form.otst)
  const fechaFinMostrada = soloLectura ? (form.certificado_fecha_fin || '') : fechaFin
  const fechaEstimadaCertificados = fechaFinMostrada ? sumarDias(fechaFinMostrada, 10) : null

  function confirmar() {
    if (!fechaFin) { toast.error('Ingresa la fecha de fin de la calibración'); return }
    if (!codigosReferencia.trim()) { toast.error('Ingresa los códigos de referencia'); return }
    if (!metrologo.trim()) { toast.error('Ingresa el nombre del metrólogo(a)'); return }
    onAvanzar({
      estado: 'control_calidad',
      certificado_fecha_fin: fechaFin,
      codigos_referencia: codigosReferencia.trim(),
      nombre_metrologo: metrologo.trim().replace(/\s+/g, ' '),
    })
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
          <FG label="Cantidad de equipos">
            <div style={{ ...INP, color: form.cantidad_equipos ? 'var(--text)' : 'var(--muted)' }}>{form.cantidad_equipos ?? '—'}</div>
          </FG>
        </Grid2>
        <div style={{ marginTop: 14 }}>
          <FG label="Servicios RV CALIBR">
            {serviciosSeleccionados.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {serviciosSeleccionados.map(c => (
                  <span key={c.codigo} title={c.descripcion} style={B_INFO}>{c.codigo} — {c.magnitud}</span>
                ))}
              </div>
            ) : (
              <div style={{ ...INP, color: 'var(--muted)' }}>Sin servicios seleccionados</div>
            )}
          </FG>
        </div>
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
          <FG label="Nombre del metrólogo(a)" required>
            <input
              list="metrologos-sugeridos"
              value={soloLectura ? (form.nombre_metrologo || '') : metrologo}
              onChange={e => setMetrologo(e.target.value)}
              placeholder="Escribe o elige uno ya registrado"
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
            <datalist id="metrologos-sugeridos">
              {metrologosSugeridos.map(n => <option key={n} value={n} />)}
            </datalist>
          </FG>
        </Grid2>
        <div style={{ marginTop: 14 }}>
          <FG label="Códigos de referencia" required>
            <input
              value={soloLectura ? (form.codigos_referencia || '') : codigosReferencia}
              onChange={e => setCodigosReferencia(e.target.value)}
              placeholder="Códigos de calibración de referencia — separa varios con coma"
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </div>
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
