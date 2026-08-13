// Vista dedicada para el estado "Control de calidad": muestra el correo del
// asesor(a) con su nombre y plataforma, las OTST y el RMV/FV, y solo pide la
// fecha de control de calidad (obligatoria) y una nota opcional antes de
// cerrar la orden como "Terminado".
import { useState } from 'react'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI } from '../ui'
import { linkOtst, parseOtstCodes } from './CamposCompartidos'
import { semaforoOrden, descripcionSemaforo } from '../hooks/useCalibraciones'
import type { Asesor, OrdenCalibracion } from '../../../types'

export function VistaControlCalidad({ form, asesorSeleccionado, puedeEditar, soloLectura, saving, onAvanzar }: {
  form: Partial<OrdenCalibracion>
  asesorSeleccionado: Asesor | undefined
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onAvanzar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [fechaControlCalidad, setFechaControlCalidad] = useState(form.fecha_control_calidad || '')
  const [notas, setNotas] = useState(form.notas_control_calidad || '')
  const otstCodigos = parseOtstCodes(form.otst)

  // Control de calidad tiene un SLA propio de 1 día hábil completo desde que
  // el equipo llegó a Hanna — mucho más corto que el plazo general
  // (certificado_fecha_fin), que sigue vigente como límite de todo el servicio.
  const semaforoInfo = form.estado === 'control_calidad' && form.estado_desde ? {
    estado: form.estado,
    certificado_fecha_fin: form.certificado_fecha_fin ?? null,
    fecha_programada_envio: form.fecha_programada_envio ?? null,
    fecha_envio: form.fecha_envio ?? null,
    fecha_retorno: form.fecha_retorno ?? null,
    fecha_llegada_hanna: form.fecha_llegada_hanna ?? null,
    estado_desde: form.estado_desde,
  } : null
  const nivelPlazo = semaforoInfo ? semaforoOrden(semaforoInfo) : 'ok'
  const colorPlazo = nivelPlazo === 'vencida' ? 'var(--red)' : nivelPlazo === 'proxima' ? 'var(--yellow)' : 'var(--text)'

  // El flujo de laboratorio pasa directo a "Envío de certificados" — ya
  // capturó código de recepción y fechas de calibración en "Enviado". El
  // flujo de sitio nunca los capturó, así que pasa antes por "Carga al
  // sistema" para hacerlo.
  const siguienteEstado = form.modalidad === 'laboratorio_externo' ? 'envio_certificados' : 'carga_al_sistema'
  const siguienteLabel = form.modalidad === 'laboratorio_externo' ? 'Envío de certificados' : 'Carga al sistema'

  function confirmar() {
    if (!fechaControlCalidad) { toast.error('Ingresa la fecha de control de calidad'); return }
    onAvanzar({ estado: siguienteEstado, fecha_control_calidad: fechaControlCalidad, notas_control_calidad: notas.trim() || null })
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
        <ShieldCheck size={16} /> {soloLectura ? 'Revisando "Control de calidad" (solo lectura)' : 'Control de calidad — resumen de la orden'}
      </div>

      <Seccion titulo="Resumen">
        <Grid2>
          <FG label="Correo asesor(a)">
            <div style={{ ...INP, color: form.correo_asesor ? 'var(--text)' : 'var(--muted)' }}>{form.correo_asesor || '—'}</div>
            {asesorSeleccionado && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                {asesorSeleccionado.nombre}{asesorSeleccionado.plataforma ? ` — ${asesorSeleccionado.plataforma}` : ''}
              </div>
            )}
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
          <FG label="Plazo (SLA 1 día hábil desde la llegada)">
            <div style={{ ...INP, color: colorPlazo, fontWeight: nivelPlazo === 'ok' ? 400 : 700 }}>
              {semaforoInfo ? descripcionSemaforo(semaforoInfo) : '—'}
            </div>
          </FG>
        </Grid2>
      </Seccion>

      <Seccion titulo="Control de calidad">
        <Grid2>
          <FG label="Fecha de control de calidad" required>
            <input
              type="date"
              value={soloLectura ? (form.fecha_control_calidad || '') : fechaControlCalidad}
              onChange={e => setFechaControlCalidad(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
          <FG label="Notas (opcional)">
            <input
              value={soloLectura ? (form.notas_control_calidad || '') : notas}
              onChange={e => setNotas(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </Grid2>
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : `✓ ${siguienteLabel} →`}</button>
        </div>
      )}
    </div>
  )
}
