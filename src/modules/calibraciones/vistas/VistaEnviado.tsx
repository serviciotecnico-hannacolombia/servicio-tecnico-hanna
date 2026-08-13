// Vista dedicada para el estado "Enviado": resume lo que ya se definió antes
// (cantidad de equipos, proveedor, servicios RV CALIBR, OTST, RMV/FV) y pide
// los datos propios de esta transición — código de recepción, códigos de
// certificados y las fechas de calibración — antes de pasar a "En calibración".
import { useState } from 'react'
import { toast } from 'sonner'
import { PackageCheck } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, B_INFO } from '../ui'
import { linkOtst, parseOtstCodes } from './CamposCompartidos'
import { semaforoOrden, descripcionSemaforo } from '../hooks/useCalibraciones'
import type { OrdenCalibracion, RvCalibrItem } from '../../../types'

export function VistaEnviado({ form, catalogo, codigosSel, puedeEditar, soloLectura, saving, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  catalogo: RvCalibrItem[]
  codigosSel: Set<string>
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [codigoRecepcion, setCodigoRecepcion] = useState(form.codigo_recepcion || '')
  const [codigosCertificados, setCodigosCertificados] = useState(form.codigos_certificados || '')
  const [fechaInicio, setFechaInicio] = useState(form.certificado_fecha_inicio || '')
  const [fechaFinEstimada, setFechaFinEstimada] = useState(form.certificado_fecha_fin || '')
  const otstCodigos = parseOtstCodes(form.otst)
  const serviciosSeleccionados = catalogo.filter(c => codigosSel.has(c.codigo))

  // El transporte (normalmente TCC) tiene un SLA propio de 3 días hábiles
  // medido desde fecha_envio, independiente de la fecha de calibración
  // (que todavía no existe mientras el equipo está en tránsito).
  const semaforoInfo = form.estado === 'enviado' && form.estado_desde ? {
    estado: form.estado,
    certificado_fecha_fin: form.certificado_fecha_fin ?? null,
    fecha_programada_envio: form.fecha_programada_envio ?? null,
    fecha_envio: form.fecha_envio ?? null,
    estado_desde: form.estado_desde,
  } : null
  const nivelTransporte = semaforoInfo ? semaforoOrden(semaforoInfo) : 'ok'
  const colorTransporte = nivelTransporte === 'vencida' ? 'var(--red)' : nivelTransporte === 'proxima' ? 'var(--yellow)' : 'var(--text)'

  function confirmar() {
    if (!codigoRecepcion.trim()) { toast.error('Ingresa el código de recepción'); return }
    if (!fechaInicio) { toast.error('Ingresa la fecha de inicio de calibración'); return }
    if (!fechaFinEstimada) { toast.error('Ingresa la fecha estimada de finalización'); return }
    if (!codigosCertificados.trim()) { toast.error('Ingresa los códigos de certificados'); return }
    onAvanzar({
      estado: 'en_calibracion',
      codigo_recepcion: codigoRecepcion.trim(),
      codigos_certificados: codigosCertificados.trim(),
      certificado_fecha_inicio: fechaInicio,
      certificado_fecha_fin: fechaFinEstimada,
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
        <PackageCheck size={16} /> {soloLectura ? 'Revisando "Enviado" (solo lectura)' : 'Equipo enviado al proveedor — resumen de la orden'}
      </div>

      <Seccion titulo="Resumen">
        <Grid2>
          <FG label="Cantidad de equipos">
            <div style={{ ...INP, color: form.cantidad_equipos ? 'var(--text)' : 'var(--muted)' }}>{form.cantidad_equipos ?? '—'}</div>
          </FG>
          <FG label="Proveedor (laboratorio)">
            <div style={{ ...INP, color: form.proveedor ? 'var(--text)' : 'var(--muted)' }}>{form.proveedor || '—'}</div>
          </FG>
          <FG label="Transporte (SLA 3 días hábiles)">
            <div style={{ ...INP, color: colorTransporte, fontWeight: nivelTransporte === 'ok' ? 400 : 700 }}>
              {semaforoInfo ? descripcionSemaforo(semaforoInfo) : '—'}
            </div>
          </FG>
          <FG label="RMV/FV">
            {form.rmv_fv ? (
              <div
                onClick={copiarRmvFv} title="Clic para copiar"
                style={{ ...INP, cursor: 'copy' }}
              >
                {form.rmv_fv}
              </div>
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
        <div style={{ marginTop: 14 }}>
          <FG label="Nota de envío">
            <div style={{ ...INP, color: form.nota_envio ? 'var(--text)' : 'var(--muted)' }}>
              {form.nota_envio || 'Sin nota de envío'}
            </div>
          </FG>
        </div>
      </Seccion>

      <Seccion titulo="Recepción y calibración">
        <Grid2>
          <FG label="Código de recepción" required>
            <input
              value={soloLectura ? (form.codigo_recepcion || '') : codigoRecepcion}
              onChange={e => setCodigoRecepcion(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
          <FG label="Fecha inicio de calibración" required>
            <input
              type="date"
              value={soloLectura ? (form.certificado_fecha_inicio || '') : fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
          <FG label="Fecha estimada de finalización" required>
            <input
              type="date"
              value={soloLectura ? (form.certificado_fecha_fin || '') : fechaFinEstimada}
              onChange={e => setFechaFinEstimada(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </Grid2>
        <div style={{ marginTop: 14 }}>
          <FG label="Códigos de certificados" required>
            <input
              value={soloLectura ? (form.codigos_certificados || '') : codigosCertificados}
              onChange={e => setCodigosCertificados(e.target.value)}
              placeholder="Separa varios códigos con coma: CERT-001, CERT-002"
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </div>
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ En calibración →'}</button>
        </div>
      )}
    </div>
  )
}
