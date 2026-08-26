// Vista dedicada para el estado "En calibración" (flujo de laboratorio
// externo): resume lo ya capturado en "Enviado" (proveedor, recepción,
// fechas del certificado) y solo pide la fecha de retorno — preseleccionada
// hoy — y la nota de retorno antes de pasar a "En retorno".
import { useState } from 'react'
import { toast } from 'sonner'
import { FlaskConical } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, fmtFecha } from '../ui'
import { hoyISO } from '../hooks/useCalibraciones'
import type { OrdenCalibracion } from '../../../types'

export function VistaEnCalibracion({ form, puedeEditar, soloLectura, saving, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [fechaRetorno, setFechaRetorno] = useState(() => form.fecha_retorno || hoyISO())
  const [notaRetorno, setNotaRetorno] = useState(form.nota_retorno || '')

  function confirmar() {
    if (!fechaRetorno) { toast.error('Ingresa la fecha de retorno'); return }
    if (!notaRetorno.trim()) { toast.error('Ingresa la nota de retorno'); return }
    onAvanzar({ estado: 'en_retorno', fecha_retorno: fechaRetorno, nota_retorno: notaRetorno.trim() })
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
        </Grid2>
        <div style={{ marginTop: 14 }}>
          <FG label="Códigos de certificados">
            <div style={{ ...INP, color: form.codigos_certificados ? 'var(--text)' : 'var(--muted)' }}>{form.codigos_certificados || '—'}</div>
          </FG>
        </div>
      </Seccion>

      <Seccion titulo="Retorno">
        <Grid2>
          <FG label="Fecha de retorno" required>
            <input
              type="date"
              value={soloLectura ? (form.fecha_retorno || '') : fechaRetorno}
              onChange={e => setFechaRetorno(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
          <FG label="Nota de retorno" required>
            <input
              value={soloLectura ? (form.nota_retorno || '') : notaRetorno}
              onChange={e => setNotaRetorno(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </Grid2>
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ En retorno →'}</button>
        </div>
      )}
    </div>
  )
}
