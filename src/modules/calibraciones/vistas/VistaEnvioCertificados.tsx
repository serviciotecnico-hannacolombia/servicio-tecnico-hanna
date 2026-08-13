// Vista dedicada para el estado "Envío de certificados": muestra lo ya
// capturado en "Control de calidad" y pide la entrega del certificado
// (fecha, carta de entrega, carta del certificado) antes de cerrar la orden
// como "Terminado".
import { useState } from 'react'
import { toast } from 'sonner'
import { FileCheck2 } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, fmtFecha } from '../ui'
import type { OrdenCalibracion } from '../../../types'

export function VistaEnvioCertificados({ form, puedeEditar, soloLectura, saving, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [fechaEntrega, setFechaEntrega] = useState(form.fecha_entrega_certificado || '')
  const [cartaEntrega, setCartaEntrega] = useState(form.carta_entrega || '')
  const [cartaCertificado, setCartaCertificado] = useState(form.carta_certificado || '')

  function confirmar() {
    if (!fechaEntrega) { toast.error('Ingresa la fecha de entrega del certificado'); return }
    if (!cartaEntrega.trim()) { toast.error('Ingresa la carta de entrega'); return }
    if (!cartaCertificado.trim()) { toast.error('Ingresa la carta del certificado'); return }
    onAvanzar({
      estado: 'terminado',
      fecha_entrega_certificado: fechaEntrega,
      carta_entrega: cartaEntrega.trim(),
      carta_certificado: cartaCertificado.trim(),
    })
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <FileCheck2 size={16} /> {soloLectura ? 'Revisando "Envío de certificados" (solo lectura)' : 'Envío de certificados — resumen de la orden'}
      </div>

      <Seccion titulo="Resumen">
        <Grid2>
          <FG label="Correo cliente">
            <div style={{ ...INP, color: form.correo_cliente ? 'var(--text)' : 'var(--muted)' }}>{form.correo_cliente || '—'}</div>
          </FG>
          <FG label="Correo asesor(a)">
            <div style={{ ...INP, color: form.correo_asesor ? 'var(--text)' : 'var(--muted)' }}>{form.correo_asesor || '—'}</div>
          </FG>
          <FG label="Proveedor (laboratorio)">
            <div style={{ ...INP, color: form.proveedor ? 'var(--text)' : 'var(--muted)' }}>{form.proveedor || '—'}</div>
          </FG>
          <FG label="Código de recepción">
            <div style={{ ...INP, color: form.codigo_recepcion ? 'var(--text)' : 'var(--muted)' }}>{form.codigo_recepcion || '—'}</div>
          </FG>
          <FG label="Fecha inicio de calibración">
            <div style={{ ...INP, color: form.certificado_fecha_inicio ? 'var(--text)' : 'var(--muted)' }}>
              {form.certificado_fecha_inicio ? fmtFecha(form.certificado_fecha_inicio) : '—'}
            </div>
          </FG>
          <FG label="Fecha estimada de finalización">
            <div style={{ ...INP, color: form.certificado_fecha_fin ? 'var(--text)' : 'var(--muted)' }}>
              {form.certificado_fecha_fin ? fmtFecha(form.certificado_fecha_fin) : '—'}
            </div>
          </FG>
          <FG label="Fecha de llegada">
            <div style={{ ...INP, color: form.fecha_llegada_hanna ? 'var(--text)' : 'var(--muted)' }}>
              {form.fecha_llegada_hanna ? fmtFecha(form.fecha_llegada_hanna) : '—'}
            </div>
          </FG>
          <FG label="Códigos de certificados">
            <div style={{ ...INP, color: form.codigos_certificados ? 'var(--text)' : 'var(--muted)' }}>{form.codigos_certificados || '—'}</div>
          </FG>
        </Grid2>
        <div style={{ marginTop: 14 }}>
          <Grid2>
            <FG label="Fecha de control de calidad">
              <div style={{ ...INP, color: form.fecha_control_calidad ? 'var(--text)' : 'var(--muted)' }}>
                {form.fecha_control_calidad ? fmtFecha(form.fecha_control_calidad) : '—'}
              </div>
            </FG>
            <FG label="Notas de control de calidad">
              <div style={{ ...INP, color: form.notas_control_calidad ? 'var(--text)' : 'var(--muted)' }}>{form.notas_control_calidad || '—'}</div>
            </FG>
          </Grid2>
        </div>
      </Seccion>

      <Seccion titulo="Entrega del certificado">
        <Grid2>
          <FG label="Fecha de entrega del certificado" required>
            <input
              type="date"
              value={soloLectura ? (form.fecha_entrega_certificado || '') : fechaEntrega}
              onChange={e => setFechaEntrega(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
          <FG label="Carta de entrega" required>
            <input
              value={soloLectura ? (form.carta_entrega || '') : cartaEntrega}
              onChange={e => setCartaEntrega(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </Grid2>
        <div style={{ marginTop: 14 }}>
          <FG label="Carta del certificado" required>
            <input
              value={soloLectura ? (form.carta_certificado || '') : cartaCertificado}
              onChange={e => setCartaCertificado(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </div>
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Terminado →'}</button>
        </div>
      )}
    </div>
  )
}
