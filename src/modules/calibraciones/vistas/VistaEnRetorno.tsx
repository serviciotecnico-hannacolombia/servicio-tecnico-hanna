// Vista dedicada para el estado "En retorno" (flujo de laboratorio externo):
// muestra el mismo resumen que "En calibración" y pide la carta de entrega y
// la fecha de llegada antes de pasar a "Control de calidad".
import { useState } from 'react'
import { toast } from 'sonner'
import { Truck } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, fmtFecha } from '../ui'
import { semaforoOrden, descripcionSemaforo } from '../hooks/useCalibraciones'
import type { OrdenCalibracion } from '../../../types'

export function VistaEnRetorno({ form, puedeEditar, soloLectura, saving, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [cartaEntrega, setCartaEntrega] = useState(form.carta_entrega || '')
  const [fechaLlegada, setFechaLlegada] = useState(form.fecha_llegada_hanna || '')

  // El transporte de vuelta (mismo proveedor que el envío, normalmente TCC)
  // tiene el mismo SLA de 3 días hábiles, medido desde fecha_retorno — que
  // sigue siendo distinto del plazo general (certificado_fecha_fin).
  const semaforoInfo = form.estado === 'en_retorno' && form.estado_desde ? {
    estado: form.estado,
    modalidad: form.modalidad ?? null,
    certificado_fecha_fin: form.certificado_fecha_fin ?? null,
    fecha_programada_envio: form.fecha_programada_envio ?? null,
    fecha_llegada_metrologo: form.fecha_llegada_metrologo ?? null,
    fecha_envio: form.fecha_envio ?? null,
    fecha_retorno: form.fecha_retorno ?? null,
    fecha_llegada_hanna: form.fecha_llegada_hanna ?? null,
    estado_desde: form.estado_desde,
  } : null
  const nivelTransporte = semaforoInfo ? semaforoOrden(semaforoInfo) : 'ok'
  const colorTransporte = nivelTransporte === 'vencida' ? 'var(--red)' : nivelTransporte === 'proxima' ? 'var(--yellow)' : 'var(--text)'

  function confirmar() {
    if (!cartaEntrega.trim()) { toast.error('Ingresa la carta de entrega'); return }
    if (!fechaLlegada) { toast.error('Ingresa la fecha de llegada'); return }
    onAvanzar({ estado: 'control_calidad', carta_entrega: cartaEntrega.trim(), fecha_llegada_hanna: fechaLlegada })
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <Truck size={16} /> {soloLectura ? 'Revisando "En retorno" (solo lectura)' : 'Equipo en retorno — resumen de la orden'}
      </div>

      <Seccion titulo="Resumen">
        <Grid2>
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
          <FG label="Transporte de retorno (SLA 3 días hábiles)">
            <div style={{ ...INP, color: colorTransporte, fontWeight: nivelTransporte === 'ok' ? 400 : 700 }}>
              {semaforoInfo ? descripcionSemaforo(semaforoInfo) : '—'}
            </div>
          </FG>
        </Grid2>
        <div style={{ marginTop: 14 }}>
          <FG label="Códigos de certificados">
            <div style={{ ...INP, color: form.codigos_certificados ? 'var(--text)' : 'var(--muted)' }}>{form.codigos_certificados || '—'}</div>
          </FG>
        </div>
      </Seccion>

      <Seccion titulo="Entrega">
        <Grid2>
          <FG label="Carta de entrega" required>
            <input
              value={soloLectura ? (form.carta_entrega || '') : cartaEntrega}
              onChange={e => setCartaEntrega(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
          <FG label="Fecha de llegada" required>
            <input
              type="date"
              value={soloLectura ? (form.fecha_llegada_hanna || '') : fechaLlegada}
              onChange={e => setFechaLlegada(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </Grid2>
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Control de calidad →'}</button>
        </div>
      )}
    </div>
  )
}
