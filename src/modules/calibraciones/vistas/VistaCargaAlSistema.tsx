// Vista dedicada para el estado "Carga al sistema" (exclusiva del flujo de
// sitio: in situ / sede Hanna Dorado): permite cargar el código de
// recepción, las fechas de calibración y los códigos de certificados que
// ese flujo nunca capturó antes (el de laboratorio ya lo hace en "Enviado"),
// antes de pasar a "Envío de certificados".
import { useState } from 'react'
import { toast } from 'sonner'
import { UploadCloud } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, fmtFecha } from '../ui'
import { sumarDias } from '../hooks/useCalibraciones'
import type { OrdenCalibracion } from '../../../types'

export function VistaCargaAlSistema({ form, puedeEditar, soloLectura, saving, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [codigoRecepcion, setCodigoRecepcion] = useState(form.codigo_recepcion || '')
  const [fechaInicio, setFechaInicio] = useState(form.certificado_fecha_inicio || '')
  const [fechaFin, setFechaFin] = useState(form.certificado_fecha_fin || '')
  const [codigosCertificados, setCodigosCertificados] = useState(form.codigos_certificados || '')
  // Guía calculada en "En calibración" a partir de la misma fecha de fin de
  // calibración con la que se entra a esta etapa — no se persiste.
  const fechaEstimadaCertificados = form.certificado_fecha_fin ? sumarDias(form.certificado_fecha_fin, 10) : null

  function confirmar() {
    if (!codigoRecepcion.trim()) { toast.error('Ingresa el código de recepción'); return }
    if (!fechaInicio) { toast.error('Ingresa la fecha de inicio de calibración'); return }
    if (!fechaFin) { toast.error('Ingresa la fecha estimada de finalización'); return }
    if (!codigosCertificados.trim()) { toast.error('Ingresa los códigos de certificados'); return }
    onAvanzar({
      estado: 'envio_certificados',
      codigo_recepcion: codigoRecepcion.trim(),
      certificado_fecha_inicio: fechaInicio,
      certificado_fecha_fin: fechaFin,
      codigos_certificados: codigosCertificados.trim(),
    })
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <UploadCloud size={16} /> {soloLectura ? 'Revisando "Carga al sistema" (solo lectura)' : 'Carga al sistema — resumen de la orden'}
      </div>

      <Seccion titulo="Resumen">
        <Grid2>
          <FG label="Fecha de control de calidad">
            <div style={{ ...INP, color: form.fecha_control_calidad ? 'var(--text)' : 'var(--muted)' }}>
              {form.fecha_control_calidad ? fmtFecha(form.fecha_control_calidad) : '—'}
            </div>
          </FG>
          <FG label="Notas de control de calidad">
            <div style={{ ...INP, color: form.notas_control_calidad ? 'var(--text)' : 'var(--muted)' }}>{form.notas_control_calidad || '—'}</div>
          </FG>
          <FG label="Fecha estimada de certificados In Situ (guía, +10 días)">
            <div style={{ ...INP, color: fechaEstimadaCertificados ? 'var(--text)' : 'var(--muted)' }}>
              {fechaEstimadaCertificados ? fmtFecha(fechaEstimadaCertificados) : '—'}
            </div>
          </FG>
        </Grid2>
      </Seccion>

      <Seccion titulo="Carga al sistema">
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
              value={soloLectura ? (form.certificado_fecha_fin || '') : fechaFin}
              onChange={e => setFechaFin(e.target.value)}
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
          <button onClick={confirmar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Envío de certificados →'}</button>
        </div>
      )}
    </div>
  )
}
