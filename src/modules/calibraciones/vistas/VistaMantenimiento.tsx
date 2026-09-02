// Vista dedicada para el estado "En mantenimiento y reparación": muestra un
// resumen de solo lectura (Cliente, Correo asesor(a), OTST, RMV/FV y la
// fecha estimada de salida ya registrada) y solo pide la fecha real de
// salida de mantenimiento y una nota opcional antes de continuar.
import { useState } from 'react'
import { toast } from 'sonner'
import { Wrench } from 'lucide-react'
import { FG, Seccion, Grid2, INP, PRI, fmtFecha } from '../ui'
import { linkOtst, parseOtstCodes } from './CamposCompartidos'
import type { Asesor, OrdenCalibracion } from '../../../types'

export function VistaMantenimiento({ form, asesorSeleccionado, puedeEditar, soloLectura, saving, onTerminar }: {
  form: Partial<OrdenCalibracion>
  asesorSeleccionado: Asesor | undefined
  puedeEditar: boolean
  soloLectura: boolean
  saving: boolean
  onTerminar: (overrides: Partial<OrdenCalibracion>) => void
}) {
  const [fechaSalidaReal, setFechaSalidaReal] = useState(form.fecha_salida_mantenimiento_real || '')
  const [nota, setNota] = useState(form.nota_mantenimiento || '')
  const otstCodigos = parseOtstCodes(form.otst)

  function confirmar() {
    if (!fechaSalidaReal) { toast.error('Ingresa la fecha de salida de mantenimiento'); return }
    onTerminar({ fecha_salida_mantenimiento_real: fechaSalidaReal, nota_mantenimiento: nota.trim() || null })
  }

  function copiarRmvFv() {
    if (!form.rmv_fv) return
    navigator.clipboard.writeText(form.rmv_fv).then(() => toast.success('RMV/FV copiado al portapapeles'))
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 'var(--radius)',
        background: 'var(--yellow-bg)', border: '1px solid var(--yellow-border)', color: 'var(--yellow)',
        marginBottom: 24, fontSize: 13, fontWeight: 600,
      }}>
        <Wrench size={16} /> {soloLectura ? 'Revisando "En mantenimiento y reparación" (solo lectura)' : 'Equipo en mantenimiento y reparación — resumen de la orden'}
      </div>

      <Seccion titulo="Resumen">
        <Grid2>
          <FG label="Cliente">
            <div style={{ ...INP, color: form.cliente ? 'var(--text)' : 'var(--muted)' }}>{form.cliente || '—'}</div>
          </FG>
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
          <FG label="Fecha estimada de salida de mantenimiento">
            <div style={{ ...INP, color: form.fecha_salida_mantenimiento ? 'var(--text)' : 'var(--muted)' }}>
              {form.fecha_salida_mantenimiento ? fmtFecha(form.fecha_salida_mantenimiento) : '—'}
            </div>
          </FG>
        </Grid2>
      </Seccion>

      <Seccion titulo="Mantenimiento">
        <Grid2>
          <FG label="Fecha de salida de mantenimiento" required>
            <input
              type="date"
              value={soloLectura ? (form.fecha_salida_mantenimiento_real || '') : fechaSalidaReal}
              onChange={e => setFechaSalidaReal(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
          <FG label="Notas (opcional)">
            <input
              value={soloLectura ? (form.nota_mantenimiento || '') : nota}
              onChange={e => setNota(e.target.value)}
              disabled={soloLectura || !puedeEditar}
              style={INP}
            />
          </FG>
        </Grid2>
      </Seccion>

      {puedeEditar && !soloLectura && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={confirmar} disabled={saving} style={PRI}>{saving ? 'Guardando…' : '✓ Mantenimiento terminado →'}</button>
        </div>
      )}
    </div>
  )
}
